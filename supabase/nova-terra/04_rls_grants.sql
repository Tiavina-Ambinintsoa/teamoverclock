-- ============================================================================
-- NOVA TERRA — 04 : GRANT + RLS + policies (3 étapes obligatoires par table)
-- Source de vérité : docs/PLAN.md §3.7 (matrice D09). Refus par défaut.
-- Relançable sans risque. Les gardes de colonnes sont en triggers (profiles, citizens).
-- ============================================================================

grant usage on sequence public.request_number_seq, public.report_number_seq to authenticated, service_role;

-- Active RLS sur toutes les tables Nova Terra + service_role complet
do $$
declare t text;
begin
  foreach t in array array[
    'sectors','departments','buildings','services','service_relations','transports',
    'citizens','service_members','permissions','role_permissions','citizen_verifications','reputation_votes',
    'requests','request_comments','request_status_history',
    'report_clusters','reports','report_evidence','report_status_history',
    'news','news_comments','newsletter_topics','newsletter_subscriptions','support_calls',
    'dangers','cameras','satellite_observations',
    'audit_logs','api_synchronizations','chat_sessions','chat_messages','knowledge_base','ai_generated_content',
    'accessibility_preferences','guide_tours','guide_tour_steps','voice_commands'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
  end loop;
end
$$;
alter table public.profiles enable row level security;

-- ---------------------------------------------------------------------------
-- Gardes de colonnes (un utilisateur ne peut pas s'auto-promouvoir)
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and pg_trigger_depth() = 1 and not public.is_admin() then
    if (new.role, new.account_status, new.primary_service_id, new.allowed_sector_ids, new.requires_2fa, new.deleted_at)
       is distinct from
       (old.role, old.account_status, old.primary_service_id, old.allowed_sector_ids, old.requires_2fa, old.deleted_at) then
      raise exception 'Role, status and attachment can only be changed by an administrator' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_profile_update() from public, anon, authenticated;
drop trigger if exists guard_profile_update on public.profiles;
create trigger guard_profile_update before update on public.profiles
  for each row execute function public.guard_profile_update();

create or replace function public.guard_citizen_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and pg_trigger_depth() = 1 and not public.is_admin() then
    if (new.kyc_status, new.reputation_base, new.reputation_points, new.deleted_at, new.profile_id)
       is distinct from
       (old.kyc_status, old.reputation_base, old.reputation_points, old.deleted_at, old.profile_id) then
      raise exception 'Verification and reputation are managed by the platform' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_citizen_update() from public, anon, authenticated;
drop trigger if exists guard_citizen_update on public.citizens;
create trigger guard_citizen_update before update on public.citizens
  for each row execute function public.guard_citizen_update();

-- ---------------------------------------------------------------------------
-- profiles (starter) : plus de lecture publique des colonnes personnelles
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_select_all" on public.profiles;
drop policy if exists "profiles_admin_read" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_staff" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;

revoke select on public.profiles from anon;
grant select, insert, update on public.profiles to authenticated;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_select_staff" on public.profiles
  for select to authenticated using (
    (select public.is_admin())
    or exists (select 1 from public.service_members m
               where m.profile_id = profiles.id and m.revoked_at is null and (select public.can_manage_service(m.service_id)))
  );
create policy "profiles_update_admin" on public.profiles
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
-- profiles_insert_own et profiles_update_own : conservées du starter.

-- Vue publique : nom affiché, avatar, réputation (jamais e-mail / téléphone)
create or replace view public.public_profiles as
  select p.id, p.display_name, p.avatar_url, c.reputation_points, c.reputation_level
  from public.profiles p
  left join public.citizens c on c.profile_id = p.id and c.deleted_at is null
  where p.account_status = 'active' and p.deleted_at is null;
grant select on public.public_profiles to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Données publiques de la ville : lecture libre, écriture admin général
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['sectors','departments','buildings','service_relations','newsletter_topics','voice_commands']
  loop
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists "%1$s_select_public" on public.%1$I', t);
    execute format('create policy "%1$s_select_public" on public.%1$I for select to anon, authenticated using (true)', t);
    execute format('drop policy if exists "%1$s_write_admin" on public.%1$I', t);
    execute format('create policy "%1$s_write_admin" on public.%1$I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t);
  end loop;
end
$$;
drop policy if exists "buildings_write_service_manager" on public.buildings;
create policy "buildings_write_service_manager" on public.buildings for all to authenticated
  using (service_id is not null and (select public.can_manage_service(service_id)))
  with check (service_id is not null and (select public.can_manage_service(service_id)));

-- ---------------------------------------------------------------------------
-- services (D05) : publiés visibles par tous ; admin de service modifie son périmètre
-- ---------------------------------------------------------------------------
grant select on public.services to anon, authenticated;
grant insert, update, delete on public.services to authenticated;
drop policy if exists "services_select_published" on public.services;
create policy "services_select_published" on public.services for select to anon, authenticated using (
  (published_at is not null and status <> 'hidden')
  or (select public.is_service_member(id)) or (select public.is_admin())
);
drop policy if exists "services_update_manager" on public.services;
create policy "services_update_manager" on public.services for update to authenticated
  using ((select public.can_manage_service(id))) with check ((select public.can_manage_service(id)));
drop policy if exists "services_write_admin" on public.services;
create policy "services_write_admin" on public.services for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- transports : publics, sauf véhicules personnels (propriétaire / admin)
-- ---------------------------------------------------------------------------
grant select on public.transports to anon, authenticated;
grant insert, update, delete on public.transports to authenticated;
drop policy if exists "transports_select" on public.transports;
create policy "transports_select" on public.transports for select to anon, authenticated using (
  visibility = 'public'
  or owner_citizen_id = (select public.my_citizen_id())
  or (select public.is_admin())
);
drop policy if exists "transports_write_manager" on public.transports;
create policy "transports_write_manager" on public.transports for all to authenticated
  using ((select public.is_admin()) or (owner_service_id is not null and (select public.can_manage_service(owner_service_id))))
  with check ((select public.is_admin()) or (owner_service_id is not null and (select public.can_manage_service(owner_service_id))));

-- ---------------------------------------------------------------------------
-- citizens (confidentiel)
-- ---------------------------------------------------------------------------
grant select, insert, update on public.citizens to authenticated;
drop policy if exists "citizens_select" on public.citizens;
create policy "citizens_select" on public.citizens for select to authenticated using (
  profile_id = (select auth.uid()) or sponsor_citizen_id = (select public.my_citizen_id()) or (select public.is_admin())
);
drop policy if exists "citizens_insert_own" on public.citizens;
create policy "citizens_insert_own" on public.citizens for insert to authenticated with check (
  profile_id = (select auth.uid()) and kyc_status = 'none' and reputation_base = 0
);
drop policy if exists "citizens_update_own" on public.citizens;
create policy "citizens_update_own" on public.citizens for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
drop policy if exists "citizens_write_admin" on public.citizens;
create policy "citizens_write_admin" on public.citizens for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- service_members / permissions
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.service_members to authenticated;
drop policy if exists "service_members_select" on public.service_members;
create policy "service_members_select" on public.service_members for select to authenticated using (
  profile_id = (select auth.uid()) or (select public.can_manage_service(service_id))
);
drop policy if exists "service_members_write_manager" on public.service_members;
create policy "service_members_write_manager" on public.service_members for insert to authenticated with check (
  (select public.can_manage_service(service_id)) and (member_role = 'agent' or (select public.is_admin()))
);
drop policy if exists "service_members_update_manager" on public.service_members;
create policy "service_members_update_manager" on public.service_members for update to authenticated
  using ((select public.can_manage_service(service_id)))
  with check ((select public.can_manage_service(service_id)) and (member_role = 'agent' or (select public.is_admin())));
drop policy if exists "service_members_delete_admin" on public.service_members;
create policy "service_members_delete_admin" on public.service_members for delete to authenticated
  using ((select public.is_admin()));

grant select on public.permissions, public.role_permissions to authenticated;
grant insert, update, delete on public.permissions, public.role_permissions to authenticated;
do $$
declare t text;
begin
  foreach t in array array['permissions','role_permissions'] loop
    execute format('drop policy if exists "%1$s_select" on public.%1$I', t);
    execute format('create policy "%1$s_select" on public.%1$I for select to authenticated using (true)', t);
    execute format('drop policy if exists "%1$s_write_admin" on public.%1$I', t);
    execute format('create policy "%1$s_write_admin" on public.%1$I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Vérification d'identité (CIN fictif) & réputation
-- ---------------------------------------------------------------------------
grant select, insert, update on public.citizen_verifications to authenticated;
drop policy if exists "citizen_verifications_select" on public.citizen_verifications;
create policy "citizen_verifications_select" on public.citizen_verifications for select to authenticated using (
  citizen_id = (select public.my_citizen_id()) or (select public.is_admin())
);
drop policy if exists "citizen_verifications_insert_own" on public.citizen_verifications;
create policy "citizen_verifications_insert_own" on public.citizen_verifications for insert to authenticated with check (
  citizen_id = (select public.my_citizen_id())
  and status = 'pending' and reviewed_by is null and ai_score is null and decided_at is null
);
drop policy if exists "citizen_verifications_update_admin" on public.citizen_verifications;
create policy "citizen_verifications_update_admin" on public.citizen_verifications for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

grant select, insert, update, delete on public.reputation_votes to authenticated;
drop policy if exists "reputation_votes_select" on public.reputation_votes;
create policy "reputation_votes_select" on public.reputation_votes for select to authenticated using (
  from_citizen_id = (select public.my_citizen_id()) or (select public.is_admin())
);
drop policy if exists "reputation_votes_insert" on public.reputation_votes;
create policy "reputation_votes_insert" on public.reputation_votes for insert to authenticated with check (
  from_citizen_id = (select public.my_citizen_id()) and (select public.is_verified_citizen())
);
drop policy if exists "reputation_votes_update_own" on public.reputation_votes;
create policy "reputation_votes_update_own" on public.reputation_votes for update to authenticated
  using (from_citizen_id = (select public.my_citizen_id()))
  with check (from_citizen_id = (select public.my_citizen_id()) and (select public.is_verified_citizen()));
drop policy if exists "reputation_votes_delete_own" on public.reputation_votes;
create policy "reputation_votes_delete_own" on public.reputation_votes for delete to authenticated
  using (from_citizen_id = (select public.my_citizen_id()));

-- ---------------------------------------------------------------------------
-- Demandes (D04 / F22)
-- ---------------------------------------------------------------------------
grant select, insert, update on public.requests to authenticated;
drop policy if exists "requests_select" on public.requests;
create policy "requests_select" on public.requests for select to authenticated using (
  (requester_id = (select auth.uid()) and deleted_at is null)
  or (select public.is_service_member(service_id)) or (select public.is_admin())
);
drop policy if exists "requests_insert_own" on public.requests;
create policy "requests_insert_own" on public.requests for insert to authenticated with check (
  requester_id = (select auth.uid()) and (select public.is_active_user())
  and status = 'new' and assigned_agent_id is null and closed_at is null and resolution_note is null and satisfaction is null
);
drop policy if exists "requests_update_staff" on public.requests;
create policy "requests_update_staff" on public.requests for update to authenticated
  using ((select public.is_service_member(service_id)) or (select public.is_admin()))
  with check ((select public.is_service_member(service_id)) or (select public.is_admin()));

grant select, insert on public.request_comments to authenticated;
drop policy if exists "request_comments_select" on public.request_comments;
create policy "request_comments_select" on public.request_comments for select to authenticated using (
  exists (select 1 from public.requests r where r.id = request_id
          and ((select public.is_service_member(r.service_id)) or (select public.is_admin())))
  or (not is_internal and exists (select 1 from public.requests r
          where r.id = request_id and r.requester_id = (select auth.uid())))
);
drop policy if exists "request_comments_insert" on public.request_comments;
create policy "request_comments_insert" on public.request_comments for insert to authenticated with check (
  author_id = (select auth.uid()) and (
    exists (select 1 from public.requests r where r.id = request_id
            and ((select public.is_service_member(r.service_id)) or (select public.is_admin())))
    or (not is_internal and exists (select 1 from public.requests r
            where r.id = request_id and r.requester_id = (select auth.uid())))
  )
);

grant select on public.request_status_history to authenticated;
drop policy if exists "request_status_history_select" on public.request_status_history;
create policy "request_status_history_select" on public.request_status_history for select to authenticated using (
  exists (select 1 from public.requests r where r.id = request_id
          and (r.requester_id = (select auth.uid()) or (select public.is_service_member(r.service_id)) or (select public.is_admin())))
);

-- Actions du citoyen sur sa propre demande (sans ouvrir l'UPDATE à toutes les colonnes)
create or replace function public.cancel_my_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.requests set status = 'cancelled'
  where id = p_request_id and requester_id = (select auth.uid()) and status in ('new', 'received', 'to_qualify');
  if not found then
    raise exception 'This request cannot be cancelled' using errcode = '42501';
  end if;
end;
$$;
create or replace function public.rate_my_request(p_request_id uuid, p_score smallint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.requests set satisfaction = p_score
  where id = p_request_id and requester_id = (select auth.uid()) and status in ('resolved', 'closed');
  if not found then
    raise exception 'This request cannot be rated' using errcode = '42501';
  end if;
end;
$$;
revoke all on function public.cancel_my_request(uuid), public.rate_my_request(uuid, smallint) from public, anon;
grant execute on function public.cancel_my_request(uuid), public.rate_my_request(uuid, smallint) to authenticated;

-- ---------------------------------------------------------------------------
-- Signalements
-- ---------------------------------------------------------------------------
grant select on public.report_clusters to anon, authenticated;
grant insert, update on public.report_clusters to authenticated;
drop policy if exists "report_clusters_select_public" on public.report_clusters;
create policy "report_clusters_select_public" on public.report_clusters for select to anon, authenticated using (true);
drop policy if exists "report_clusters_write_staff" on public.report_clusters;
create policy "report_clusters_write_staff" on public.report_clusters for all to authenticated
  using ((select public.current_user_role()) in ('agent', 'service_admin', 'general_admin'))
  with check ((select public.current_user_role()) in ('agent', 'service_admin', 'general_admin'));

grant select on public.reports to anon;
grant select, insert, update on public.reports to authenticated;
drop policy if exists "reports_select" on public.reports;
create policy "reports_select" on public.reports for select to anon, authenticated using (
  (is_public and deleted_at is null and status in ('validated', 'assigned', 'in_progress', 'resolved'))
  or reporter_citizen_id = (select public.my_citizen_id())
  or (select public.is_service_member(service_id)) or (select public.is_admin())
);
drop policy if exists "reports_insert" on public.reports;
create policy "reports_insert" on public.reports for insert to authenticated with check (
  (select public.is_active_user()) and (
    reporter_citizen_id is null or reporter_citizen_id = (select public.my_citizen_id())
    or (select public.current_user_role()) in ('agent', 'service_admin', 'general_admin')
  )
);
drop policy if exists "reports_update" on public.reports;
create policy "reports_update" on public.reports for update to authenticated
  using ((reporter_citizen_id = (select public.my_citizen_id()) and status = 'draft')
         or (select public.is_service_member(service_id)) or (select public.is_admin()))
  with check ((reporter_citizen_id = (select public.my_citizen_id()) and status in ('draft', 'received') and not is_public)
         or (select public.is_service_member(service_id)) or (select public.is_admin()));

-- Preuves : jamais publiques ; caméra/satellite réservés aux admins du service
grant select, insert, update, delete on public.report_evidence to authenticated;
drop policy if exists "report_evidence_select" on public.report_evidence;
create policy "report_evidence_select" on public.report_evidence for select to authenticated using (
  (select public.is_admin())
  or exists (select 1 from public.reports r where r.id = report_id and (
       (report_evidence.source in ('citizen', 'agent', 'api')
          and (r.reporter_citizen_id = (select public.my_citizen_id()) or (select public.is_service_member(r.service_id))))
    or (report_evidence.source in ('camera', 'satellite') and (select public.can_manage_service(r.service_id)))
  ))
);
drop policy if exists "report_evidence_insert" on public.report_evidence;
create policy "report_evidence_insert" on public.report_evidence for insert to authenticated with check (
  (select public.is_admin())
  or exists (select 1 from public.reports r where r.id = report_id and (
       (report_evidence.source = 'citizen' and r.reporter_citizen_id = (select public.my_citizen_id()) and r.status in ('draft', 'received'))
    or (report_evidence.source in ('agent', 'api') and (select public.is_service_member(r.service_id)))
    or (report_evidence.source in ('camera', 'satellite') and (select public.can_manage_service(r.service_id)))
  ))
);
drop policy if exists "report_evidence_update" on public.report_evidence;
create policy "report_evidence_update" on public.report_evidence for update to authenticated
  using ((select public.is_admin()) or exists (select 1 from public.reports r where r.id = report_id and (select public.can_validate_service(r.service_id))))
  with check ((select public.is_admin()) or exists (select 1 from public.reports r where r.id = report_id and (select public.can_validate_service(r.service_id))));
drop policy if exists "report_evidence_delete_admin" on public.report_evidence;
create policy "report_evidence_delete_admin" on public.report_evidence for delete to authenticated
  using ((select public.is_admin()));

grant select on public.report_status_history to authenticated;
drop policy if exists "report_status_history_select" on public.report_status_history;
create policy "report_status_history_select" on public.report_status_history for select to authenticated using (
  (select public.is_admin())
  or exists (select 1 from public.reports r where r.id = report_id
             and (r.reporter_citizen_id = (select public.my_citizen_id()) or (select public.is_service_member(r.service_id))))
);

-- ---------------------------------------------------------------------------
-- Actualités & communication
-- ---------------------------------------------------------------------------
grant select on public.news to anon;
grant select, insert, update on public.news to authenticated;
drop policy if exists "news_select" on public.news;
create policy "news_select" on public.news for select to anon, authenticated using (
  (status in ('published', 'archived') and deleted_at is null)
  or (service_id is not null and (select public.is_service_member(service_id))) or (select public.is_admin())
);
drop policy if exists "news_insert_staff" on public.news;
create policy "news_insert_staff" on public.news for insert to authenticated with check (
  (select public.is_admin())
  or (service_id is not null and (select public.is_service_member(service_id)) and status in ('draft', 'pending_review'))
);
drop policy if exists "news_update_staff" on public.news;
create policy "news_update_staff" on public.news for update to authenticated
  using ((select public.is_admin()) or (service_id is not null and (select public.is_service_member(service_id))))
  with check (
    (select public.is_admin())
    or (service_id is not null and (select public.is_service_member(service_id))
        and (status in ('draft', 'pending_review') or (select public.can_manage_service(service_id))))
  );

grant select on public.news_comments to anon;
grant select, insert, update, delete on public.news_comments to authenticated;
drop policy if exists "news_comments_select" on public.news_comments;
create policy "news_comments_select" on public.news_comments for select to anon, authenticated using (
  (status = 'visible' and exists (select 1 from public.news n where n.id = news_id and n.status in ('published', 'archived')))
  or author_id = (select auth.uid())
  or (select public.is_admin())
  or exists (select 1 from public.news n where n.id = news_id and n.service_id is not null and (select public.can_manage_service(n.service_id)))
);
drop policy if exists "news_comments_insert" on public.news_comments;
create policy "news_comments_insert" on public.news_comments for insert to authenticated with check (
  author_id = (select auth.uid()) and status = 'visible' and (select public.is_active_user())
  and exists (select 1 from public.news n where n.id = news_id and n.status = 'published')
);
drop policy if exists "news_comments_moderate" on public.news_comments;
create policy "news_comments_moderate" on public.news_comments for update to authenticated
  using ((select public.is_admin()) or exists (select 1 from public.news n where n.id = news_id and n.service_id is not null and (select public.can_manage_service(n.service_id))))
  with check ((select public.is_admin()) or exists (select 1 from public.news n where n.id = news_id and n.service_id is not null and (select public.can_manage_service(n.service_id))));
drop policy if exists "news_comments_delete_own" on public.news_comments;
create policy "news_comments_delete_own" on public.news_comments for delete to authenticated
  using (author_id = (select auth.uid()) or (select public.is_admin()));

grant select, insert, update, delete on public.newsletter_subscriptions to authenticated;
drop policy if exists "newsletter_subscriptions_own" on public.newsletter_subscriptions;
create policy "newsletter_subscriptions_own" on public.newsletter_subscriptions for all to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

grant select, insert, update on public.support_calls to authenticated;
drop policy if exists "support_calls_select" on public.support_calls;
create policy "support_calls_select" on public.support_calls for select to authenticated using (
  caller_id = (select auth.uid()) or (select public.is_service_member(service_id)) or (select public.is_admin())
);
drop policy if exists "support_calls_insert_own" on public.support_calls;
create policy "support_calls_insert_own" on public.support_calls for insert to authenticated with check (
  caller_id = (select auth.uid()) and status = 'requested' and agent_id is null
);
drop policy if exists "support_calls_update_staff" on public.support_calls;
create policy "support_calls_update_staff" on public.support_calls for update to authenticated
  using ((select public.is_service_member(service_id)) or (select public.is_admin()))
  with check ((select public.is_service_member(service_id)) or (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Dangers, caméras, satellites
-- ---------------------------------------------------------------------------
grant select on public.dangers to anon;
grant select, insert, update, delete on public.dangers to authenticated;
drop policy if exists "dangers_select" on public.dangers;
create policy "dangers_select" on public.dangers for select to anon, authenticated using (
  status in ('active', 'archived')
  or (responsible_service_id is not null and (select public.can_manage_service(responsible_service_id))) or (select public.is_admin())
);
drop policy if exists "dangers_write_manager" on public.dangers;
create policy "dangers_write_manager" on public.dangers for all to authenticated
  using ((select public.is_admin()) or (responsible_service_id is not null and (select public.can_manage_service(responsible_service_id))))
  with check ((select public.is_admin()) or (responsible_service_id is not null and (select public.can_manage_service(responsible_service_id))));

do $$
declare t text;
begin
  foreach t in array array['cameras','satellite_observations'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists "%1$s_select_admins" on public.%1$I', t);
    execute format('create policy "%1$s_select_admins" on public.%1$I for select to authenticated using ((select public.is_admin()) or (select public.current_user_role()) = ''service_admin'')', t);
    execute format('drop policy if exists "%1$s_write_admin" on public.%1$I', t);
    execute format('create policy "%1$s_write_admin" on public.%1$I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Plateforme : audit (insertion seule), synchronisations, IA
-- ---------------------------------------------------------------------------
revoke update, delete on public.audit_logs from service_role;
grant select on public.audit_logs to authenticated;
drop policy if exists "audit_logs_select" on public.audit_logs;
create policy "audit_logs_select" on public.audit_logs for select to authenticated using (
  (select public.is_admin())
  or (entity_type = 'reports' and exists (select 1 from public.reports r where r.id = entity_id and (select public.can_manage_service(r.service_id))))
  or (entity_type = 'requests' and exists (select 1 from public.requests r where r.id = entity_id and (select public.can_manage_service(r.service_id))))
);

grant select on public.api_synchronizations to authenticated;
drop policy if exists "api_synchronizations_select_staff" on public.api_synchronizations;
create policy "api_synchronizations_select_staff" on public.api_synchronizations for select to authenticated
  using ((select public.current_user_role()) in ('agent', 'service_admin', 'general_admin') or (select public.is_admin()));

grant select, insert, update, delete on public.chat_sessions, public.chat_messages to authenticated;
drop policy if exists "chat_sessions_own" on public.chat_sessions;
create policy "chat_sessions_own" on public.chat_sessions for all to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
drop policy if exists "chat_messages_own" on public.chat_messages;
create policy "chat_messages_own" on public.chat_messages for all to authenticated
  using (exists (select 1 from public.chat_sessions s where s.id = session_id and s.profile_id = (select auth.uid())))
  with check (exists (select 1 from public.chat_sessions s where s.id = session_id and s.profile_id = (select auth.uid())));

grant select on public.knowledge_base to anon, authenticated;
grant insert, update, delete on public.knowledge_base to authenticated;
drop policy if exists "knowledge_base_select" on public.knowledge_base;
create policy "knowledge_base_select" on public.knowledge_base for select to anon, authenticated
  using (is_published or (select public.is_admin()));
drop policy if exists "knowledge_base_write_admin" on public.knowledge_base;
create policy "knowledge_base_write_admin" on public.knowledge_base for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

grant select, insert, update, delete on public.ai_generated_content to authenticated;
drop policy if exists "ai_generated_content_admin" on public.ai_generated_content;
create policy "ai_generated_content_admin" on public.ai_generated_content for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Accessibilité, voix & guidage
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.accessibility_preferences to authenticated;
drop policy if exists "accessibility_preferences_own" on public.accessibility_preferences;
create policy "accessibility_preferences_own" on public.accessibility_preferences for all to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

grant select on public.guide_tours, public.guide_tour_steps to anon, authenticated;
grant insert, update, delete on public.guide_tours, public.guide_tour_steps to authenticated;
drop policy if exists "guide_tours_select" on public.guide_tours;
create policy "guide_tours_select" on public.guide_tours for select to anon, authenticated
  using (is_published or (select public.is_admin()));
drop policy if exists "guide_tours_write_admin" on public.guide_tours;
create policy "guide_tours_write_admin" on public.guide_tours for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "guide_tour_steps_select" on public.guide_tour_steps;
create policy "guide_tour_steps_select" on public.guide_tour_steps for select to anon, authenticated
  using (exists (select 1 from public.guide_tours t where t.id = tour_id and (t.is_published or (select public.is_admin()))));
drop policy if exists "guide_tour_steps_write_admin" on public.guide_tour_steps;
create policy "guide_tour_steps_write_admin" on public.guide_tour_steps for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
