-- ============================================================================
-- NOVA TERRA — 99 : vérification (lecture seule)
-- Résultat attendu : toutes les lignes ont ok = true.
-- ============================================================================

-- 1) Chaque table Nova Terra contient au moins 10 lignes
with counts as (
  select 'sectors' as t, count(*) n from public.sectors union all
  select 'departments', count(*) from public.departments union all
  select 'buildings', count(*) from public.buildings union all
  select 'services', count(*) from public.services union all
  select 'service_relations', count(*) from public.service_relations union all
  select 'transports', count(*) from public.transports union all
  select 'profiles', count(*) from public.profiles where id::text like '00000007-%' union all
  select 'citizens', count(*) from public.citizens union all
  select 'service_members', count(*) from public.service_members union all
  select 'permissions', count(*) from public.permissions union all
  select 'role_permissions', count(*) from public.role_permissions union all
  select 'citizen_verifications', count(*) from public.citizen_verifications union all
  select 'reputation_votes', count(*) from public.reputation_votes union all
  select 'requests', count(*) from public.requests union all
  select 'request_comments', count(*) from public.request_comments union all
  select 'request_status_history', count(*) from public.request_status_history union all
  select 'report_clusters', count(*) from public.report_clusters union all
  select 'reports', count(*) from public.reports union all
  select 'report_evidence', count(*) from public.report_evidence union all
  select 'report_status_history', count(*) from public.report_status_history union all
  select 'news', count(*) from public.news union all
  select 'news_comments', count(*) from public.news_comments union all
  select 'newsletter_topics', count(*) from public.newsletter_topics union all
  select 'newsletter_subscriptions', count(*) from public.newsletter_subscriptions union all
  select 'notifications', count(*) from public.notifications where id::text like '00000025-%' union all
  select 'support_calls', count(*) from public.support_calls union all
  select 'dangers', count(*) from public.dangers union all
  select 'cameras', count(*) from public.cameras union all
  select 'satellite_observations', count(*) from public.satellite_observations union all
  select 'audit_logs', count(*) from public.audit_logs where id::text like '00000030-%' union all
  select 'api_synchronizations', count(*) from public.api_synchronizations union all
  select 'chat_sessions', count(*) from public.chat_sessions union all
  select 'chat_messages', count(*) from public.chat_messages union all
  select 'knowledge_base', count(*) from public.knowledge_base union all
  select 'ai_generated_content', count(*) from public.ai_generated_content union all
  select 'accessibility_preferences', count(*) from public.accessibility_preferences union all
  select 'guide_tours', count(*) from public.guide_tours union all
  select 'guide_tour_steps', count(*) from public.guide_tour_steps union all
  select 'voice_commands', count(*) from public.voice_commands
)
select t as check_name, n as value, n >= 10 as ok from counts order by ok, t;

-- 2) Cohérence métier
select 'every service has a located building' as check_name,
       (select count(*) from public.services s left join public.buildings b on b.id = s.building_id where b.sector_id is null) as value,
       (select count(*) from public.services s left join public.buildings b on b.id = s.building_id where b.sector_id is null) = 0 as ok
union all
select 'minors have a verified adult sponsor',
       (select count(*) from public.citizens c where c.is_minor and not exists (
          select 1 from public.citizens s where s.id = c.sponsor_citizen_id and not s.is_minor and s.kyc_status = 'verified')),
       (select count(*) from public.citizens c where c.is_minor and not exists (
          select 1 from public.citizens s where s.id = c.sponsor_citizen_id and not s.is_minor and s.kyc_status = 'verified')) = 0
union all
select 'public reports are validated',
       (select count(*) from public.reports where is_public and (validated_by is null or status not in ('validated','assigned','in_progress','resolved'))),
       (select count(*) from public.reports where is_public and (validated_by is null or status not in ('validated','assigned','in_progress','resolved'))) = 0
union all
select 'closed requests have a resolution note',
       (select count(*) from public.requests where status in ('resolved','closed') and coalesce(resolution_note,'') = ''),
       (select count(*) from public.requests where status in ('resolved','closed') and coalesce(resolution_note,'') = '') = 0
union all
select 'camera/satellite evidence is sensitive',
       (select count(*) from public.report_evidence where source in ('camera','satellite') and visibility <> 'sensitive'),
       (select count(*) from public.report_evidence where source in ('camera','satellite') and visibility <> 'sensitive') = 0
union all
select 'cluster counts match reports',
       (select count(*) from public.report_clusters c where c.report_count <> (select count(*) from public.reports r where r.cluster_id = c.id)),
       (select count(*) from public.report_clusters c where c.report_count <> (select count(*) from public.reports r where r.cluster_id = c.id)) = 0
union all
select 'all 10 request statuses covered',
       (select count(distinct status) from public.requests), (select count(distinct status) from public.requests) = 10
union all
select 'all 9 report statuses covered',
       (select count(distinct status) from public.reports), (select count(distinct status) from public.reports) = 9
union all
select 'sector hex coordinates are unique',
       (select count(*) - count(distinct (hex_q, hex_r)) from public.sectors),
       (select count(*) - count(distinct (hex_q, hex_r)) from public.sectors) = 0
union all
select 'active dangers are validated and owned',
       (select count(*) from public.dangers where status = 'active' and (validated_by is null or responsible_service_id is null)),
       (select count(*) from public.dangers where status = 'active' and (validated_by is null or responsible_service_id is null)) = 0
union all
select 'each non-health service has ten facilities',
       (select count(*) from (
          select s.id from public.services s left join public.buildings b
            on b.service_id = s.id and b.id::text like '00000021-%'
          where s.id::text like '00000004-%' and s.category <> 'health'
          group by s.id having count(b.id) <> 10
        ) mismatched),
       (select count(*) from (
          select s.id from public.services s left join public.buildings b
            on b.service_id = s.id and b.id::text like '00000021-%'
          where s.id::text like '00000004-%' and s.category <> 'health'
          group by s.id having count(b.id) <> 10
        ) mismatched) = 0
union all
select 'health service has no generated facilities',
       (select count(*) from public.buildings b join public.services s on s.id = b.service_id
        where s.slug = 'emergency-medical' and b.id::text like '00000021-%'),
       (select count(*) from public.buildings b join public.services s on s.id = b.service_id
        where s.slug = 'emergency-medical' and b.id::text like '00000021-%') = 0
union all
select 'facilities have complete public and map details',
       (select count(*) from public.buildings where id::text like '00000021-%' and service_id is not null and (
         facility_type is null or nullif(address, '') is null or nullif(phone, '') is null
         or nullif(email, '') is null or jsonb_typeof(opening_hours) <> 'object'
         or accessibility = '{}'::jsonb or nullif(description, '') is null or cardinality(offerings) = 0
       )),
       (select count(*) from public.buildings where id::text like '00000021-%' and service_id is not null and (
         facility_type is null or nullif(address, '') is null or nullif(phone, '') is null
         or nullif(email, '') is null or jsonb_typeof(opening_hours) <> 'object'
         or accessibility = '{}'::jsonb or nullif(description, '') is null or cardinality(offerings) = 0
       )) = 0;

select 'health profile has owner-only RLS policy' as check_name,
       count(*) as value,
       count(*) = 1 as ok
from pg_policies
where schemaname = 'public'
  and tablename = 'citizen_health_profiles'
  and policyname = 'citizen_health_profiles_own'
  and roles = array['authenticated']::name[]
  and qual ilike '%auth.uid%'
  and with_check ilike '%auth.uid%';

-- 3) Sécurité : toute table de `public` doit avoir RLS activée (attendu : aucune ligne)
select c.relname as table_without_rls
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
