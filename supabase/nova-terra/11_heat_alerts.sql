-- Nova Terra — 11 : alertes canicule, diffusion sectorielle et profil santé privé.
-- À exécuter après 10_knowledge_base.sql. Relançable sans risque.

create table if not exists public.citizen_health_profiles (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  blood_group text check (blood_group is null or blood_group in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  health_conditions text[] not null default '{}'
    check (health_conditions <@ array['cardiac', 'respiratory', 'diabetes', 'renal', 'mobility', 'other']::text[]),
  consent_recommendations boolean not null default false,
  updated_at timestamptz not null default now(),
  check (consent_recommendations or (blood_group is null and cardinality(health_conditions) = 0))
);
comment on table public.citizen_health_profiles is
  'classification: sensitive; owner-only, opt-in profile fields used locally for personalized safety guidance';
alter table public.citizen_health_profiles enable row level security;
revoke all on public.citizen_health_profiles from anon, authenticated;
grant select, insert, update, delete on public.citizen_health_profiles to authenticated;
drop policy if exists "citizen_health_profiles_own" on public.citizen_health_profiles;
create policy "citizen_health_profiles_own" on public.citizen_health_profiles for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()) and (select public.is_active_user()));
drop trigger if exists citizen_health_profiles_updated_at on public.citizen_health_profiles;
create trigger citizen_health_profiles_updated_at
  before update on public.citizen_health_profiles
  for each row execute function public.set_updated_at();

create or replace function public.set_my_home_sector(p_sector_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_active_user() then
    raise exception 'Un compte actif est nécessaire pour modifier son secteur de résidence.' using errcode = '42501';
  end if;
  if p_sector_id is null or not exists (
    select 1 from public.sectors s where s.id = p_sector_id and s.is_active
  ) then
    raise exception 'Choisissez un secteur actif.' using errcode = '22023';
  end if;
  update public.citizens
  set sector_id = p_sector_id
  where profile_id = (select auth.uid()) and deleted_at is null;
  if not found then
    raise exception 'Fiche citoyenne introuvable.' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.set_my_home_sector(uuid) from public, anon;
grant execute on function public.set_my_home_sector(uuid) to authenticated;

create unique index if not exists notifications_heat_alert_dedupe_idx
  on public.notifications (user_id, entity_type, entity_id)
  where entity_type = 'heat_alert';

drop function if exists public.create_heatwave_alert(text, text, uuid, uuid, uuid, text[], timestamptz);
create or replace function public.create_heatwave_alert(
  p_title text,
  p_summary text,
  p_sector_id uuid,
  p_service_id uuid,
  p_satellite_observation_id uuid,
  p_recommended_actions text[],
  p_valid_until timestamptz default null,
  p_all_sectors boolean default false
)
returns table (danger_id uuid, report_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_danger_id uuid := gen_random_uuid();
  v_report_id uuid := gen_random_uuid();
  v_observation public.satellite_observations%rowtype;
  v_x numeric;
  v_y numeric;
  v_report_sector_id uuid;
  v_affected_sector_ids uuid[];
  v_observed_at timestamptz := now();
  v_source public.report_source := 'agent';
  v_satellite_code text;
  v_assembly_building_ids uuid[];
begin
  if not public.is_active_user() or not public.is_admin() then
    raise exception 'Seuls les administrateurs actifs peuvent publier une alerte canicule.' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_title, ''))) not between 3 and 120
     or char_length(btrim(coalesce(p_summary, ''))) not between 10 and 500 then
    raise exception 'Le titre (3–120 caractères) et le résumé (10–500 caractères) sont obligatoires.' using errcode = '22023';
  end if;
  if cardinality(coalesce(p_recommended_actions, '{}')) not between 1 and 8
     or exists (select 1 from unnest(p_recommended_actions) action where char_length(btrim(action)) not between 3 and 240) then
    raise exception 'Ajoutez de 1 à 8 recommandations (3–240 caractères chacune).' using errcode = '22023';
  end if;
  if not exists (select 1 from public.services s where s.id = p_service_id and s.status = 'open') then
    raise exception 'Le service responsable est indisponible.' using errcode = '22023';
  end if;
  if p_valid_until is not null and p_valid_until <= now() then
    raise exception 'La fin de validité doit être dans le futur.' using errcode = '22023';
  end if;

  if p_all_sectors then
    if p_sector_id is not null or p_satellite_observation_id is not null then
      raise exception 'Une alerte tous secteurs doit être un constat manuel sans secteur ni observation satellite.' using errcode = '22023';
    end if;
    select array_agg(s.id order by s.code), avg(s.x), avg(s.y)
    into v_affected_sector_ids, v_x, v_y
    from public.sectors s
    where s.is_active;
    if coalesce(cardinality(v_affected_sector_ids), 0) = 0 then
      raise exception 'Aucun secteur actif pour diffuser l’alerte.' using errcode = '22023';
    end if;
    v_report_sector_id := v_affected_sector_ids[1];
  else
    if p_sector_id is null or not exists (select 1 from public.sectors s where s.id = p_sector_id and s.is_active) then
      raise exception 'Choisissez un secteur actif.' using errcode = '22023';
    end if;
    v_affected_sector_ids := array[p_sector_id];
    v_report_sector_id := p_sector_id;
  end if;

  if p_satellite_observation_id is not null then
    if p_all_sectors then
      raise exception 'Une observation satellite ne peut cibler qu’un seul secteur.' using errcode = '22023';
    end if;
    select * into v_observation
    from public.satellite_observations o
    where o.id = p_satellite_observation_id
      and o.sector_id = p_sector_id
      and o.validation_status <> 'rejected';
    if not found then
      raise exception 'Observation satellite introuvable, rejetée ou située dans un autre secteur.' using errcode = '22023';
    end if;
    v_x := v_observation.x;
    v_y := v_observation.y;
    v_observed_at := v_observation.observed_at;
    v_satellite_code := v_observation.satellite_code;
    v_source := 'satellite';
  elsif not p_all_sectors then
    select s.x, s.y into v_x, v_y from public.sectors s where s.id = p_sector_id;
  end if;

  select coalesce(array_agg(candidate.id order by candidate.distance), '{}')
  into v_assembly_building_ids
  from (
    select b.id, power(b.x - coalesce(v_x, 0), 2) + power(b.y - coalesce(v_y, 0), 2) as distance
    from public.buildings b
    where b.sector_id = any(v_affected_sector_ids)
      and b.status = 'operational'
      and b.facility_type in ('hospital', 'clinic', 'care_center')
    order by distance
    limit 3
  ) candidate;

  insert into public.reports (
    id, title, description, category, sector_id, x, y, observed_at,
    source, reporter_system, service_id, priority, status, confidence_score, facts
  ) values (
    v_report_id, btrim(p_title), btrim(p_summary), 'health', v_report_sector_id, v_x, v_y, v_observed_at,
    v_source, case when v_source = 'satellite' then v_satellite_code else 'admin-heat-alert' end,
    p_service_id, 'critical', 'received',
    case when v_source = 'satellite' then v_observation.confidence_score else null end,
    jsonb_build_object(
      'alert_type', 'heatwave',
      'affected_sector_ids', to_jsonb(v_affected_sector_ids),
      'satellite_observation_id', p_satellite_observation_id,
      'satellite_analysis', case when v_source = 'satellite' then v_observation.analysis else '{}'::jsonb end,
      'recommended_actions', to_jsonb(p_recommended_actions)
    )
  );

  insert into public.dangers (
    id, slug, title, severity, status, summary, affected_sector_ids, valid_from, valid_until,
    recommended_actions, assembly_building_ids, source, responsible_service_id,
    validated_by, validated_at, is_fictional_alert
  ) values (
    v_danger_id, 'heatwave-' || replace(v_danger_id::text, '-', ''),
    btrim(p_title), 'extreme', 'active', btrim(p_summary), v_affected_sector_ids, now(), p_valid_until,
    p_recommended_actions, v_assembly_building_ids,
    case when v_source = 'satellite' then 'satellite:' || v_satellite_code else 'admin' end,
    p_service_id, (select auth.uid()), now(), true
  );

  if p_satellite_observation_id is not null then
    update public.satellite_observations
    set validation_status = 'validated',
        validated_by = (select auth.uid()),
        validated_at = now(),
        generated_report_id = v_report_id
    where id = p_satellite_observation_id;
  end if;

  return query select v_danger_id, v_report_id;
end;
$$;
revoke all on function public.create_heatwave_alert(text, text, uuid, uuid, uuid, text[], timestamptz, boolean) from public, anon;
grant execute on function public.create_heatwave_alert(text, text, uuid, uuid, uuid, text[], timestamptz, boolean) to authenticated;

create or replace function public.dispatch_heat_alert_notifications(p_alert_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_alert public.dangers%rowtype;
  v_count integer;
begin
  select * into v_alert
  from public.dangers d
  where d.id = p_alert_id and d.status = 'active' and d.slug like 'heatwave-%';
  if not found then
    raise exception 'Alerte canicule active introuvable.' using errcode = '22023';
  end if;

  insert into public.notifications (user_id, type, title, body, href, entity_type, entity_id)
  select p.id, 'danger_alert',
         left('Alerte canicule — ' || v_alert.title, 120),
         left(v_alert.summary, 500),
         '/dangers?alerte=' || v_alert.id::text,
         'heat_alert', v_alert.id
  from public.citizens c
  join public.profiles p on p.id = c.profile_id
  where c.sector_id = any(v_alert.affected_sector_ids)
    and c.deleted_at is null
    and p.account_status = 'active'
    and p.deleted_at is null
    and case p.notification_prefs ->> 'in_app' when 'false' then false else true end
    and not exists (
      select 1 from public.notifications n
      where n.user_id = p.id and n.entity_type = 'heat_alert' and n.entity_id = v_alert.id
    )
  on conflict do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.dispatch_heat_alert_notifications(uuid) from public, anon, authenticated;
grant execute on function public.dispatch_heat_alert_notifications(uuid) to service_role;

insert into public.knowledge_base (
  id, entity_type, entity_id, title, content, url, version, is_published, content_hash
) values (
  'deaf0d00-0000-4000-8000-000000000001',
  'faq',
  'deaf0d00-0000-4000-8000-000000000002',
  'Canicule : gestes de protection et signes d''alerte',
  'Pendant une canicule, buvez régulièrement sans attendre la soif, restez dans un lieu frais et à l''ombre, limitez les sorties et les efforts aux heures chaudes, fermez volets et fenêtres le jour puis aérez la nuit si l''air extérieur est plus frais. Donnez régulièrement des nouvelles aux personnes isolées. Ne modifiez pas un traitement sans l''avis d''un professionnel de santé. En cas de confusion, malaise, perte de connaissance ou difficulté à respirer, appelez immédiatement les secours locaux.',
  '/dangers',
  1,
  true,
  'heatwave-public-health-guidance-v1'
)
on conflict (id) do update set
  title = excluded.title,
  content = excluded.content,
  url = excluded.url,
  is_published = true,
  content_hash = excluded.content_hash,
  updated_at = now();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
     ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;
