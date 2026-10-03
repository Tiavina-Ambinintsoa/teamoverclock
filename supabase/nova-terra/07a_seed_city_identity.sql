-- ============================================================================
-- NOVA TERRA — 07a : données fictives — ville, services, identités (tables 1-13)
-- DONNÉES FICTIVES. 10 lignes par table. UUID stables : pg_temp.nid(<n° table>, <n° ligne>).
-- Prérequis : 01 → 06. Relançable (on conflict do nothing).
-- ============================================================================

create or replace function pg_temp.nid(t int, n int) returns uuid language sql immutable as $$
  select (lpad(t::text, 8, '0') || '-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid
$$;

alter table public.profiles disable trigger audit_row_change;
alter table public.citizens disable trigger audit_row_change;
alter table public.service_members disable trigger audit_row_change;
alter table public.role_permissions disable trigger audit_row_change;

-- 1. sectors — grille hexagonale axiale (taille 100) : x = 100·√3·(q + r/2), y = 150·r
insert into public.sectors (id, code, name, description, hex_q, hex_r, x, y, color, activity_level) values
  (pg_temp.nid(1,1),  'S-01', 'Nexus Core',        'Cœur administratif de Nova Terra : mairie, relations citoyennes, urbanisme.',    0,  0,    0,    0, '#6366f1', 85),
  (pg_temp.nid(1,2),  'S-02', 'Aurora Heights',    'Quartier résidentiel en terrasses suspendues, vue sur le lac céleste.',          1,  0,  173.2,  0, '#f59e0b', 70),
  (pg_temp.nid(1,3),  'S-03', 'Helios Grid',       'Secteur énergétique : fusion, stockage, distribution du réseau.',                1, -1,   86.6, -150, '#eab308', 60),
  (pg_temp.nid(1,4),  'S-04', 'Ferrum Docks',      'Zone industrielle, logistique de fret et ateliers municipaux.',                  0, -1,  -86.6, -150, '#78716c', 55),
  (pg_temp.nid(1,5),  'S-05', 'Lumen Gardens',     'Parcs, dômes botaniques et lieux culturels.',                                    -1, 0, -173.2,  0, '#22c55e', 40),
  (pg_temp.nid(1,6),  'S-06', 'Vitalis District',  'Hôpitaux, centres de soins et recherche médicale.',                              -1, 1,  -86.6, 150, '#ef4444', 65),
  (pg_temp.nid(1,7),  'S-07', 'Orbis Port',        'Spatioport, hub de transports et navettes inter-secteurs.',                       0, 1,   86.6, 150, '#0ea5e9', 90),
  (pg_temp.nid(1,8),  'S-08', 'Cipher Quarter',    'Télécoms, centres de données et réseaux de communication.',                       2, -1, 259.8, -150, '#8b5cf6', 75),
  (pg_temp.nid(1,9),  'S-09', 'Sentinel Ward',     'Sécurité : police, protection civile et centre de commandement.',                -2, 1, -259.8, 150, '#334155', 50),
  (pg_temp.nid(1,10), 'S-10', 'Academia Spire',    'Écoles, université et laboratoires de recherche.',                                 1, 1,  259.8, 150, '#14b8a6', 58)
on conflict (id) do nothing;

-- 2. departments
insert into public.departments (id, code, name, description, head_title) values
  (pg_temp.nid(2,1),  'ADM', 'Administration',      'Relations citoyennes, état civil, urbanisme.',          'Directrice générale'),
  (pg_temp.nid(2,2),  'SAF', 'Public Safety',       'Police, pompiers et protection civile.',                'Commandant en chef'),
  (pg_temp.nid(2,3),  'HEA', 'Health',              'Urgences médicales, hôpitaux et prévention.',           'Médecin-chef'),
  (pg_temp.nid(2,4),  'INF', 'Infrastructure',      'Voirie, bâtiments publics et aménagement.',             'Ingénieur en chef'),
  (pg_temp.nid(2,5),  'ENE', 'Energy & Water',      'Réseau énergétique, eau et recyclage.',                 'Directeur de l''énergie'),
  (pg_temp.nid(2,6),  'MOB', 'Mobility',            'Transports publics, navettes et trafic.',               'Directrice de la mobilité'),
  (pg_temp.nid(2,7),  'ENV', 'Environment',         'Déchets, qualité de l''air, espaces verts.',            'Responsable environnement'),
  (pg_temp.nid(2,8),  'EDU', 'Education',           'Écoles, jeunesse et formation.',                        'Recteur'),
  (pg_temp.nid(2,9),  'CUL', 'Culture & Leisure',   'Événements, lieux culturels et loisirs.',               'Conservatrice'),
  (pg_temp.nid(2,10), 'DIG', 'Digital & Telecom',   'Réseaux de communication, données et services numériques.', 'Directeur du numérique')
on conflict (id) do nothing;

-- 3. buildings (lat/lng fictifs dérivés de x,y)
insert into public.buildings (id, name, type, sector_id, x, y, lat, lng, address, opening_hours, accessibility, status, description)
select pg_temp.nid(3, b.n), b.name, b.type::public.building_type, pg_temp.nid(1, b.sector), s.x + b.dx, s.y + b.dy,
       round(-18.9 - (s.y + b.dy) / 10000.0, 6), round(47.5 + (s.x + b.dx) / 10000.0, 6),
       b.address, b.hours::jsonb, b.access::jsonb, b.status::public.building_status, b.descr
from (values
  (1,  'Nova Terra City Hall',        'administrative', 1,  10, -10, '1 Place du Nexus, S-01',        '{"mon-fri":"08:00-17:00","sat":"09:00-12:00"}', '{"step_free":true,"hearing_loop":true,"braille":true}', 'operational',        'Hôtel de ville et guichet unique des démarches.'),
  (2,  'Aurora Residence Tower',      'residential',    2, -10,  10, '12 Terrasse d''Aurore, S-02',   '{"always":"24/7"}',                              '{"step_free":true}',                                  'operational',        'Tour résidentielle de 80 étages.'),
  (3,  'Helios Fusion Plant',         'energy',         3,   5,   5, 'Anneau Helios, S-03',           '{"mon-sun":"06:00-22:00"}',                      '{"step_free":true}',                                  'under_maintenance',  'Centrale à fusion principale, maintenance programmée.'),
  (4,  'Ferrum Works & Rescue Depot', 'industrial',     4,  -8,   8, 'Quai 4, Ferrum Docks, S-04',    '{"always":"24/7"}',                              '{"step_free":true}',                                  'operational',        'Dépôt des travaux publics et caserne des pompiers.'),
  (5,  'Lumen Botanical Dome',        'public_place',   5,   0,   0, 'Dôme Lumen, S-05',              '{"tue-sun":"10:00-19:00"}',                      '{"step_free":true,"audio_guides":true}',              'temporarily_closed', 'Dôme botanique, fermé pour réparation de la verrière.'),
  (6,  'Vitalis Central Hospital',    'hospital',       6,   0,  -5, '3 Avenue Vitalis, S-06',        '{"always":"24/7"}',                              '{"step_free":true,"hearing_loop":true}',              'operational',        'Hôpital central et service des urgences.'),
  (7,  'Orbis Spaceport Terminal',    'transport_hub',  7,  12,   0, 'Terminal Orbis, S-07',          '{"always":"24/7"}',                              '{"step_free":true,"braille":true}',                   'operational',        'Spatioport, gare maglev et station de drones-taxis.'),
  (8,  'Cipher Data Citadel',         'telecom',        8,   0,   0, 'Citadelle Cipher, S-08',        '{"always":"24/7"}',                              '{"step_free":false}',                                 'restricted',         'Centre de données de la ville (accès restreint).'),
  (9,  'Sentinel Police HQ',          'security',       9,   6,  -6, 'Place Sentinel, S-09',          '{"always":"24/7"}',                              '{"step_free":true}',                                  'operational',        'Quartier général de la police de Nova Terra.'),
  (10, 'Academia Spire University',   'school',         10, -6,   6, 'Flèche Academia, S-10',        '{"mon-fri":"07:30-19:00"}',                      '{"step_free":true,"braille":true}',                   'operational',        'Université, lycée et laboratoires.')
) as b(n, name, type, sector, dx, dy, address, hours, access, status, descr)
join public.sectors s on s.id = pg_temp.nid(1, b.sector)
on conflict (id) do nothing;

-- 4. services (slugs utilisés par le routage automatique des signalements)
insert into public.services (id, department_id, building_id, name, slug, category, description, address, phone, email,
  opening_hours, closing_days, languages, procedures, required_documents, fees, default_sla_hours, status, published_at, is_emergency)
values
  (pg_temp.nid(4,1),  pg_temp.nid(2,1),  pg_temp.nid(3,1),  'Citizen Relations Office', 'citizen-relations', 'administration', 'Guichet unique : questions, démarches et orientation vers les services.', '1 Place du Nexus, S-01', '+999 200 0001', 'relations@novaterra.test', '{"mon-fri":"08:00-17:00","sat":"09:00-12:00"}', array['sunday'], array['fr','en'], '[{"step":1,"text":"Décrivez votre demande"},{"step":2,"text":"Joignez vos documents"},{"step":3,"text":"Suivez le numéro de dossier"}]', array['Pièce d''identité (CIN)'], 'Gratuit', 48, 'open', now() - interval '60 days', false),
  (pg_temp.nid(4,2),  pg_temp.nid(2,2),  pg_temp.nid(3,9),  'Nova Police',              'nova-police',       'security',       'Sécurité publique, plaintes et signalements de sécurité.',                '6 Place Sentinel, S-09', '+999 112 0002', 'police@novaterra.test',    '{"always":"24/7"}', '{}', array['fr','en'], '[{"step":1,"text":"Signalez l''incident"},{"step":2,"text":"Un agent vous contacte"}]', array['Pièce d''identité (CIN)'], 'Gratuit', 24, 'open', now() - interval '60 days', true),
  (pg_temp.nid(4,3),  pg_temp.nid(2,2),  pg_temp.nid(3,4),  'Fire & Rescue',            'fire-rescue',       'emergency',      'Lutte contre l''incendie, sauvetage et protection civile.',               'Quai 4, S-04',          '+999 118 0003', 'fire@novaterra.test',      '{"always":"24/7"}', '{}', array['fr','en'], '[{"step":1,"text":"Appelez le 118"},{"step":2,"text":"Mettez-vous à l''abri"}]', '{}', 'Gratuit', 12, 'open', now() - interval '60 days', true),
  (pg_temp.nid(4,4),  pg_temp.nid(2,3),  pg_temp.nid(3,6),  'Emergency Medical',        'emergency-medical', 'health',         'Ambulances, urgences et premiers secours.',                               '3 Avenue Vitalis, S-06', '+999 115 0004', 'medical@novaterra.test',   '{"always":"24/7"}', '{}', array['fr','en'], '[{"step":1,"text":"Appelez le 115"},{"step":2,"text":"Décrivez l''état de la personne"}]', array['Carte de santé (si disponible)'], 'Gratuit', 6, 'open', now() - interval '60 days', true),
  (pg_temp.nid(4,5),  pg_temp.nid(2,4),  pg_temp.nid(3,4),  'Public Works & Roads',     'public-works',      'infrastructure', 'Voirie, éclairage public et réparations des équipements urbains.',        'Quai 4, S-04',          '+999 200 0005', 'works@novaterra.test',     '{"mon-fri":"07:00-16:00"}', array['saturday','sunday'], array['fr','en'], '[{"step":1,"text":"Localisez le problème (secteur / bâtiment)"},{"step":2,"text":"Ajoutez une photo"}]', '{}', 'Gratuit', 96, 'open', now() - interval '60 days', false),
  (pg_temp.nid(4,6),  pg_temp.nid(2,5),  pg_temp.nid(3,3),  'Energy & Water Utility',   'energy-water',      'utilities',      'Raccordements, pannes et facturation énergie/eau.',                       'Anneau Helios, S-03',   '+999 200 0006', 'energy@novaterra.test',    '{"mon-fri":"08:00-18:00"}', array['sunday'], array['fr','en'], '[{"step":1,"text":"Indiquez votre secteur"},{"step":2,"text":"Décrivez la panne"}]', array['Justificatif de domicile'], 'Selon tarif', 48, 'open', now() - interval '60 days', false),
  (pg_temp.nid(4,7),  pg_temp.nid(2,6),  pg_temp.nid(3,7),  'Transport Authority',      'transport-authority','mobility',      'Lignes de tram, maglev, sky-pods et navettes.',                           'Terminal Orbis, S-07',  '+999 200 0007', 'transport@novaterra.test', '{"always":"24/7"}', '{}', array['fr','en'], '[{"step":1,"text":"Choisissez votre ligne"},{"step":2,"text":"Consultez les horaires"}]', '{}', 'Selon ligne', 48, 'open', now() - interval '60 days', false),
  (pg_temp.nid(4,8),  pg_temp.nid(2,7),  pg_temp.nid(3,5),  'Environment & Waste',      'environment-waste', 'environment',    'Collecte des déchets, qualité de l''air et espaces verts.',               'Dôme Lumen, S-05',      '+999 200 0008', 'environment@novaterra.test','{"tue-sun":"10:00-19:00"}', array['monday'], array['fr','en'], '[{"step":1,"text":"Signalez un dépôt sauvage"}]', '{}', 'Gratuit', 72, 'temporarily_closed', now() - interval '60 days', false),
  (pg_temp.nid(4,9),  pg_temp.nid(2,8),  pg_temp.nid(3,10), 'Education & Youth',        'education-youth',   'education',      'Inscriptions scolaires, bourses et activités jeunesse.',                  'Flèche Academia, S-10', '+999 200 0009', 'education@novaterra.test', '{"mon-fri":"08:00-16:00"}', array['saturday','sunday'], array['fr','en'], '[{"step":1,"text":"Choisissez l''établissement"},{"step":2,"text":"Déposez le dossier"}]', array['Acte de naissance','Pièce d''identité du parrain'], 'Gratuit', 120, 'open', now() - interval '60 days', false),
  (pg_temp.nid(4,10), pg_temp.nid(2,4),  pg_temp.nid(3,1),  'Urban Planning',           'urban-planning',    'urbanism',       'Permis de construire et plans d''aménagement (non publié).',              '1 Place du Nexus, S-01', '+999 200 0010', 'urbanism@novaterra.test',  '{"mon-fri":"09:00-15:00"}', array['saturday','sunday'], array['fr'], '[]', array['Plans'], 'Selon dossier', 240, 'hidden', null, false)
on conflict (id) do nothing;

-- 4b. dix établissements fictifs pour chacun des neuf services hors santé (90 au total)
-- Retirer les établissements santé générés par les versions précédentes de ce seed.
delete from public.buildings b
using public.services s
where b.service_id = s.id
  and s.slug = 'emergency-medical'
  and b.id::text like '00000021-%';

insert into public.buildings (
  id, name, type, service_id, facility_type, sector_id, x, y, lat, lng, address,
  phone, email, opening_hours, accessibility, status, description, is_fictional, offerings
)
select
  pg_temp.nid(21, (split_part(s.id::text, '-', 5)::bigint * 10 + f.slot)::int),
  s.name || ' — ' || f.suffix || ' (' || sector.name || ')',
  case
    when ft.facility_type in ('hospital', 'clinic', 'care_center') then 'hospital'::public.building_type
    when ft.facility_type in ('police_station', 'fire_station') then 'security'::public.building_type
    when ft.facility_type = 'school' then 'school'::public.building_type
    when ft.facility_type = 'mobility_hub' then 'transport_hub'::public.building_type
    when ft.facility_type = 'administrative_office' then 'administrative'::public.building_type
    when ft.facility_type = 'utility_center' then 'energy'::public.building_type
    else 'public_place'::public.building_type
  end,
  s.id,
  ft.facility_type,
  main.sector_id,
  sector.x + f.dx,
  sector.y + f.dy,
  round(-18.9 - (sector.y + f.dy) / 10000.0, 6),
  round(47.5 + (sector.x + f.dx) / 10000.0, 6),
  f.suffix || ', ' || sector.name || ' (' || sector.code || ')',
  '+999 210 ' || lpad((split_part(s.id::text, '-', 5)::int * 10 + f.slot)::text, 4, '0'),
  'facility-' || split_part(s.id::text, '-', 5) || '-' || f.slot || '@novaterra.test',
  case
    when s.category in ('emergency', 'security') then '{"always":"24/7"}'::jsonb
    when s.category = 'mobility' then '{"mon-sun":"06:00-22:00"}'::jsonb
    when s.category = 'education' then '{"mon-fri":"07:30-18:00"}'::jsonb
    when s.category = 'environment' then '{"tue-sat":"08:00-17:00"}'::jsonb
    else '{"mon-fri":"08:00-17:00","sat":"09:00-12:00"}'::jsonb
  end,
  '{"step_free":true,"hearing_loop":true,"braille":true}'::jsonb,
  'operational'::public.building_status,
  case
    when s.category = 'emergency' or (s.category = 'security' and ft.facility_type = 'fire_station') then
      'Caserne de proximité pour ' || sector.name || ' : les équipes partent d''ici pour les incendies, les accidents et les secours aux personnes. Appelez le 118 en cas de danger immédiat.'
    when s.category = 'security' then
      'Commissariat de quartier pour ' || sector.name || ' : dépôt de plainte, aide en cas de problème et objets trouvés. Appelez le 112 en cas de danger immédiat.'
    when s.category = 'administration' then
      'Guichet de proximité pour les habitants de ' || sector.name || ' : renseignements, dépôt de dossiers et aide pour les démarches municipales. Pensez à apporter une pièce d''identité.'
    when s.category = 'urbanism' then
      'Permanence d''urbanisme de ' || sector.name || ' : vérification des règles locales et accompagnement pour les permis de construire ou les travaux. Les plans du projet sont utiles lors du rendez-vous.'
    when s.category = 'infrastructure' then
      'Antenne travaux de ' || sector.name || ' : les équipes organisent les réparations de chaussée, l''éclairage public et l''entretien des équipements. Une adresse précise et une photo aident à traiter un signalement.'
    when s.category = 'utilities' then
      'Agence énergie et eau de ' || sector.name || ' : signalement des coupures, demandes de raccordement et questions de facturation. Indiquez votre adresse ou votre numéro de compteur pour accélérer le suivi.'
    when s.category = 'mobility' then
      'Point d''accueil voyageurs de ' || sector.name || ' : informations sur les lignes, aide pour les titres de transport et conseils pour préparer un trajet accessible.'
    when s.category = 'environment' then
      'Maison de l''environnement de ' || sector.name || ' : conseils sur le tri, les jours de collecte et les espaces verts. Vous pouvez aussi y signaler un dépôt sauvage ou une nuisance locale.'
    when s.category = 'education' then
      'Établissement scolaire et accueil des familles de ' || sector.name || ' : renseignements sur les inscriptions, les activités jeunesse et l''accompagnement des élèves. Contactez l''équipe pour connaître les pièces à fournir.'
    else
      'Point de service de ' || sector.name || ' pour obtenir des renseignements et un accompagnement en personne auprès du service ' || s.name || '.'
  end,
  true,
  case ft.facility_type
    when 'hospital' then array['Urgences 24 h/24', 'Chirurgie générale', 'Pédiatrie', 'Imagerie médicale', 'Hospitalisation']
    when 'clinic' then array['Consultations générales', 'Soins infirmiers', 'Vaccination', 'Dépistage']
    when 'care_center' then array['Soins infirmiers', 'Suivi des maladies chroniques', 'Rééducation', 'Conseil santé']
    when 'pharmacy' then array['Délivrance de médicaments', 'Conseil pharmaceutique', 'Vaccination', 'Matériel médical']
    when 'dentist' then array['Soins dentaires', 'Détartrage', 'Traitement des caries', 'Urgences dentaires']
    when 'police_station' then array['Accueil des plaintes', 'Assistance d''urgence', 'Prévention', 'Objets trouvés']
    when 'fire_station' then array['Intervention incendie', 'Secours aux personnes', 'Sauvetage', 'Prévention des risques']
    when 'administrative_office' then array['Information citoyenne', 'Dépôt de dossier', 'Accompagnement administratif']
    when 'utility_center' then array['Signalement de panne', 'Raccordement', 'Conseil énergie et eau']
    when 'mobility_hub' then array['Information voyageurs', 'Billetterie', 'Accessibilité des transports']
    when 'environment_center' then array['Collecte sélective', 'Conseil environnemental', 'Qualité de l''air']
    when 'school' then array['Enseignement', 'Inscription scolaire', 'Accompagnement des élèves']
    else array['Accueil et information', 'Accompagnement des usagers', 'Orientation vers les services']
  end
from public.services s
join public.buildings main on main.id = s.building_id
join public.sectors sector on sector.id = main.sector_id
cross join (values
  (1, -36::numeric, -24::numeric, 'Centre principal'),
  (2, -18::numeric, -40::numeric, 'Guichet de proximité'),
  (3,   0::numeric, -46::numeric, 'Antenne Nord'),
  (4,  20::numeric, -38::numeric, 'Centre spécialisé'),
  (5,  38::numeric, -20::numeric, 'Antenne Est'),
  (6,  40::numeric,   4::numeric, 'Maison de quartier'),
  (7,  24::numeric,  28::numeric, 'Antenne Sud'),
  (8,   0::numeric,  42::numeric, 'Centre de proximité Sud'),
  (9, -22::numeric,  34::numeric, 'Antenne Ouest'),
  (10,-40::numeric,  14::numeric, 'Maison de quartier Ouest')
) as f(slot, dx, dy, suffix)
cross join lateral (
  select case
    when s.category = 'emergency' then 'fire_station'
    when s.category = 'security' then case when f.slot <= 5 then 'police_station' else 'fire_station' end
    when s.category = 'administration' or s.category = 'urbanism' then 'administrative_office'
    when s.category = 'infrastructure' then 'service_center'
    when s.category = 'utilities' then 'utility_center'
    when s.category = 'mobility' then 'mobility_hub'
    when s.category = 'environment' then 'environment_center'
    when s.category = 'education' then 'school'
    else 'service_center'
  end as facility_type
) ft
where s.id::text like '00000004-%'
  and s.category <> 'health'
on conflict (id) do update set
  name = excluded.name,
  facility_type = excluded.facility_type,
  sector_id = excluded.sector_id,
  x = excluded.x,
  y = excluded.y,
  lat = excluded.lat,
  lng = excluded.lng,
  address = excluded.address,
  phone = excluded.phone,
  email = excluded.email,
  opening_hours = excluded.opening_hours,
  accessibility = excluded.accessibility,
  status = excluded.status,
  description = excluded.description,
  offerings = excluded.offerings;

-- 5. service_relations
insert into public.service_relations (id, from_service_id, to_service_id, relation_type, note) values
  (pg_temp.nid(5,1),  pg_temp.nid(4,1),  pg_temp.nid(4,2),  'escalates_to',      'Les urgences de sécurité sont transmises à la police.'),
  (pg_temp.nid(5,2),  pg_temp.nid(4,1),  pg_temp.nid(4,3),  'escalates_to',      'Incendie et sauvetage.'),
  (pg_temp.nid(5,3),  pg_temp.nid(4,1),  pg_temp.nid(4,4),  'escalates_to',      'Urgences médicales.'),
  (pg_temp.nid(5,4),  pg_temp.nid(4,2),  pg_temp.nid(4,3),  'collaborates_with', 'Interventions conjointes.'),
  (pg_temp.nid(5,5),  pg_temp.nid(4,3),  pg_temp.nid(4,4),  'collaborates_with', 'Secours aux blessés.'),
  (pg_temp.nid(5,6),  pg_temp.nid(4,7),  pg_temp.nid(4,5),  'collaborates_with', 'Entretien des voies de transport.'),
  (pg_temp.nid(5,7),  pg_temp.nid(4,6),  pg_temp.nid(4,5),  'collaborates_with', 'Travaux sur le réseau énergie/eau.'),
  (pg_temp.nid(5,8),  pg_temp.nid(4,8),  pg_temp.nid(4,5),  'collaborates_with', 'Nettoyage et espaces publics.'),
  (pg_temp.nid(5,9),  pg_temp.nid(4,10), pg_temp.nid(4,5),  'supervises',        'L''urbanisme supervise les chantiers.'),
  (pg_temp.nid(5,10), pg_temp.nid(4,4),  pg_temp.nid(4,2),  'collaborates_with', 'Escorte et sécurisation des interventions.')
on conflict (id) do nothing;

-- 8. citizens — d'abord les adultes, ensuite le mineur (le parrain doit exister et être vérifié)
insert into public.citizens (id, profile_id, sector_id, building_id, birth_date, cin_number, kyc_status, reputation_base, consent_terms_at, consent_data_at) values
  (pg_temp.nid(8,1), pg_temp.nid(7,1), pg_temp.nid(1,1), pg_temp.nid(3,1),  date '1989-03-12', 'NT-CIN-000001', 'verified', 120, now() - interval '90 days', now() - interval '90 days'),
  (pg_temp.nid(8,2), pg_temp.nid(7,2), pg_temp.nid(1,9), pg_temp.nid(3,9),  date '1985-07-02', 'NT-CIN-000002', 'verified',  80, now() - interval '90 days', now() - interval '90 days'),
  (pg_temp.nid(8,3), pg_temp.nid(7,3), pg_temp.nid(1,4), pg_temp.nid(3,4),  date '1990-11-23', 'NT-CIN-000003', 'verified',  60, now() - interval '90 days', now() - interval '90 days'),
  (pg_temp.nid(8,4), pg_temp.nid(7,4), pg_temp.nid(1,6), pg_temp.nid(3,6),  date '1987-01-30', 'NT-CIN-000004', 'verified',  75, now() - interval '90 days', now() - interval '90 days'),
  (pg_temp.nid(8,5), pg_temp.nid(7,5), pg_temp.nid(1,1), pg_temp.nid(3,1),  date '1992-05-17', 'NT-CIN-000005', 'verified',  90, now() - interval '90 days', now() - interval '90 days'),
  (pg_temp.nid(8,6), pg_temp.nid(7,6), pg_temp.nid(1,4), pg_temp.nid(3,4),  date '1995-09-09', 'NT-CIN-000006', 'verified',  30, now() - interval '90 days', now() - interval '90 days'),
  (pg_temp.nid(8,7), pg_temp.nid(7,7), pg_temp.nid(1,2), pg_temp.nid(3,2),  date '1994-12-01', 'NT-CIN-000007', 'verified',  25, now() - interval '60 days', now() - interval '60 days'),
  (pg_temp.nid(8,8), pg_temp.nid(7,8), pg_temp.nid(1,5), null,              date '1998-04-14', 'NT-CIN-000008', 'pending',    0, now() - interval '5 days',  now() - interval '5 days'),
  (pg_temp.nid(8,9), pg_temp.nid(7,9), pg_temp.nid(1,7), null,              date '2000-08-25', 'NT-CIN-000009', 'rejected',   0, now() - interval '20 days', now() - interval '20 days')
on conflict (id) do nothing;

insert into public.citizens (id, profile_id, sector_id, building_id, birth_date, sponsor_citizen_id, kyc_status, reputation_base, consent_terms_at, consent_data_at)
values (pg_temp.nid(8,10), pg_temp.nid(7,10), pg_temp.nid(1,2), pg_temp.nid(3,2), (current_date - interval '14 years')::date,
        pg_temp.nid(8,7), 'verified', 0, now() - interval '30 days', now() - interval '30 days')
on conflict (id) do nothing;

-- 9. service_members (admin par service, agents, une révocation)
insert into public.service_members (id, profile_id, service_id, member_role, can_validate_reports, granted_by, granted_at, revoked_at) values
  (pg_temp.nid(9,1),  pg_temp.nid(7,2), pg_temp.nid(4,2), 'admin', true,  pg_temp.nid(7,1), now() - interval '80 days', null),
  (pg_temp.nid(9,2),  pg_temp.nid(7,3), pg_temp.nid(4,3), 'admin', true,  pg_temp.nid(7,1), now() - interval '80 days', null),
  (pg_temp.nid(9,3),  pg_temp.nid(7,4), pg_temp.nid(4,4), 'admin', true,  pg_temp.nid(7,1), now() - interval '80 days', null),
  (pg_temp.nid(9,4),  pg_temp.nid(7,5), pg_temp.nid(4,1), 'admin', true,  pg_temp.nid(7,1), now() - interval '80 days', null),
  (pg_temp.nid(9,5),  pg_temp.nid(7,6), pg_temp.nid(4,5), 'agent', false, pg_temp.nid(7,5), now() - interval '40 days', null),
  (pg_temp.nid(9,6),  pg_temp.nid(7,6), pg_temp.nid(4,1), 'agent', false, pg_temp.nid(7,5), now() - interval '40 days', null),
  (pg_temp.nid(9,7),  pg_temp.nid(7,5), pg_temp.nid(4,5), 'admin', true,  pg_temp.nid(7,1), now() - interval '40 days', null),
  (pg_temp.nid(9,8),  pg_temp.nid(7,6), pg_temp.nid(4,8), 'agent', true,  pg_temp.nid(7,1), now() - interval '30 days', null),
  (pg_temp.nid(9,9),  pg_temp.nid(7,2), pg_temp.nid(4,3), 'agent', false, pg_temp.nid(7,1), now() - interval '30 days', null),
  (pg_temp.nid(9,10), pg_temp.nid(7,6), pg_temp.nid(4,7), 'agent', false, pg_temp.nid(7,1), now() - interval '70 days', now() - interval '10 days')
on conflict (id) do nothing;

-- Rattachements des profils (7) maintenant que les services existent
update public.profiles p set primary_service_id = v.svc, allowed_sector_ids = v.sectors
from (values
  (2, pg_temp.nid(4,2), array[pg_temp.nid(1,9)]),
  (3, pg_temp.nid(4,3), array[pg_temp.nid(1,4)]),
  (4, pg_temp.nid(4,4), array[pg_temp.nid(1,6)]),
  (5, pg_temp.nid(4,1), array[pg_temp.nid(1,1), pg_temp.nid(1,4)]),
  (6, pg_temp.nid(4,5), array[pg_temp.nid(1,4)])
) as v(n, svc, sectors)
where p.id = pg_temp.nid(7, v.n);

-- 6. transports (aethelon_apex = voiture, vortex_phantom = moto : véhicules personnels)
insert into public.transports (id, code, type, plate, visibility, status, sector_id, x, y, capacity, route_name, owner_service_id, owner_citizen_id)
select pg_temp.nid(6, t.n), t.code, t.type::public.transport_type, t.plate, t.visibility, t.status::public.transport_status,
       pg_temp.nid(1, t.sector), s.x + t.dx, s.y + t.dy, t.capacity, t.route,
       case when t.svc is null then null else pg_temp.nid(4, t.svc) end,
       case when t.citizen is null then null else pg_temp.nid(8, t.citizen) end
from (values
  (1,  'T1',    'hover_tram',     null,         'public',   'active',      1,  20,  20, 120, 'Ligne T1 Nexus ⇄ Orbis',         7, null),
  (2,  'M1',    'maglev',         null,         'public',   'active',      7,  -5,   5, 400, 'Ligne M1 Orbis ⇄ Cipher',        7, null),
  (3,  'P1',    'sky_pod',        null,         'public',   'active',      2,   8,  -8,   6, 'Ligne P Aurora',                 7, null),
  (4,  'P2',    'sky_pod',        null,         'public',   'idle',        10, -8,   8,   6, 'Ligne P Academia',               7, null),
  (5,  'SH1',   'shuttle',        null,         'public',   'active',      6,   6,   6,  30, 'Navette Vitalis ⇄ Nexus',        7, null),
  (6,  'D1',    'drone_taxi',     null,         'public',   'active',      8,  10, -10,   2, 'Drone-taxi à la demande',        7, null),
  (7,  'C1',    'cargo_drone',    null,         'public',   'active',      4,   0,  12,   1, 'Fret Ferrum',                     5, null),
  (8,  'AX-07', 'aethelon_apex',  'NT-AX-0007', 'personal', 'active',      2, -15, -10,   4, null,                            null, 7),
  (9,  'VP-08', 'vortex_phantom', 'NT-VP-0008', 'personal', 'maintenance', 5,  10,  10,   2, null,                            null, 8),
  (10, 'F1',    'ferry',          null,         'public',   'active',      5,  25,   0,  80, 'Ferry du lac céleste',           7, null)
) as t(n, code, type, plate, visibility, status, sector, dx, dy, capacity, route, svc, citizen)
join public.sectors s on s.id = pg_temp.nid(1, t.sector)
on conflict (id) do nothing;

-- 10. permissions
insert into public.permissions (id, code, description, resource, action) values
  (pg_temp.nid(10,1),  'service.read',         'Consulter les services publics',          'service', 'read'),
  (pg_temp.nid(10,2),  'request.create',       'Créer une demande',                       'request', 'create'),
  (pg_temp.nid(10,3),  'request.read_service', 'Voir les demandes d''un service',         'request', 'read'),
  (pg_temp.nid(10,4),  'request.update',       'Modifier le statut d''une demande',       'request', 'update'),
  (pg_temp.nid(10,5),  'report.create',        'Déposer un signalement',                  'report',  'create'),
  (pg_temp.nid(10,6),  'report.validate',      'Valider un signalement',                  'report',  'validate'),
  (pg_temp.nid(10,7),  'news.publish',         'Publier une actualité',                   'news',    'update'),
  (pg_temp.nid(10,8),  'user.manage',          'Gérer les utilisateurs',                  'user',    'update'),
  (pg_temp.nid(10,9),  'role.edit',            'Modifier les rôles et droits',            'role',    'update'),
  (pg_temp.nid(10,10), 'audit.read',            'Consulter les journaux d''audit',        'audit',   'read')
on conflict (id) do nothing;

-- 11. role_permissions (matrice D09)
insert into public.role_permissions (id, role, permission_id, scope) values
  (pg_temp.nid(11,1),  'citizen',       pg_temp.nid(10,1),  'all'),
  (pg_temp.nid(11,2),  'citizen',       pg_temp.nid(10,2),  'own'),
  (pg_temp.nid(11,3),  'citizen',       pg_temp.nid(10,5),  'own'),
  (pg_temp.nid(11,4),  'agent',         pg_temp.nid(10,3),  'service'),
  (pg_temp.nid(11,5),  'agent',         pg_temp.nid(10,4),  'service'),
  (pg_temp.nid(11,6),  'service_admin', pg_temp.nid(10,6),  'service'),
  (pg_temp.nid(11,7),  'service_admin', pg_temp.nid(10,7),  'service'),
  (pg_temp.nid(11,8),  'general_admin', pg_temp.nid(10,8),  'all'),
  (pg_temp.nid(11,9),  'general_admin', pg_temp.nid(10,9),  'all'),
  (pg_temp.nid(11,10), 'general_admin', pg_temp.nid(10,10), 'all')
on conflict (id) do nothing;

-- 12. citizen_verifications (CIN fictif vérifié par IA selon un modèle fixe)
insert into public.citizen_verifications (id, citizen_id, cin_image_path, ai_model, ai_score, ai_extracted, status, reviewed_by, rejection_reason, submitted_at, decided_at) values
  (pg_temp.nid(12,1),  pg_temp.nid(8,1), 'cin-documents/00000007-0000-4000-8000-000000000001/cin.jpg', 'cin-model-v1', 0.97, '{"cin":"NT-CIN-000001","match":true}', 'validated', pg_temp.nid(7,1), null, now() - interval '89 days', now() - interval '89 days'),
  (pg_temp.nid(12,2),  pg_temp.nid(8,2), 'cin-documents/00000007-0000-4000-8000-000000000002/cin.jpg', 'cin-model-v1', 0.95, '{"cin":"NT-CIN-000002","match":true}', 'validated', pg_temp.nid(7,1), null, now() - interval '89 days', now() - interval '89 days'),
  (pg_temp.nid(12,3),  pg_temp.nid(8,3), 'cin-documents/00000007-0000-4000-8000-000000000003/cin.jpg', 'cin-model-v1', 0.93, '{"cin":"NT-CIN-000003","match":true}', 'validated', pg_temp.nid(7,1), null, now() - interval '88 days', now() - interval '88 days'),
  (pg_temp.nid(12,4),  pg_temp.nid(8,4), 'cin-documents/00000007-0000-4000-8000-000000000004/cin.jpg', 'cin-model-v1', 0.96, '{"cin":"NT-CIN-000004","match":true}', 'validated', pg_temp.nid(7,1), null, now() - interval '88 days', now() - interval '88 days'),
  (pg_temp.nid(12,5),  pg_temp.nid(8,5), 'cin-documents/00000007-0000-4000-8000-000000000005/cin.jpg', 'cin-model-v1', 0.99, '{"cin":"NT-CIN-000005","match":true}', 'validated', pg_temp.nid(7,1), null, now() - interval '87 days', now() - interval '87 days'),
  (pg_temp.nid(12,6),  pg_temp.nid(8,6), 'cin-documents/00000007-0000-4000-8000-000000000006/cin.jpg', 'cin-model-v1', 0.91, '{"cin":"NT-CIN-000006","match":true}', 'validated', pg_temp.nid(7,1), null, now() - interval '86 days', now() - interval '86 days'),
  (pg_temp.nid(12,7),  pg_temp.nid(8,7), 'cin-documents/00000007-0000-4000-8000-000000000007/cin-1.jpg', 'cin-model-v1', 0.41, '{"cin":null,"match":false}',           'rejected',  pg_temp.nid(7,1), 'Image floue : veuillez renvoyer une photo nette.', now() - interval '62 days', now() - interval '62 days'),
  (pg_temp.nid(12,8),  pg_temp.nid(8,7), 'cin-documents/00000007-0000-4000-8000-000000000007/cin-2.jpg', 'cin-model-v1', 0.94, '{"cin":"NT-CIN-000007","match":true}', 'validated', pg_temp.nid(7,1), null, now() - interval '60 days', now() - interval '60 days'),
  (pg_temp.nid(12,9),  pg_temp.nid(8,8), 'cin-documents/00000007-0000-4000-8000-000000000008/cin.jpg', 'cin-model-v1', null, '{}',                                    'pending',   null, null, now() - interval '5 days', null),
  (pg_temp.nid(12,10), pg_temp.nid(8,9), 'cin-documents/00000007-0000-4000-8000-000000000009/cin.jpg', 'cin-model-v1', 0.22, '{"cin":"NT-CIN-999999","match":false}', 'rejected',  pg_temp.nid(7,1), 'Le document ne correspond pas au modèle de CIN de Nova Terra.', now() - interval '20 days', now() - interval '19 days')
on conflict (id) do nothing;

-- 13. reputation_votes (les utilisateurs notent des personnes, jamais des signalements)
insert into public.reputation_votes (id, from_citizen_id, to_citizen_id, points, reason) values
  (pg_temp.nid(13,1),  pg_temp.nid(8,7), pg_temp.nid(8,1),  2, 'Réponse rapide et utile.'),
  (pg_temp.nid(13,2),  pg_temp.nid(8,7), pg_temp.nid(8,5),  1, 'Très aimable.'),
  (pg_temp.nid(13,3),  pg_temp.nid(8,1), pg_temp.nid(8,7),  1, 'Signalements précis.'),
  (pg_temp.nid(13,4),  pg_temp.nid(8,2), pg_temp.nid(8,7),  1, 'Contribution fiable.'),
  (pg_temp.nid(13,5),  pg_temp.nid(8,3), pg_temp.nid(8,7),  2, 'Photos de qualité.'),
  (pg_temp.nid(13,6),  pg_temp.nid(8,4), pg_temp.nid(8,7), -1, 'Un signalement imprécis.'),
  (pg_temp.nid(13,7),  pg_temp.nid(8,5), pg_temp.nid(8,6),  1, 'Bon suivi.'),
  (pg_temp.nid(13,8),  pg_temp.nid(8,6), pg_temp.nid(8,7),  1, 'Merci pour l''aide.'),
  (pg_temp.nid(13,9),  pg_temp.nid(8,1), pg_temp.nid(8,6),  2, 'Excellent travail sur le terrain.'),
  (pg_temp.nid(13,10), pg_temp.nid(8,5), pg_temp.nid(8,2),  1, 'Collaboration efficace.')
on conflict (id) do nothing;

alter table public.profiles enable trigger audit_row_change;
alter table public.citizens enable trigger audit_row_change;
alter table public.service_members enable trigger audit_row_change;
alter table public.role_permissions enable trigger audit_row_change;
