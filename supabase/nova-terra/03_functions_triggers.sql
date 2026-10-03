-- ============================================================================
-- NOVA TERRA — 03 : fonctions, triggers, RPC
-- Source de vérité : docs/PLAN.md §3.5. Relançable sans risque.
-- Toutes les fonctions SECURITY DEFINER ont search_path = '' (tout est qualifié).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Aides RLS
-- ---------------------------------------------------------------------------
create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.account_status = 'active' and p.deleted_at is null
  );
$$;

create or replace function public.current_user_role()
returns public.user_role language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p
  where p.id = (select auth.uid()) and p.account_status = 'active' and p.deleted_at is null;
$$;

-- Admin général : rôle signé dans le JWT (starter) OU profil actif general_admin.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
      or exists (
        select 1 from public.profiles p
        where p.id = (select auth.uid()) and p.role = 'general_admin'
          and p.account_status = 'active' and p.deleted_at is null
      );
$$;

create or replace function public.is_service_member(p_service_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_active_user() and exists (
    select 1 from public.service_members m
    where m.profile_id = (select auth.uid()) and m.service_id = p_service_id and m.revoked_at is null
  );
$$;

create or replace function public.can_manage_service(p_service_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or (public.is_active_user() and exists (
    select 1 from public.service_members m
    where m.profile_id = (select auth.uid()) and m.service_id = p_service_id
      and m.revoked_at is null and m.member_role = 'admin'
  ));
$$;

create or replace function public.can_validate_service(p_service_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or (public.is_active_user() and exists (
    select 1 from public.service_members m
    where m.profile_id = (select auth.uid()) and m.service_id = p_service_id
      and m.revoked_at is null and (m.member_role = 'admin' or m.can_validate_reports)
  ));
$$;

create or replace function public.my_citizen_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select c.id from public.citizens c
  where c.profile_id = (select auth.uid()) and c.deleted_at is null;
$$;

create or replace function public.is_verified_citizen()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_active_user() and exists (
    select 1 from public.citizens c
    where c.profile_id = (select auth.uid()) and c.kyc_status = 'verified' and c.deleted_at is null
  );
$$;

-- Liste des services dont l'utilisateur est membre (agent ou admin)
create or replace function public.my_service_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select m.service_id from public.service_members m
  where m.profile_id = (select auth.uid()) and m.revoked_at is null and public.is_active_user();
$$;

-- ---------------------------------------------------------------------------
-- updated_at générique
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t record;
begin
  for t in
    select c.table_name from information_schema.columns c
    join information_schema.tables tb on tb.table_schema = c.table_schema and tb.table_name = c.table_name
    where c.table_schema = 'public' and c.column_name = 'updated_at' and tb.table_type = 'BASE TABLE'
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t.table_name);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t.table_name);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Inscription (D01) : profil + fiche citoyen si la date de naissance est fournie
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_birth  date;
  v_sector uuid;
begin
  insert into public.profiles (id, display_name, first_name, last_name, account_status)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    case when new.email_confirmed_at is not null then 'active'::public.account_status else 'pending'::public.account_status end
  )
  on conflict (id) do nothing;

  begin
    v_birth  := (new.raw_user_meta_data ->> 'birth_date')::date;
    v_sector := nullif(new.raw_user_meta_data ->> 'sector_id', '')::uuid;
  exception when others then
    v_birth := null; v_sector := null;
  end;

  -- Un mineur sans parrain est refusé par enforce_citizen_rules : on ne crée la fiche que pour un majeur.
  if v_birth is not null and v_birth <= (current_date - interval '18 years')::date then
    insert into public.citizens (profile_id, birth_date, sector_id, consent_terms_at, consent_data_at)
    values (new.id, v_birth, v_sector, now(), now())
    on conflict (profile_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- Email confirmé => compte actif
create or replace function public.activate_confirmed_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    update public.profiles set account_status = 'active'
    where id = new.id and account_status = 'pending';
  end if;
  return new;
end;
$$;
revoke all on function public.activate_confirmed_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users for each row execute function public.activate_confirmed_user();

-- ---------------------------------------------------------------------------
-- Citoyens : mineur ⇒ parrain majeur vérifié ; réputation de départ
-- ---------------------------------------------------------------------------
create or replace function public.enforce_citizen_rules()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.is_minor := new.birth_date > (current_date - interval '18 years')::date;
  if tg_op = 'INSERT' then
    new.reputation_points := new.reputation_base;
  end if;
  if new.is_minor then
    if new.sponsor_citizen_id is null then
      raise exception 'A minor citizen needs an adult sponsor' using errcode = '23514';
    end if;
    if not exists (
      select 1 from public.citizens s
      where s.id = new.sponsor_citizen_id and not s.is_minor and s.kyc_status = 'verified'
    ) then
      raise exception 'The sponsor must be an adult, identity-verified citizen' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_citizen_rules() from public, anon, authenticated;
drop trigger if exists enforce_citizen_rules on public.citizens;
create trigger enforce_citizen_rules
  before insert or update on public.citizens for each row execute function public.enforce_citizen_rules();

-- Réputation : somme des votes reçus + base. Pas d'auto-vote (contrainte CHECK).
create or replace function public.apply_reputation_vote()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_target uuid := coalesce(new.to_citizen_id, old.to_citizen_id);
begin
  update public.citizens c
  set reputation_points = c.reputation_base
    + coalesce((select sum(v.points) from public.reputation_votes v where v.to_citizen_id = v_target), 0)
  where c.id = v_target;
  return coalesce(new, old);
end;
$$;
revoke all on function public.apply_reputation_vote() from public, anon, authenticated;
drop trigger if exists apply_reputation_vote on public.reputation_votes;
create trigger apply_reputation_vote
  after insert or update or delete on public.reputation_votes for each row execute function public.apply_reputation_vote();

-- ---------------------------------------------------------------------------
-- Demandes (F22) : clôture, historique, notification du citoyen
-- ---------------------------------------------------------------------------
create or replace function public.before_request_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status in ('resolved', 'closed') and old.status not in ('resolved', 'closed') then
    new.closed_at := now();
  elsif new.status not in ('resolved', 'closed') then
    new.closed_at := null;
  end if;
  return new;
end;
$$;
drop trigger if exists before_request_update on public.requests;
create trigger before_request_update
  before update on public.requests for each row execute function public.before_request_update();

create or replace function public.after_request_status_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    insert into public.request_status_history (request_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, (select auth.uid()));
    insert into public.notifications (user_id, type, title, body, href, entity_type, entity_id)
    values (new.requester_id, 'request_update',
            'Demande ' || new.tracking_number || ' mise à jour',
            left('Nouveau statut : ' || new.status::text, 500),
            '/app/requests/' || new.id::text, 'request', new.id);
  end if;
  return new;
end;
$$;
revoke all on function public.after_request_status_change() from public, anon, authenticated;
drop trigger if exists after_request_status_change on public.requests;
create trigger after_request_status_change
  after update on public.requests for each row execute function public.after_request_status_change();

-- ---------------------------------------------------------------------------
-- Signalements : routage, vérification, validation par le bon service, historique
-- ---------------------------------------------------------------------------
create or replace function public.before_report_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_citizen uuid;
  v_slug    text;
begin
  -- Un citoyen (ou le chatbot en son nom) doit être vérifié ; un agent/admin/système n'est pas concerné.
  if (select auth.uid()) is not null and new.source in ('citizen', 'chatbot')
     and public.current_user_role() in ('citizen') then
    if not public.is_verified_citizen() then
      raise exception 'Only identity-verified citizens can file reports' using errcode = '42501';
    end if;
    select c.id into v_citizen from public.citizens c where c.profile_id = (select auth.uid());
    new.reporter_citizen_id := v_citizen;
    -- un citoyen ne peut pas se valider ni se publier lui-même
    new.status := case when new.status = 'draft' then 'draft'::public.report_status else 'received'::public.report_status end;
    new.is_public := false; new.validated_by := null; new.validated_at := null;
  end if;

  if new.service_id is null then
    v_slug := case new.category
      when 'infrastructure' then 'public-works'
      when 'safety'         then 'nova-police'
      when 'health'         then 'emergency-medical'
      when 'environment'    then 'environment-waste'
      when 'transport'      then 'transport-authority'
      when 'noise'          then 'nova-police'
      else 'citizen-relations' end;
    select s.id into new.service_id from public.services s where s.slug = v_slug;
  end if;
  return new;
end;
$$;
revoke all on function public.before_report_insert() from public, anon, authenticated;
drop trigger if exists before_report_insert on public.reports;
create trigger before_report_insert
  before insert on public.reports for each row execute function public.before_report_insert();

create or replace function public.before_report_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'validated' and old.status is distinct from 'validated' then
    if (select auth.uid()) is not null and not public.can_validate_service(new.service_id) then
      raise exception 'Only an administrator of the responsible service can validate this report' using errcode = '42501';
    end if;
    new.validated_by := coalesce((select auth.uid()), new.validated_by);
    new.validated_at := now();
  end if;
  if new.status = 'resolved' and old.status is distinct from 'resolved' then
    new.resolved_at := now();
  end if;
  if new.is_public and not old.is_public and (select auth.uid()) is not null
     and not public.can_validate_service(new.service_id) then
    raise exception 'Only an administrator of the responsible service can publish this report' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.before_report_update() from public, anon, authenticated;
drop trigger if exists before_report_update on public.reports;
create trigger before_report_update
  before update on public.reports for each row execute function public.before_report_update();

create or replace function public.after_report_status_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    insert into public.report_status_history (report_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, (select auth.uid()));
  end if;
  return new;
end;
$$;
revoke all on function public.after_report_status_change() from public, anon, authenticated;
drop trigger if exists after_report_status_change on public.reports;
create trigger after_report_status_change
  after update on public.reports for each row execute function public.after_report_status_change();

-- Regroupement : report_count tenu à jour
create or replace function public.refresh_report_cluster()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  foreach v_id in array array[
    case when tg_op <> 'INSERT' then old.cluster_id end,
    case when tg_op <> 'DELETE' then new.cluster_id end
  ] loop
    if v_id is not null then
      update public.report_clusters c
      set report_count = (select count(*) from public.reports r where r.cluster_id = c.id and r.deleted_at is null)
      where c.id = v_id;
    end if;
  end loop;
  return coalesce(new, old);
end;
$$;
revoke all on function public.refresh_report_cluster() from public, anon, authenticated;
drop trigger if exists refresh_report_cluster on public.reports;
create trigger refresh_report_cluster
  after insert or update of cluster_id or delete on public.reports for each row execute function public.refresh_report_cluster();

-- ---------------------------------------------------------------------------
-- Audit : modifications sensibles (UPDATE / DELETE) ; la table est en insertion seule
-- ---------------------------------------------------------------------------
create or replace function public.audit_row_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
begin
  if tg_op = 'UPDATE'
     and (v_old - 'updated_at' - 'last_login_at') = (v_new - 'updated_at' - 'last_login_at') then
    return new;
  end if;
  insert into public.audit_logs (actor_id, actor_type, action, entity_type, entity_id, old_value, new_value)
  values (
    (select auth.uid()),
    case when (select auth.uid()) is null then 'system' else 'user' end,
    lower(tg_op), tg_table_name,
    (coalesce(v_new, v_old) ->> 'id')::uuid, v_old, v_new
  );
  return coalesce(new, old);
end;
$$;
revoke all on function public.audit_row_change() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['profiles','services','service_members','role_permissions','reports','requests','news','citizens']
  loop
    execute format('drop trigger if exists audit_row_change on public.%I', t);
    execute format('create trigger audit_row_change after update or delete on public.%I for each row execute function public.audit_row_change()', t);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- RPC : recherche et statistiques (security invoker => la RLS s'applique)
-- ---------------------------------------------------------------------------
create or replace function public.search_services(q text default null)
returns setof public.services language sql stable set search_path = '' as $$
  select s.* from public.services s
  where coalesce(btrim(q), '') = ''
     or to_tsvector('simple', coalesce(s.name, '') || ' ' || coalesce(s.description, '') || ' ' || coalesce(s.category, ''))
        @@ websearch_to_tsquery('simple', q)
     or s.name ilike '%' || q || '%'
  order by s.name;
$$;

create or replace function public.search_news(q text default null)
returns setof public.news language sql stable set search_path = '' as $$
  select n.* from public.news n
  where coalesce(btrim(q), '') = ''
     or to_tsvector('simple', coalesce(n.title, '') || ' ' || coalesce(n.summary, '') || ' ' || coalesce(n.category, ''))
        @@ websearch_to_tsquery('simple', q)
     or n.title ilike '%' || q || '%'
  order by n.published_at desc nulls last;
$$;

create or replace function public.stats_service(p_service_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.is_service_member(p_service_id) or public.is_admin()) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'requests_by_status', coalesce((
      select jsonb_object_agg(status, n) from (
        select status::text as status, count(*) as n from public.requests
        where service_id = p_service_id and deleted_at is null group by status) x), '{}'::jsonb),
    'requests_overdue', (select count(*) from public.requests
      where service_id = p_service_id and deleted_at is null
        and due_at < now() and status not in ('resolved', 'closed', 'rejected', 'cancelled')),
    'reports_to_verify', (select count(*) from public.reports
      where service_id = p_service_id and deleted_at is null and status in ('received', 'to_verify')),
    'avg_resolution_hours', (select round(avg(extract(epoch from (closed_at - created_at)) / 3600)::numeric, 1)
      from public.requests where service_id = p_service_id and closed_at is not null)
  );
end;
$$;
revoke all on function public.stats_service(uuid) from public, anon;
grant execute on function public.stats_service(uuid) to authenticated;
