-- ============================================================================
-- NOVA TERRA — seed_knowledge_base.sql
-- Peuple knowledge_base à partir des données de seed (07a, 07b, 07c).
-- Allowed entity_type values: 'service' | 'news' | 'danger' | 'building' | 'sector' | 'faq'
-- Idempotent : on conflict (id) do update uniquement si content_hash change.
-- UUID prefix legend (all valid hex):
--   a1 = faq/navigation   a2 = sector   a3 = faq/department
--   a4 = service          a5 = building  a6 = faq/transport
--   a7 = news             a8 = danger
-- ============================================================================

create or replace function pg_temp.nid(t int, n int) returns uuid language sql immutable as $$
  select (lpad(t::text, 8, '0') || '-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid
$$;

-- ---------------------------------------------------------------------------
-- 1. FAQ — Navigation & aide  (entity_type = 'faq', entity_id = NULL)
-- ---------------------------------------------------------------------------
insert into public.knowledge_base (id, entity_type, entity_id, title, content, url, version, is_published, content_hash) values

  ('a1000001-0000-4000-8000-000000000001', 'faq', null,
   'Plan du site Nova Terra',
   'Pages principales : Accueil (/), Services (/services), Actualités (/news), Carte interactive (/map), Dangers et alertes (/dangers), Espace citoyen (/app), Assistant virtuel (/app/assistant), Signalements (/app/reports), Demandes (/app/requests), Profil (/app/profile), Accessibilité (/app/accessibility), Administration (/admin).',
   '/', 1, true, md5('faq sitemap v1')),

  ('a1000001-0000-4000-8000-000000000002', 'faq', null,
   'Inscription et connexion',
   'Pour créer un compte : cliquez sur « S''inscrire » en haut à droite, renseignez votre e-mail et un mot de passe. Après inscription, vérifiez votre identité (CIN fictif) pour accéder aux signalements. Connexion : /connexion. Mot de passe oublié : /mot-de-passe-oublie.',
   '/connexion', 1, true, md5('faq auth v1')),

  ('a1000001-0000-4000-8000-000000000003', 'faq', null,
   'Comment déposer un signalement',
   'Prérequis : identité vérifiée (KYC). Étapes : 1. Allez sur /app/reports/new. 2. Choisissez le secteur et le bâtiment. 3. Décrivez le problème et joignez une photo. 4. Vous pouvez aussi dicter votre signalement à voix haute. 5. Suivez le numéro NT-REP-XXXX dans votre espace.',
   '/app/reports/new', 1, true, md5('faq report v1')),

  ('a1000001-0000-4000-8000-000000000004', 'faq', null,
   'Comment contacter un service',
   'Allez sur /services, choisissez le service, cliquez sur « Envoyer une demande ». Vous recevrez un numéro de suivi NT-REQ-XXXX. Vous pouvez aussi appeler directement le numéro affiché sur la fiche service.',
   '/services', 1, true, md5('faq contact service v1')),

  ('a1000001-0000-4000-8000-000000000005', 'faq', null,
   'Numéros d''urgence Nova Terra',
   'Police : +999 112 (Nova Police, 24 h/24). Pompiers et sauvetage : +999 118 (Fire & Rescue, 24 h/24). Urgences médicales : +999 115 (Emergency Medical, 24 h/24). Relations citoyennes : +999 200 0001 (lun-ven 08:00-17:00, sam 09:00-12:00).',
   '/services', 1, true, md5('faq urgences v1')),

  ('a1000001-0000-4000-8000-000000000006', 'faq', null,
   'Carte interactive de Nova Terra',
   'La carte (/map) affiche les 10 secteurs hexagonaux, les bâtiments publics, les lignes de transport (tram T1, maglev M1, sky-pods, navettes, ferry) et les alertes actives. Cliquez sur un secteur pour voir ses services et bâtiments.',
   '/map', 1, true, md5('faq map v1')),

  ('a1000001-0000-4000-8000-000000000007', 'faq', null,
   'Vérification d''identité (KYC)',
   'Pour déposer un signalement ou accéder à certains services, votre identité doit être vérifiée. Allez dans /app/profile, section « Vérification », et soumettez une photo de votre CIN fictif. Le résultat est communiqué sous 24 h.',
   '/app/profile', 1, true, md5('faq kyc v1')),

  ('a1000001-0000-4000-8000-000000000008', 'faq', null,
   'Transports publics de Nova Terra',
   'Lignes disponibles : Tram T1 (Nexus ⇄ Orbis, 120 places, actif), Maglev M1 (Orbis ⇄ Cipher, 400 places, actif), Sky-pod Ligne P Aurora (6 places, actif), Sky-pod Ligne P Academia (6 places, en attente), Navette Vitalis ⇄ Nexus (30 places, active), Drone-taxi à la demande (2 places, actif), Ferry du lac céleste (80 places, actif). Consultez la carte /map pour les itinéraires.',
   '/map', 1, true, md5('faq transports v1')),

  ('a1000001-0000-4000-8000-000000000009', 'faq', null,
   'Points de réputation',
   'Les habitants vérifiés peuvent s''attribuer des points de réputation. Ces points reflètent la fiabilité d''une personne et ne remplacent jamais la validation d''un administrateur. Niveaux : newcomer (0-9), regular (10-49), trusted (50-99), guardian (100+). Consultez /news/points-de-reputation-explications.',
   '/news/points-de-reputation-explications', 1, true, md5('faq reputation v1')),

  ('a1000001-0000-4000-8000-000000000010', 'faq', null,
   'Accessibilité du portail',
   'Le portail propose : contraste élevé, taille du texte ajustable, assistance vocale, sous-titres, alertes visuelles. Réglez vos préférences dans /app/accessibility. L''assistant répond aussi à voix haute. Commandes vocales disponibles : « accueil », « services », « carte », « signaler un problème », « aide ».',
   '/app/accessibility', 1, true, md5('faq accessibility v1')),

  ('a1000001-0000-4000-8000-000000000011', 'faq', null,
   'Départements de Nova Terra',
   'Les 10 départements : Administration (ADM) — relations citoyennes, état civil, urbanisme. Public Safety (SAF) — police, pompiers, protection civile. Health (HEA) — urgences médicales, hôpitaux. Infrastructure (INF) — voirie, bâtiments publics. Energy & Water (ENE) — réseau énergétique, eau. Mobility (MOB) — transports publics. Environment (ENV) — déchets, qualité de l''air. Education (EDU) — écoles, jeunesse. Culture & Leisure (CUL) — événements, lieux culturels. Digital & Telecom (DIG) — réseaux, données.',
   '/services', 1, true, md5('faq departments v1')),

  ('a1000001-0000-4000-8000-000000000012', 'faq', null,
   'Qui peut déposer un signalement ?',
   'Seuls les habitants dont l''identité (CIN fictif) est vérifiée (statut KYC = verified) peuvent déposer un signalement. Tous les habitants peuvent consulter les informations publiques, les actualités et les alertes.',
   '/app/reports/new', 1, true, md5('faq who can report v1'))

on conflict (id) do update set
  content      = excluded.content,
  is_published = excluded.is_published,
  version      = public.knowledge_base.version + case when public.knowledge_base.content_hash <> excluded.content_hash then 1 else 0 end,
  content_hash = excluded.content_hash,
  updated_at   = now()
where public.knowledge_base.content_hash <> excluded.content_hash;

-- ---------------------------------------------------------------------------
-- 2. SECTORS  (entity_type = 'sector')
-- ---------------------------------------------------------------------------
insert into public.knowledge_base (id, entity_type, entity_id, title, content, url, version, is_published, content_hash)
select
  ('a2000001-0000-4000-8000-' || lpad(row_number() over (order by s.code)::text, 12, '0'))::uuid,
  'sector',
  s.id,
  s.name,
  s.name || ' (' || s.code || ') — ' || coalesce(s.description, '') ||
    ' Niveau d''activité : ' || s.activity_level || '/100.' ||
    ' Coordonnées : x=' || s.x || ', y=' || s.y || '.',
  '/map',
  1, true,
  md5(s.name || '|' || coalesce(s.description,'') || s.activity_level::text)
from public.sectors s
on conflict (id) do update set
  content      = excluded.content,
  is_published = excluded.is_published,
  version      = public.knowledge_base.version + case when public.knowledge_base.content_hash <> excluded.content_hash then 1 else 0 end,
  content_hash = excluded.content_hash,
  updated_at   = now()
where public.knowledge_base.content_hash <> excluded.content_hash;

-- ---------------------------------------------------------------------------
-- 3. SERVICES  (entity_type = 'service', published + non-hidden)
-- ---------------------------------------------------------------------------
insert into public.knowledge_base (id, entity_type, entity_id, title, content, url, version, is_published, content_hash)
select
  ('a4000001-0000-4000-8000-' || lpad(row_number() over (order by s.name)::text, 12, '0'))::uuid,
  'service',
  s.id,
  s.name,
  trim(both ' ' from
    coalesce(s.description, '') ||
    ' Catégorie : ' || s.category ||
    coalesce(' Adresse : ' || s.address, '') ||
    coalesce(' Téléphone : ' || s.phone, '') ||
    coalesce(' E-mail : ' || s.email, '') ||
    coalesce(' Horaires : ' || (select string_agg(k || ' ' || v, ', ') from jsonb_each_text(s.opening_hours) x(k,v)), '') ||
    coalesce(' Documents nécessaires : ' || nullif(array_to_string(s.required_documents, ', '), ''), '') ||
    coalesce(' Étapes : ' || (select string_agg((p->>'step') || '. ' || (p->>'text'), ' ') from jsonb_array_elements(s.procedures) p), '') ||
    case when s.status <> 'open' then ' (service actuellement ' || s.status::text || ')' else '' end ||
    case when s.is_emergency then ' URGENCE : disponible 24 h/24.' else '' end
  ),
  '/services/' || s.slug,
  1, true,
  md5(s.name || '|' || coalesce(s.description,'') || s.status::text)
from public.services s
where s.published_at is not null and s.status <> 'hidden'
on conflict (id) do update set
  content      = excluded.content,
  is_published = excluded.is_published,
  version      = public.knowledge_base.version + case when public.knowledge_base.content_hash <> excluded.content_hash then 1 else 0 end,
  content_hash = excluded.content_hash,
  updated_at   = now()
where public.knowledge_base.content_hash <> excluded.content_hash;

-- ---------------------------------------------------------------------------
-- 4. BUILDINGS  (entity_type = 'building', main buildings only)
-- ---------------------------------------------------------------------------
insert into public.knowledge_base (id, entity_type, entity_id, title, content, url, version, is_published, content_hash)
select
  ('a5000001-0000-4000-8000-' || lpad(row_number() over (order by b.name)::text, 12, '0'))::uuid,
  'building',
  b.id,
  b.name,
  trim(both ' ' from
    b.name || ' — ' || b.type::text ||
    coalesce(' Adresse : ' || b.address, '') ||
    coalesce(' Téléphone : ' || b.phone, '') ||
    coalesce(' Horaires : ' || (select string_agg(k || ' ' || v, ', ') from jsonb_each_text(b.opening_hours) x(k,v)), '') ||
    ' Statut : ' || b.status::text || '.' ||
    coalesce(' ' || b.description, '')
  ),
  '/map',
  1, true,
  md5(b.name || '|' || b.status::text || coalesce(b.description,''))
from public.buildings b
where b.is_fictional = false
on conflict (id) do update set
  content      = excluded.content,
  is_published = excluded.is_published,
  version      = public.knowledge_base.version + case when public.knowledge_base.content_hash <> excluded.content_hash then 1 else 0 end,
  content_hash = excluded.content_hash,
  updated_at   = now()
where public.knowledge_base.content_hash <> excluded.content_hash;

-- ---------------------------------------------------------------------------
-- 5. NEWS  (entity_type = 'news', published + not expired)
-- ---------------------------------------------------------------------------
insert into public.knowledge_base (id, entity_type, entity_id, title, content, url, version, is_published, content_hash)
select
  ('a7000001-0000-4000-8000-' || lpad(row_number() over (order by n.published_at desc)::text, 12, '0'))::uuid,
  'news',
  n.id,
  n.title,
  n.summary || ' ' || n.body,
  '/news/' || n.slug,
  1, true,
  md5(n.title || '|' || n.summary || n.body)
from public.news n
where n.status = 'published'
  and n.deleted_at is null
  and (n.valid_until is null or n.valid_until >= now())
on conflict (id) do update set
  content      = excluded.content,
  is_published = excluded.is_published,
  version      = public.knowledge_base.version + case when public.knowledge_base.content_hash <> excluded.content_hash then 1 else 0 end,
  content_hash = excluded.content_hash,
  updated_at   = now()
where public.knowledge_base.content_hash <> excluded.content_hash;

-- ---------------------------------------------------------------------------
-- 6. DANGERS  (entity_type = 'danger', active only)
-- ---------------------------------------------------------------------------
insert into public.knowledge_base (id, entity_type, entity_id, title, content, url, version, is_published, content_hash)
select
  ('a8000001-0000-4000-8000-' || lpad(row_number() over (order by d.severity desc, d.valid_from desc)::text, 12, '0'))::uuid,
  'danger',
  d.id,
  d.title,
  trim(both ' ' from
    d.summary ||
    ' Sévérité : ' || d.severity::text || '.' ||
    case when array_length(d.recommended_actions, 1) > 0
      then ' À faire : ' || array_to_string(d.recommended_actions, '; ') || '.'
      else '' end ||
    case when array_length(d.forbidden_actions, 1) > 0
      then ' À ne pas faire : ' || array_to_string(d.forbidden_actions, '; ') || '.'
      else '' end ||
    coalesce(' Protocole : ' || (
      select string_agg((p->>'order') || '. ' || (p->>'title'), ' ' order by (p->>'order')::int)
      from jsonb_array_elements(d.protocol_steps) p
    ), '') ||
    case when d.is_fictional_alert then ' (Alerte fictive — exercice de simulation.)' else '' end
  ),
  '/dangers/' || d.slug,
  1, true,
  md5(d.title || '|' || d.summary || d.severity::text)
from public.dangers d
where d.status = 'active'
on conflict (id) do update set
  content      = excluded.content,
  is_published = excluded.is_published,
  version      = public.knowledge_base.version + case when public.knowledge_base.content_hash <> excluded.content_hash then 1 else 0 end,
  content_hash = excluded.content_hash,
  updated_at   = now()
where public.knowledge_base.content_hash <> excluded.content_hash;
