-- ============================================================================
-- NOVA TERRA — 00 : remise à zéro des DONNÉES FICTIVES (développement uniquement)
-- Vide uniquement les tables Nova Terra et supprime les 10 comptes de démo.
-- NE TOUCHE PAS : profiles / notifications / contact_messages / ai_usage d'autres utilisateurs.
-- Après ce script, relancez 06 puis 07a, 07b, 07c.
-- ============================================================================

do $$
begin
  if current_setting('app.allow_nova_reset', true) is distinct from 'yes' then
    raise exception 'Reset bloqué. Exécutez d''abord : set app.allow_nova_reset = ''yes'';';
  end if;
end
$$;

-- profiles référence services : on détache d'abord (TRUNCATE ... CASCADE viderait profiles)
update public.profiles set primary_service_id = null where primary_service_id is not null;

truncate table
  public.voice_commands, public.guide_tour_steps, public.guide_tours, public.accessibility_preferences,
  public.ai_generated_content, public.knowledge_base, public.chat_messages, public.chat_sessions,
  public.api_synchronizations, public.audit_logs, public.satellite_observations, public.cameras, public.dangers,
  public.support_calls, public.newsletter_subscriptions, public.newsletter_topics, public.news_comments, public.news,
  public.report_status_history, public.report_evidence, public.reports, public.report_clusters,
  public.request_status_history, public.request_comments, public.requests,
  public.reputation_votes, public.citizen_verifications, public.role_permissions, public.permissions,
  public.service_members, public.citizens, public.transports, public.service_relations, public.services,
  public.buildings, public.departments, public.sectors
restart identity;

delete from public.notifications where id::text like '00000025-%';
delete from public.contact_messages where id::text like '00000040-%';
delete from auth.users where id::text like '00000007-%';  -- cascade : identities, profiles, ai_usage
