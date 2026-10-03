-- ============================================================================
-- NOVA TERRA — 09 : support des workflows (demandes, signalements publics, observations simulées)
-- Source de vérité : docs/PLAN.md §9 phases 3-6. Relançable. À exécuter après 08.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Une nouvelle demande notifie les membres actifs du service destinataire (D04)
-- ---------------------------------------------------------------------------
create or replace function public.notify_service_of_request()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (user_id, type, title, body, href, entity_type, entity_id)
  select m.profile_id, 'request_update',
         'Nouvelle demande ' || new.tracking_number,
         left(new.subject, 500), '/agent/requests/' || new.id::text, 'request', new.id
  from public.service_members m
  join public.profiles p on p.id = m.profile_id and p.account_status = 'active'
  where m.service_id = new.service_id and m.revoked_at is null;
  return new;
end;
$$;
revoke all on function public.notify_service_of_request() from public, anon, authenticated;
drop trigger if exists notify_service_of_request on public.requests;
create trigger notify_service_of_request
  after insert on public.requests for each row execute function public.notify_service_of_request();

-- ---------------------------------------------------------------------------
-- 2) Relance automatique des demandes bloquées (F22) : à planifier (pg_cron / tâche planifiée)
--    select public.remind_stalled_requests();
-- ---------------------------------------------------------------------------
create or replace function public.remind_stalled_requests(p_stall_hours int default 48)
returns int language plpgsql security definer set search_path = '' as $$
declare v_count int := 0;
begin
  with stalled as (
    select r.id, r.tracking_number, r.service_id, r.assigned_agent_id
    from public.requests r
    where r.deleted_at is null and r.status not in ('resolved', 'closed', 'rejected', 'cancelled')
      and (r.due_at < now() or r.updated_at < now() - make_interval(hours => p_stall_hours))
      and not exists (
        select 1 from public.notifications n
        where n.entity_id = r.id and n.title like 'Relance%' and n.created_at > now() - interval '24 hours')
  ), targets as (
    select s.id as request_id, s.tracking_number, coalesce(s.assigned_agent_id, m.profile_id) as user_id
    from stalled s
    left join public.service_members m on m.service_id = s.service_id and m.revoked_at is null and s.assigned_agent_id is null
  ), ins as (
    insert into public.notifications (user_id, type, title, body, href, entity_type, entity_id)
    select t.user_id, 'request_update', 'Relance : demande ' || t.tracking_number,
           'Cette demande est en retard ou sans activité depuis plusieurs jours.',
           '/agent/requests/' || t.request_id::text, 'request', t.request_id
    from targets t where t.user_id is not null
    returning 1
  )
  select count(*) into v_count from ins;
  return v_count;
end;
$$;
revoke all on function public.remind_stalled_requests(int) from public, anon, authenticated;
grant execute on function public.remind_stalled_requests(int) to service_role;

-- ---------------------------------------------------------------------------
-- 3) Les membres d'un service voient leurs collègues (affectation des demandes)
-- ---------------------------------------------------------------------------
drop policy if exists "service_members_select" on public.service_members;
create policy "service_members_select" on public.service_members for select to authenticated using (
  profile_id = (select auth.uid())
  or (select public.is_service_member(service_id))
  or (select public.can_manage_service(service_id))
);

-- ---------------------------------------------------------------------------
-- 4) Signalements publics : vue limitée aux signalements validés et publiés (+ auteur et réputation)
-- ---------------------------------------------------------------------------
create or replace view public.public_reports as
  select r.id, r.report_number, r.title, r.description, r.category, r.sector_id, r.building_id, r.x, r.y,
         r.observed_at, r.status, r.priority, r.cluster_id, r.resolved_at, r.service_id,
         r.reporter_citizen_id, p.display_name as reporter_name, c.reputation_points as reporter_reputation
  from public.reports r
  left join public.citizens c on c.id = r.reporter_citizen_id
  left join public.profiles p on p.id = c.profile_id
  where r.is_public and r.deleted_at is null and r.status in ('validated', 'assigned', 'in_progress', 'resolved');
grant select on public.public_reports to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) Observation automatique simulée (caméra / satellite) : crée un signalement « à vérifier »
--    La décision #7 du plan : une IA propose, l'administrateur du service valide ou rejette.
-- ---------------------------------------------------------------------------
create or replace function public.simulate_observation(p_source text default 'satellite')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_sector public.sectors%rowtype;
  v_cat public.report_category;
  v_conf numeric(3,2) := round((0.45 + random() * 0.5)::numeric, 2);
  v_titles text[] := array['Anomalie thermique détectée','Obstruction de voie détectée','Attroupement inhabituel','Fuite visible sur une conduite','Éclairage éteint détecté','Débris sur la chaussée'];
  v_cats public.report_category[] := array['safety','infrastructure','safety','infrastructure','infrastructure','environment']::public.report_category[];
  v_i int := 1 + floor(random() * 6)::int;
  v_report uuid;
  v_sync uuid;
begin
  if p_source not in ('camera', 'satellite') then raise exception 'Invalid source' using errcode = '22023'; end if;
  if not (public.is_admin() or public.current_user_role() in ('service_admin', 'agent')) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select * into v_sector from public.sectors order by random() limit 1;
  v_cat := v_cats[v_i];

  insert into public.api_synchronizations (source, status, items_imported, items_pending_validation, finished_at, external_ref)
  values (p_source || '_feed', 'success', 1, 1, now(), 'sim-' || to_char(now(), 'HH24MISS'))
  returning id into v_sync;

  insert into public.reports (title, description, category, sector_id, x, y, observed_at, source, reporter_system, priority, status, confidence_score, facts)
  values (v_titles[v_i], 'Observation automatique simulée (' || p_source || ') dans le secteur ' || v_sector.name || '. À vérifier par un administrateur.',
          v_cat, v_sector.id, v_sector.x + (random() * 40 - 20), v_sector.y + (random() * 40 - 20), now(), p_source::public.report_source,
          upper(p_source) || '-SIM', case when v_conf > 0.8 then 'high' else 'medium' end::public.priority_level, 'to_verify', v_conf,
          jsonb_build_object('simulated', true, 'sync_id', v_sync))
  returning id into v_report;

  insert into public.report_evidence (report_id, source, file_path, mime_type, captured_at, confidence_score, visibility, alt_text)
  values (v_report, p_source::public.evidence_source, 'system/' || p_source || '/sim-' || v_report::text || '.png', 'image/png', now(), v_conf, 'sensitive',
          'Image simulée générée par le module d''observation automatique');
  return v_report;
end;
$$;
revoke all on function public.simulate_observation(text) from public, anon;
grant execute on function public.simulate_observation(text) to authenticated;

-- Synchronisation API simulée : enregistre un import (utile pour l'indicateur de l'espace agent)
create or replace function public.simulate_api_sync(p_fail boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not (public.is_admin() or public.current_user_role() in ('service_admin', 'agent')) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  insert into public.api_synchronizations (source, status, items_imported, items_failed, error_log, finished_at, external_ref)
  values ('nova_api',
          case when p_fail then 'failed' else 'success' end::public.sync_status,
          case when p_fail then 0 else 25 + floor(random() * 100)::int end,
          case when p_fail then 1 else 0 end,
          case when p_fail then '[{"code":"E_TIMEOUT","message":"L''API Nova Terra n''a pas répondu"}]'::jsonb else '[]'::jsonb end,
          now(), 'sim-' || to_char(now(), 'HH24MISS'))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.simulate_api_sync(boolean) from public, anon;
grant execute on function public.simulate_api_sync(boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 6) Liste des agents pouvant être rattachés à un service (réservée aux administrateurs de service)
-- ---------------------------------------------------------------------------
create or replace function public.list_agents()
returns table (id uuid, display_name text, role public.user_role)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.is_admin() or public.current_user_role() = 'service_admin') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return query
    select p.id, p.display_name, p.role from public.profiles p
    where p.role in ('agent', 'service_admin') and p.account_status = 'active' and p.deleted_at is null
    order by p.display_name;
end;
$$;
revoke all on function public.list_agents() from public, anon;
grant execute on function public.list_agents() to authenticated;
