-- ============================================================================
-- Seed 20 city projects with deterministic UUIDs, votes and comments.
-- Re-runnable: stable IDs + on conflict do nothing.
-- NOTE: the current demo dataset exposes 10 seeded citizens, so per-project
-- vote counts are capped at 10 unique voters while remaining valid.
-- ============================================================================

create or replace function pg_temp.seed_uuid(seed text)
returns uuid
language sql
immutable
as $$
  select (
    substr(md5(seed), 1, 8) || '-' ||
    substr(md5(seed), 9, 4) || '-' ||
    substr(md5(seed), 13, 4) || '-' ||
    substr(md5(seed), 17, 4) || '-' ||
    substr(md5(seed), 21, 12)
  )::uuid
$$;

with service_map as (
  select slug, id
  from public.services
  where slug in (
    'citizen-relations',
    'urban-planning',
    'public-works',
    'energy-water',
    'transport-authority',
    'environment-waste',
    'education-youth',
    'emergency-medical'
  )
),
admin_map as (
  select u.email, p.id
  from public.profiles p
  join auth.users u on u.id = p.id
  where u.email in (
    'admin@novaterra.test',
    'relations.admin@novaterra.test',
    'medical.admin@novaterra.test',
    'fire.admin@novaterra.test'
  )
),
project_seed(slug, service_slug, creator_email, title, description, status, created_at) as (
  values
    ('solar-canopy-nexus', 'energy-water', 'admin@novaterra.test', 'Ombrières solaires pour la place du Nexus', 'Installer des ombrières photovoltaïques avec prises USB et bancs ombragés sur la grande place du Nexus Core afin de réduire la chaleur et produire de l''énergie locale.', 'published', timestamptz '2026-08-01 09:00:00+00'),
    ('bike-lanes-aurora', 'public-works', 'admin@novaterra.test', 'Pistes cyclables sécurisées à Aurora Heights', 'Créer un maillage continu de pistes cyclables protégées entre les terrasses résidentielles, les écoles et les arrêts de sky-pod pour encourager les trajets courts.', 'published', timestamptz '2026-08-03 10:00:00+00'),
    ('night-shuttle-vitalis', 'transport-authority', 'admin@novaterra.test', 'Navette nocturne Vitalis ⇄ Orbis', 'Tester une navette de nuit toutes les vingt minutes entre l''hôpital central, le spatioport et Nexus Core pour sécuriser les retours tardifs.', 'published', timestamptz '2026-08-05 12:00:00+00'),
    ('community-garden-lumen', 'environment-waste', 'relations.admin@novaterra.test', 'Jardin communautaire sous le dôme Lumen', 'Aménager un potager partagé avec compostage, récupération d''eau et ateliers pédagogiques pour les familles et les écoles du secteur.', 'published', timestamptz '2026-08-08 08:30:00+00'),
    ('flood-barrier-ferrum', 'public-works', 'fire.admin@novaterra.test', 'Barrière anti-crue modulaire à Ferrum Docks', 'Déployer une ligne de barrières et capteurs de niveau pour protéger les quais les plus exposés lors des pluies intenses et des ruptures de conduite.', 'published', timestamptz '2026-08-11 14:15:00+00'),
    ('wifi-public-orbis', 'transport-authority', 'admin@novaterra.test', 'Wi-Fi public gratuit au terminal Orbis', 'Étendre une couverture Wi-Fi publique stable dans le terminal et les zones d''attente afin d''améliorer l''accès aux démarches et aux informations voyageurs.', 'published', timestamptz '2026-08-14 09:20:00+00'),
    ('heat-shelters-core', 'emergency-medical', 'medical.admin@novaterra.test', 'Refuges fraîcheur pendant les pics de chaleur', 'Ouvrir des espaces climatisés avec eau, recharge et premiers secours dans les bâtiments municipaux pendant les épisodes de chaleur extrême.', 'published', timestamptz '2026-08-17 11:10:00+00'),
    ('rainwater-schools', 'education-youth', 'relations.admin@novaterra.test', 'Récupération d''eau de pluie dans les écoles', 'Installer des citernes et des systèmes d''arrosage pédagogique dans les établissements d''Academia Spire pour réduire la consommation d''eau potable.', 'published', timestamptz '2026-08-19 13:00:00+00'),
    ('telemedicine-kiosks', 'emergency-medical', 'medical.admin@novaterra.test', 'Bornes de télémédecine de quartier', 'Déployer des bornes de téléconsultation assistée dans plusieurs halls municipaux pour les questions de santé non urgentes et le suivi chronique.', 'published', timestamptz '2026-08-21 15:45:00+00'),
    ('repair-cafe-docks', 'environment-waste', 'relations.admin@novaterra.test', 'Repair café mensuel à Ferrum Docks', 'Financer un atelier mensuel de réparation d''objets, animé par des bénévoles et des techniciens, pour limiter les déchets et transmettre des compétences.', 'published', timestamptz '2026-08-24 17:10:00+00'),
    ('green-roof-cityhall', 'citizen-relations', 'relations.admin@novaterra.test', 'Toit végétalisé pour l''hôtel de ville', 'Végétaliser la toiture de l''hôtel de ville avec parcours pédagogique, rétention d''eau et îlots de biodiversité visibles depuis la place centrale.', 'published', timestamptz '2026-08-27 09:50:00+00'),
    ('lighting-school-route', 'public-works', 'admin@novaterra.test', 'Éclairage intelligent sur les trajets scolaires', 'Remplacer les lampadaires vieillissants autour d''Academia Spire par un éclairage adaptatif plus sûr et moins énergivore.', 'published', timestamptz '2026-08-30 07:45:00+00'),
    ('makerspace-youth', 'education-youth', 'relations.admin@novaterra.test', 'Makerspace jeunesse à Academia Spire', 'Créer un laboratoire ouvert de robotique légère, impression 3D et réparation numérique avec créneaux gratuits pour les adolescents.', 'draft', timestamptz '2026-09-02 10:30:00+00'),
    ('microforest-sentinel', 'environment-waste', 'relations.admin@novaterra.test', 'Micro-forêt citoyenne à Sentinel Ward', 'Planter une micro-forêt dense avec espèces locales, assises et capteurs pédagogiques pour rafraîchir les abords du quartier de sécurité.', 'draft', timestamptz '2026-09-04 16:10:00+00'),
    ('passed-bike-parking', 'transport-authority', 'admin@novaterra.test', 'Abris vélos sécurisés près des stations', 'Installer des abris fermés, éclairés et reliés à la carte de transport aux principales stations de tram et de maglev.', 'closed', timestamptz '2026-07-12 09:00:00+00'),
    ('rejected-sound-dome', 'citizen-relations', 'relations.admin@novaterra.test', 'Dôme sonore immersif sur la place civique', 'Créer une installation sonore permanente avec concerts holographiques en soirée sur la place civique du Nexus.', 'closed', timestamptz '2026-07-16 18:00:00+00'),
    ('abandoned-floating-market', 'transport-authority', 'admin@novaterra.test', 'Marché flottant hebdomadaire au spatioport', 'Lancer un marché flottant expérimental autour du terminal Orbis avec kiosques temporaires et animations culinaires.', 'closed', timestamptz '2026-07-19 12:00:00+00'),
    ('passed-shade-stops', 'transport-authority', 'admin@novaterra.test', 'Abris ombragés pour les arrêts de navette', 'Ajouter des abris ventilés, panneaux horaires et brumisateurs solaires sur les arrêts les plus fréquentés des navettes publiques.', 'closed', timestamptz '2026-07-23 08:20:00+00'),
    ('rejected-drone-fireworks', 'public-works', 'fire.admin@novaterra.test', 'Festival mensuel de drones pyrotechniques', 'Organiser chaque mois un spectacle de drones pyrotechniques visible depuis plusieurs secteurs centraux.', 'closed', timestamptz '2026-07-26 20:30:00+00'),
    ('abandoned-canal-gondolas', 'transport-authority', 'admin@novaterra.test', 'Gondoles touristiques sur le lac céleste', 'Expérimenter des gondoles touristiques silencieuses sur le lac céleste avec haltes panoramiques et billetterie dédiée.', 'closed', timestamptz '2026-07-29 14:40:00+00')
),
resolved_projects as (
  select
    pg_temp.seed_uuid('city-project:' || p.slug) as id,
    s.id as service_id,
    a.id as created_by,
    p.title,
    p.description,
    p.status,
    p.created_at
  from project_seed p
  join service_map s on s.slug = p.service_slug
  join admin_map a on a.email = p.creator_email
)
insert into public.city_projects (id, service_id, created_by, title, description, status, created_at)
select id, service_id, created_by, title, description, status, created_at
from resolved_projects
on conflict (id) do nothing;

with citizen_pool as (
  select id, row_number() over (order by created_at, id) as rn
  from public.citizens
),
vote_plan(project_slug, yes_votes, no_votes, anchor_at) as (
  values
    ('solar-canopy-nexus', 9, 1, timestamptz '2026-08-02 09:00:00+00'),
    ('bike-lanes-aurora', 6, 4, timestamptz '2026-08-04 09:00:00+00'),
    ('night-shuttle-vitalis', 5, 5, timestamptz '2026-08-06 09:00:00+00'),
    ('community-garden-lumen', 8, 2, timestamptz '2026-08-09 09:00:00+00'),
    ('flood-barrier-ferrum', 8, 2, timestamptz '2026-08-12 09:00:00+00'),
    ('wifi-public-orbis', 0, 0, timestamptz '2026-08-15 09:00:00+00'),
    ('heat-shelters-core', 10, 0, timestamptz '2026-08-18 09:00:00+00'),
    ('rainwater-schools', 7, 3, timestamptz '2026-08-20 09:00:00+00'),
    ('telemedicine-kiosks', 4, 4, timestamptz '2026-08-22 09:00:00+00'),
    ('repair-cafe-docks', 7, 3, timestamptz '2026-08-25 09:00:00+00'),
    ('green-roof-cityhall', 3, 6, timestamptz '2026-08-28 09:00:00+00'),
    ('lighting-school-route', 8, 2, timestamptz '2026-08-31 09:00:00+00'),
    ('passed-bike-parking', 8, 2, timestamptz '2026-07-13 09:00:00+00'),
    ('rejected-sound-dome', 2, 8, timestamptz '2026-07-17 09:00:00+00'),
    ('abandoned-floating-market', 4, 3, timestamptz '2026-07-20 09:00:00+00'),
    ('passed-shade-stops', 9, 1, timestamptz '2026-07-24 09:00:00+00'),
    ('rejected-drone-fireworks', 1, 9, timestamptz '2026-07-27 09:00:00+00'),
    ('abandoned-canal-gondolas', 3, 3, timestamptz '2026-07-30 09:00:00+00')
),
expanded_votes as (
  select
    v.project_slug,
    c.id as citizen_id,
    c.rn <= v.yes_votes as support,
    v.anchor_at + ((c.rn - 1) * interval '47 minutes') as created_at
  from vote_plan v
  join citizen_pool c on c.rn <= v.yes_votes + v.no_votes
)
insert into public.city_project_votes (id, project_id, citizen_id, support, created_at)
select
  pg_temp.seed_uuid('city-vote:' || e.project_slug || ':' || e.citizen_id::text),
  pg_temp.seed_uuid('city-project:' || e.project_slug),
  e.citizen_id,
  e.support,
  e.created_at
from expanded_votes e
on conflict (project_id, citizen_id) do nothing;

with author_pool as (
  select p.id, row_number() over (order by p.display_name, p.id) as rn
  from public.profiles p
  join auth.users u on u.id = p.id
  where u.email in (
    'admin@novaterra.test',
    'relations.admin@novaterra.test',
    'medical.admin@novaterra.test',
    'fire.admin@novaterra.test',
    'agent@novaterra.test',
    'elio@novaterra.test',
    'jade@novaterra.test',
    'rowan@novaterra.test',
    'pip@novaterra.test'
  )
),
comment_seed(project_slug, author_rn, body, created_at) as (
  values
    ('solar-canopy-nexus', 6, 'Très bon projet : la place est étouffante à midi, l''ombre et les prises seraient vraiment utiles.', timestamptz '2026-08-02 11:00:00+00'),
    ('solar-canopy-nexus', 7, 'Est-ce que l''éclairage de nuit sera intégré dans la structure solaire ?', timestamptz '2026-08-02 13:15:00+00'),
    ('solar-canopy-nexus', 2, 'Le service peut intégrer des capteurs météo pour suivre la production et la température.', timestamptz '2026-08-03 09:40:00+00'),
    ('bike-lanes-aurora', 6, 'Je soutiens, mais il faut absolument séparer les vélos des sky-pods aux croisements.', timestamptz '2026-08-04 08:10:00+00'),
    ('bike-lanes-aurora', 8, 'Le tracé proposé semble ignorer les pentes les plus fortes du quartier.', timestamptz '2026-08-04 12:25:00+00'),
    ('bike-lanes-aurora', 5, 'Merci de préciser si les fauteuils roulants pourront aussi profiter des nouveaux cheminements.', timestamptz '2026-08-04 15:35:00+00'),
    ('night-shuttle-vitalis', 9, 'Très utile pour les familles qui sortent de l''hôpital tard le soir.', timestamptz '2026-08-06 10:00:00+00'),
    ('night-shuttle-vitalis', 7, 'Je crains des bus presque vides hors week-end, avez-vous des estimations ?', timestamptz '2026-08-06 12:10:00+00'),
    ('night-shuttle-vitalis', 3, 'La coordination avec la sécurité du terminal devra être prévue dès le départ.', timestamptz '2026-08-06 17:30:00+00'),
    ('community-garden-lumen', 6, 'Excellent pour reconnecter les enfants au vivant malgré l''environnement très minéral.', timestamptz '2026-08-09 08:50:00+00'),
    ('community-garden-lumen', 7, 'Peut-on réserver des parcelles pour les associations de quartier ?', timestamptz '2026-08-09 10:20:00+00'),
    ('community-garden-lumen', 8, 'Attention à l''arrosage : il faut une vraie récupération d''eau et pas un simple affichage.', timestamptz '2026-08-09 16:45:00+00'),
    ('flood-barrier-ferrum', 6, 'Après les dernières pluies, c''est clairement prioritaire pour les docks.', timestamptz '2026-08-12 07:55:00+00'),
    ('flood-barrier-ferrum', 3, 'Les capteurs doivent être compatibles avec les alarmes existantes des pompiers.', timestamptz '2026-08-12 09:15:00+00'),
    ('flood-barrier-ferrum', 8, 'Merci de publier aussi le coût d''entretien annuel des modules.', timestamptz '2026-08-12 13:05:00+00'),
    ('wifi-public-orbis', 6, 'Bonne idée, surtout pour remplir un formulaire ou télécharger un billet au dernier moment.', timestamptz '2026-08-15 10:35:00+00'),
    ('wifi-public-orbis', 9, 'Je n''ai pas encore d''avis : quel niveau de protection des données est prévu ?', timestamptz '2026-08-15 14:50:00+00'),
    ('heat-shelters-core', 4, 'En période de chaleur, il faut aussi prévoir du personnel formé au repérage des malaises.', timestamptz '2026-08-18 09:05:00+00'),
    ('heat-shelters-core', 6, 'Projet indispensable, surtout pour les personnes âgées qui patientent en centre-ville.', timestamptz '2026-08-18 10:45:00+00'),
    ('heat-shelters-core', 7, 'Peut-on afficher en temps réel les refuges ouverts dans l''application ?', timestamptz '2026-08-18 16:20:00+00'),
    ('rainwater-schools', 5, 'Très bon support pédagogique si les élèves peuvent suivre les volumes récupérés.', timestamptz '2026-08-20 08:40:00+00'),
    ('rainwater-schools', 8, 'Je soutiens, mais attention à l''entretien des cuves et aux moustiques.', timestamptz '2026-08-20 11:55:00+00'),
    ('telemedicine-kiosks', 6, 'Pratique pour les conseils rapides, mais il faudra garantir la confidentialité des échanges.', timestamptz '2026-08-22 09:25:00+00'),
    ('telemedicine-kiosks', 4, 'Les bornes devraient être accompagnées d''une assistance humaine sur certains créneaux.', timestamptz '2026-08-22 12:30:00+00'),
    ('telemedicine-kiosks', 7, 'Bonne solution pour éviter un déplacement complet quand on a juste besoin d''un suivi.', timestamptz '2026-08-22 17:00:00+00'),
    ('telemedicine-kiosks', 8, 'Je suis partagée : utile, mais pas pour tous les publics.', timestamptz '2026-08-22 19:10:00+00'),
    ('repair-cafe-docks', 6, 'Super initiative, cela manque vraiment dans ce secteur industriel.', timestamptz '2026-08-25 08:00:00+00'),
    ('repair-cafe-docks', 8, 'Pensez à un créneau le dimanche pour les personnes qui travaillent en semaine.', timestamptz '2026-08-25 14:35:00+00'),
    ('green-roof-cityhall', 9, 'Le rendu sera joli, mais je préfère des arbres au sol plutôt qu''un toit vitrine.', timestamptz '2026-08-28 10:30:00+00'),
    ('green-roof-cityhall', 6, 'Si le toit retient l''eau et réduit la chaleur, je suis pour.', timestamptz '2026-08-28 12:10:00+00'),
    ('green-roof-cityhall', 7, 'Quel sera l''accès réel du public, ou seulement des visites guidées ?', timestamptz '2026-08-28 18:25:00+00'),
    ('lighting-school-route', 6, 'Le parcours est sombre l''hiver, merci d''en faire une priorité.', timestamptz '2026-08-31 07:15:00+00'),
    ('lighting-school-route', 5, 'Il faut aussi limiter l''éblouissement pour les logements voisins.', timestamptz '2026-08-31 10:45:00+00'),
    ('passed-bike-parking', 7, 'Très content que ce projet soit allé au bout, le stationnement manque près des stations.', timestamptz '2026-07-14 09:05:00+00'),
    ('passed-bike-parking', 2, 'Le service demandera des points d''attache compatibles avec les vélos cargos.', timestamptz '2026-07-14 15:40:00+00'),
    ('rejected-sound-dome', 8, 'Le bruit quotidien sur la place serait insupportable pour les riverains.', timestamptz '2026-07-17 11:00:00+00'),
    ('rejected-sound-dome', 6, 'Belle idée artistique, mais pas à cet emplacement.', timestamptz '2026-07-17 18:20:00+00'),
    ('abandoned-floating-market', 9, 'Le concept est séduisant, mais la logistique sur l''eau semblait sous-estimée.', timestamptz '2026-07-20 09:35:00+00'),
    ('abandoned-floating-market', 7, 'J''aurais aimé un pilote plus petit avant de tout abandonner.', timestamptz '2026-07-20 14:10:00+00'),
    ('passed-shade-stops', 6, 'Très attendu, surtout sur les lignes exposées du milieu de journée.', timestamptz '2026-07-24 08:45:00+00'),
    ('passed-shade-stops', 5, 'Ajoutez aussi des informations en gros caractères et des assises adaptées.', timestamptz '2026-07-24 11:25:00+00'),
    ('rejected-drone-fireworks', 3, 'Trop de risques et de nuisances sonores pour un événement mensuel.', timestamptz '2026-07-27 09:50:00+00'),
    ('rejected-drone-fireworks', 8, 'Je comprends le refus : on a besoin de calme et de sécurité, pas d''explosifs volants.', timestamptz '2026-07-27 21:05:00+00'),
    ('abandoned-canal-gondolas', 6, 'Le projet était poétique, mais sans liaison utile au quotidien cela semblait fragile.', timestamptz '2026-07-30 10:40:00+00'),
    ('abandoned-canal-gondolas', 7, 'Peut-être à relancer un jour sous forme saisonnière et plus sobre.', timestamptz '2026-07-30 16:55:00+00')
)
insert into public.city_project_comments (id, project_id, author_id, body, created_at)
select
  pg_temp.seed_uuid('city-comment:' || row_number() over (order by c.project_slug, c.created_at, c.body)),
  pg_temp.seed_uuid('city-project:' || c.project_slug),
  a.id,
  c.body,
  c.created_at
from comment_seed c
join author_pool a on a.rn = c.author_rn
on conflict (id) do nothing;

-- Verification example:
-- select p.title, p.status,
--        count(v.*) filter (where v.support) as yes_votes,
--        count(v.*) filter (where not v.support) as no_votes,
--        count(c.*) as comment_count
-- from public.city_projects p
-- left join public.city_project_votes v on v.project_id = p.id
-- left join public.city_project_comments c on c.project_id = p.id
-- group by p.id, p.title, p.status
-- order by p.created_at;
