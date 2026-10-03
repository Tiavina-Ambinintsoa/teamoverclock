-- ============================================================================
-- NOVA TERRA — 01 : extensions + enums
-- Source de vérité : docs/PLAN.md §3.2. Relançable sans risque.
-- Ordre d'import : 01 → 02 → 03 → 04 → 05 → 06 → 07 → 99 (voir docs/PLAN.md §3.8)
-- ============================================================================

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- Crée chaque enum seulement s'il n'existe pas (CREATE TYPE n'a pas IF NOT EXISTS).
do $$
declare
  e record;
begin
  for e in
    select * from (values
      ('user_role',          array['citizen','agent','service_admin','general_admin','system']),
      ('account_status',     array['pending','active','suspended','disabled']),
      ('kyc_status',         array['none','pending','verified','rejected']),
      ('priority_level',     array['low','medium','high','critical']),
      ('request_status',     array['new','received','to_qualify','assigned','in_progress','waiting_info','resolved','closed','rejected','cancelled']),
      ('report_status',      array['draft','received','to_verify','validated','rejected','assigned','in_progress','resolved','archived']),
      ('report_source',      array['citizen','agent','chatbot','camera','satellite','external_api','import']),
      ('report_category',    array['infrastructure','safety','health','environment','transport','noise','other']),
      ('evidence_source',    array['citizen','camera','satellite','agent','api']),
      ('validation_status',  array['pending','validated','rejected']),
      ('visibility_level',   array['public','internal','confidential','sensitive']),
      ('service_status',     array['open','temporarily_closed','suspended','hidden']),
      ('building_type',      array['administrative','residential','hospital','school','security','industrial','energy','telecom','public_place','transport_hub']),
      ('building_status',    array['operational','temporarily_closed','under_maintenance','restricted']),
      -- aethelon_apex = voiture, vortex_phantom = moto (véhicules personnels fictifs)
      ('transport_type',     array['hover_tram','maglev','sky_pod','shuttle','drone_taxi','cargo_drone','personal_hoverbike','ferry','aethelon_apex','vortex_phantom']),
      ('transport_status',   array['active','idle','maintenance','out_of_service']),
      ('danger_severity',    array['info','low','moderate','high','extreme']),
      ('danger_status',      array['draft','active','archived']),
      ('news_importance',    array['normal','important','urgent']),
      ('news_status',        array['draft','pending_review','published','archived']),
      ('sync_status',        array['running','success','partial','failed']),
      ('ui_theme',           array['default','high_contrast_light','high_contrast_dark','yellow_on_black']),
      ('accessibility_need', array['low_vision','hard_of_hearing']),
      ('voice_action_type',  array['navigate','click','read','fill','submit','help','stop','open_tour']),
      ('notification_type',  array['request_update','report_update','news','danger_alert','system','newsletter','reputation'])
    ) as t(name, vals)
  loop
    if not exists (
      select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public' and t.typname = e.name
    ) then
      execute format('create type public.%I as enum (%s)', e.name,
        (select string_agg(quote_literal(v), ',') from unnest(e.vals) as v));
    end if;
  end loop;
end
$$;
