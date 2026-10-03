-- ============================================================================
-- NOVA TERRA — 07c : données fictives — contenu, dangers, plateforme, accessibilité (tables 21-28, 30-39 + starter)
-- DONNÉES FICTIVES. Prérequis : 07a, 07b. Relançable (on conflict do nothing).
-- ============================================================================

create or replace function pg_temp.nid(t int, n int) returns uuid language sql immutable as $$
  select (lpad(t::text, 8, '0') || '-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid
$$;

alter table public.news disable trigger audit_row_change;
alter table public.services disable trigger audit_row_change;

-- 21. news
insert into public.news (id, slug, title, summary, body, category, cover_image_url, service_id, author_id, importance, status, published_at, valid_until, affected_sector_ids, reviewed_by) values
  (pg_temp.nid(21,1),  'inspection-coque-ferrum-docks',   'Inspection de la coque à Ferrum Docks', 'Accès limité au quai 4 pendant l''inspection structurelle.', 'Le quai 4 sera partiellement fermé pendant 48 h pour une inspection de la coque. Les drones de fret sont déviés par le quai 2.', 'infrastructure', null, pg_temp.nid(4,5), pg_temp.nid(7,5), 'urgent',    'published',      now() - interval '1 day',   now() + interval '3 days',  array[pg_temp.nid(1,4)], pg_temp.nid(7,1)),
  (pg_temp.nid(21,2),  'maglev-m1-horaires-de-nuit',      'Nouveaux horaires de nuit pour le maglev M1', 'Le maglev circule désormais jusqu''à 2 h du matin.', 'Pour répondre à la demande, la ligne M1 relie Orbis Port à Cipher Quarter jusqu''à 2 h du matin les vendredis et samedis.', 'transport', null, pg_temp.nid(4,7), pg_temp.nid(7,5), 'important', 'published',      now() - interval '4 days',  null,                        array[pg_temp.nid(1,7), pg_temp.nid(1,8)], pg_temp.nid(7,1)),
  (pg_temp.nid(21,3),  'dome-lumen-ferme-pour-travaux',   'Le dôme Lumen ferme pour travaux', 'La verrière sera réparée, réouverture prévue dans trois semaines.', 'Le dôme botanique est fermé au public. Les visites guidées sont déplacées dans le jardin extérieur.', 'culture', null, pg_temp.nid(4,8), pg_temp.nid(7,5), 'normal',    'published',      now() - interval '6 days',  now() + interval '21 days', array[pg_temp.nid(1,5)], pg_temp.nid(7,1)),
  (pg_temp.nid(21,4),  'modernisation-reseau-helios',     'Modernisation du réseau énergétique Helios', 'Des coupures brèves sont possibles de 1 h à 3 h.', 'La modernisation du réseau Helios Grid peut provoquer de courtes coupures. Les hôpitaux sont alimentés par des circuits de secours.', 'energy', null, pg_temp.nid(4,6), pg_temp.nid(7,5), 'important', 'published',      now() - interval '8 days',  now() + interval '10 days', array[pg_temp.nid(1,3)], pg_temp.nid(7,1)),
  (pg_temp.nid(21,5),  'inscriptions-rentree-academia',   'Ouverture des inscriptions de la rentrée', 'Les inscriptions à l''université Academia Spire sont ouvertes.', 'Déposez votre dossier avant le 30 novembre. Les mineurs doivent être accompagnés d''un parrain majeur vérifié.', 'education', null, pg_temp.nid(4,9), pg_temp.nid(7,5), 'normal',    'published',      now() - interval '10 days', now() + interval '55 days', array[pg_temp.nid(1,10)], pg_temp.nid(7,1)),
  (pg_temp.nid(21,6),  'festival-des-lumieres-automne',   'Festival des lumières d''automne', 'Retour sur le festival : merci à tous !', 'Plus de 20 000 visiteurs ont découvert les installations lumineuses des jardins Lumen.', 'culture', null, pg_temp.nid(4,1), pg_temp.nid(7,5), 'normal',    'archived',       now() - interval '45 days', now() - interval '30 days', array[pg_temp.nid(1,5)], pg_temp.nid(7,1)),
  (pg_temp.nid(21,7),  'campagne-economie-d-eau',        'Brouillon : campagne d''économie d''eau', 'Projet de campagne de sensibilisation.', 'Texte en cours de rédaction par le service Énergie & Eau.', 'environment', null, pg_temp.nid(4,6), pg_temp.nid(7,5), 'normal',    'draft',          null,                       null,                        '{}', null),
  (pg_temp.nid(21,8),  'projet-nouvelle-ligne-sky-pod',   'Proposition : nouvelle ligne de sky-pods', 'Une ligne reliera Aurora Heights à Academia Spire.', 'La proposition est en attente de validation par l''administration générale avant publication.', 'transport', null, pg_temp.nid(4,7), pg_temp.nid(7,5), 'normal',    'pending_review', null,                       null,                        array[pg_temp.nid(1,2), pg_temp.nid(1,10)], null),
  (pg_temp.nid(21,9),  'comment-deposer-un-signalement',  'Comment déposer un signalement', 'Guide pas à pas pour signaler un problème dans votre secteur.', 'Vérifiez votre identité, choisissez votre secteur et votre bâtiment, décrivez le problème et joignez une photo. Vous pouvez aussi dicter votre signalement à voix haute.', 'guide', null, pg_temp.nid(4,1), pg_temp.nid(7,5), 'normal',    'published',      now() - interval '20 days', null,                        '{}', pg_temp.nid(7,1)),
  (pg_temp.nid(21,10), 'points-de-reputation-explications','Les points de réputation expliqués', 'Comment fonctionnent les points attribués entre habitants.', 'Les habitants vérifiés peuvent attribuer des points à d''autres habitants, jamais aux signalements. Ils reflètent la fiabilité d''une personne et ne remplacent jamais la validation d''un administrateur.', 'guide', null, pg_temp.nid(4,1), pg_temp.nid(7,5), 'normal',    'published',      now() - interval '15 days', null,                        '{}', pg_temp.nid(7,1))
on conflict (id) do nothing;

-- 22. news_comments
insert into public.news_comments (id, news_id, author_id, body, status, moderated_by, created_at) values
  (pg_temp.nid(22,1),  pg_temp.nid(21,1),  pg_temp.nid(7,7),  'Merci pour l''information, je prendrai le quai 2.', 'visible', null, now() - interval '20 hours'),
  (pg_temp.nid(22,2),  pg_temp.nid(21,1),  pg_temp.nid(7,8),  'Est-ce que le fret médical est concerné ?', 'visible', null, now() - interval '18 hours'),
  (pg_temp.nid(22,3),  pg_temp.nid(21,2),  pg_temp.nid(7,7),  'Excellent, enfin des horaires de nuit !', 'visible', null, now() - interval '3 days'),
  (pg_temp.nid(22,4),  pg_temp.nid(21,2),  pg_temp.nid(7,10), 'Le maglev est-il accessible aux fauteuils ?', 'visible', null, now() - interval '3 days'),
  (pg_temp.nid(22,5),  pg_temp.nid(21,3),  pg_temp.nid(7,8),  'Dommage, j''adorais ce dôme.', 'visible', null, now() - interval '5 days'),
  (pg_temp.nid(22,6),  pg_temp.nid(21,4),  pg_temp.nid(7,7),  'Les hôpitaux sont bien protégés, bonne nouvelle.', 'visible', null, now() - interval '7 days'),
  (pg_temp.nid(22,7),  pg_temp.nid(21,5),  pg_temp.nid(7,10), 'Mon parrain doit-il venir en personne ?', 'visible', null, now() - interval '9 days'),
  (pg_temp.nid(22,8),  pg_temp.nid(21,9),  pg_temp.nid(7,7),  'Guide très clair, merci.', 'visible', null, now() - interval '19 days'),
  (pg_temp.nid(22,9),  pg_temp.nid(21,10), pg_temp.nid(7,8),  'Message inapproprié retiré par la modération.', 'hidden', pg_temp.nid(7,1), now() - interval '14 days'),
  (pg_temp.nid(22,10), pg_temp.nid(21,10), pg_temp.nid(7,7),  'Merci pour ces précisions sur les points.', 'visible', null, now() - interval '14 days')
on conflict (id) do nothing;

-- 23. newsletter_topics
insert into public.newsletter_topics (id, code, label, description) values
  (pg_temp.nid(23,1),  'safety',      'Sécurité',          'Alertes et conseils de sécurité.'),
  (pg_temp.nid(23,2),  'transport',   'Transports',        'Horaires, perturbations et nouvelles lignes.'),
  (pg_temp.nid(23,3),  'energy',      'Énergie & eau',     'Coupures programmées et économies.'),
  (pg_temp.nid(23,4),  'health',      'Santé',             'Campagnes de prévention et services médicaux.'),
  (pg_temp.nid(23,5),  'culture',     'Culture & loisirs', 'Événements et lieux culturels.'),
  (pg_temp.nid(23,6),  'urbanism',    'Urbanisme',         'Projets d''aménagement de la ville.'),
  (pg_temp.nid(23,7),  'environment', 'Environnement',     'Qualité de l''air, déchets et espaces verts.'),
  (pg_temp.nid(23,8),  'education',   'Éducation',         'Inscriptions, bourses et vie étudiante.'),
  (pg_temp.nid(23,9),  'emergency',   'Urgences',          'Alertes officielles et protocoles.'),
  (pg_temp.nid(23,10), 'city_hall',   'Mairie',            'Annonces générales de la mairie.')
on conflict (id) do nothing;

-- 24. newsletter_subscriptions
insert into public.newsletter_subscriptions (id, profile_id, topic_id, frequency, is_active) values
  (pg_temp.nid(24,1),  pg_temp.nid(7,7),  pg_temp.nid(23,1),  'instant', true),
  (pg_temp.nid(24,2),  pg_temp.nid(7,7),  pg_temp.nid(23,2),  'daily',   true),
  (pg_temp.nid(24,3),  pg_temp.nid(7,7),  pg_temp.nid(23,9),  'instant', true),
  (pg_temp.nid(24,4),  pg_temp.nid(7,7),  pg_temp.nid(23,5),  'weekly',  false),
  (pg_temp.nid(24,5),  pg_temp.nid(7,8),  pg_temp.nid(23,5),  'weekly',  true),
  (pg_temp.nid(24,6),  pg_temp.nid(7,8),  pg_temp.nid(23,7),  'weekly',  true),
  (pg_temp.nid(24,7),  pg_temp.nid(7,8),  pg_temp.nid(23,9),  'instant', true),
  (pg_temp.nid(24,8),  pg_temp.nid(7,10), pg_temp.nid(23,8),  'weekly',  true),
  (pg_temp.nid(24,9),  pg_temp.nid(7,5),  pg_temp.nid(23,10), 'daily',   true),
  (pg_temp.nid(24,10), pg_temp.nid(7,5),  pg_temp.nid(23,6),  'weekly',  true)
on conflict (id) do nothing;

-- 25. notifications (table du starter étendue)
insert into public.notifications (id, user_id, type, title, body, href, read_at, entity_type, entity_id, created_at) values
  (pg_temp.nid(25,1),  pg_temp.nid(7,7),  'request_update', 'Demande NT-REQ-2026-0004 mise à jour',  'Nouveau statut : assigned',            '/app/requests/00000014-0000-4000-8000-000000000004', null,                     'request', pg_temp.nid(14,4), now() - interval '4 days'),
  (pg_temp.nid(25,2),  pg_temp.nid(7,7),  'request_update', 'Demande NT-REQ-2026-0007 résolue',        'Votre attestation est prête.',          '/app/requests/00000014-0000-4000-8000-000000000007', now() - interval '2 days', 'request', pg_temp.nid(14,7), now() - interval '3 days'),
  (pg_temp.nid(25,3),  pg_temp.nid(7,7),  'report_update',  'Signalement NT-REP-2026-0002 validé',   'Votre signalement a été validé et publié.', '/app/reports/00000018-0000-4000-8000-000000000002', now() - interval '4 days', 'report',  pg_temp.nid(18,2), now() - interval '5 days'),
  (pg_temp.nid(25,4),  pg_temp.nid(7,7),  'news',           'Inspection de la coque à Ferrum Docks', 'Accès limité au quai 4 pendant 48 h.',  '/news/inspection-coque-ferrum-docks', null,                     'news',    pg_temp.nid(21,1), now() - interval '1 day'),
  (pg_temp.nid(25,5),  pg_temp.nid(7,7),  'danger_alert',   'Protocole d''alerte extraterrestre',     'Exercice fictif : consultez la procédure officielle.', '/dangers/alien-invasion-protocol', null,               'danger',  pg_temp.nid(27,1), now() - interval '2 days'),
  (pg_temp.nid(25,6),  pg_temp.nid(7,8),  'system',         'Vérification d''identité en cours',      'Votre CIN est en cours d''examen.',     '/app/verification', null,                                                  'citizen', pg_temp.nid(8,8),  now() - interval '5 days'),
  (pg_temp.nid(25,7),  pg_temp.nid(7,8),  'newsletter',     'Lettre d''information — Culture',        'Les événements de la semaine.',          '/news', now() - interval '1 day',                                          'news',    pg_temp.nid(21,3), now() - interval '2 days'),
  (pg_temp.nid(25,8),  pg_temp.nid(7,7),  'reputation',     'Nouveaux points de réputation',          'Un habitant vous a attribué +2 points.', '/app/profile', now() - interval '6 days',                                  'citizen', pg_temp.nid(8,7),  now() - interval '7 days'),
  (pg_temp.nid(25,9),  pg_temp.nid(7,5),  'system',         '3 signalements à vérifier',              'Des signalements automatiques attendent votre validation.', '/agent/reports', null,                       'report',  null,              now() - interval '3 hours'),
  (pg_temp.nid(25,10), pg_temp.nid(7,1),  'system',         'Synchronisation partielle de l''API',    'Une erreur d''import a été détectée.',   '/agent/sync', null,                                                         'api_synchronization', pg_temp.nid(31,7), now() - interval '12 hours')
on conflict (id) do nothing;

-- 26. support_calls (simulés)
insert into public.support_calls (id, caller_id, service_id, agent_id, status, started_at, ended_at, duration_s, summary, created_request_id) values
  (pg_temp.nid(26,1),  pg_temp.nid(7,7),  pg_temp.nid(4,1), pg_temp.nid(7,5), 'ended',     now() - interval '10 days', now() - interval '10 days' + interval '6 minutes', 360, 'Question sur les horaires de la mairie.', null),
  (pg_temp.nid(26,2),  pg_temp.nid(7,8),  pg_temp.nid(4,5), pg_temp.nid(7,6), 'ended',     now() - interval '9 days',  now() - interval '9 days' + interval '4 minutes',  240, 'Signalement d''un lampadaire.', null),
  (pg_temp.nid(26,3),  pg_temp.nid(7,7),  pg_temp.nid(4,6), pg_temp.nid(7,5), 'ended',     now() - interval '4 days',  now() - interval '4 days' + interval '3 minutes',  180, 'Annulation d''un raccordement.', pg_temp.nid(14,10)),
  (pg_temp.nid(26,4),  pg_temp.nid(7,10), pg_temp.nid(4,9), null,             'missed',    now() - interval '8 days',  null, 0, null, null),
  (pg_temp.nid(26,5),  pg_temp.nid(7,7),  pg_temp.nid(4,2), pg_temp.nid(7,2), 'ended',     now() - interval '3 days',  now() - interval '3 days' + interval '9 minutes',  540, 'Vol de véhicule : liste des pièces à fournir.', null),
  (pg_temp.nid(26,6),  pg_temp.nid(7,8),  pg_temp.nid(4,4), pg_temp.nid(7,4), 'ended',     now() - interval '7 days',  now() - interval '7 days' + interval '2 minutes',  120, 'Conseil de premiers secours.', null),
  (pg_temp.nid(26,7),  pg_temp.nid(7,7),  pg_temp.nid(4,7), pg_temp.nid(7,6), 'connected', now() - interval '5 minutes', null, 0, null, null),
  (pg_temp.nid(26,8),  pg_temp.nid(7,8),  pg_temp.nid(4,1), null,             'requested', now() - interval '1 minute', null, 0, null, null),
  (pg_temp.nid(26,9),  pg_temp.nid(7,10), pg_temp.nid(4,1), null,             'missed',    now() - interval '6 days',  null, 0, null, null),
  (pg_temp.nid(26,10), pg_temp.nid(7,7),  pg_temp.nid(4,3), pg_temp.nid(7,3), 'ended',     now() - interval '2 days',  now() - interval '2 days' + interval '5 minutes',  300, 'Consignes en cas d''incendie.', null)
on conflict (id) do nothing;

-- 27. dangers — toutes les alertes sont FICTIVES et marquées comme telles
insert into public.dangers (id, slug, title, severity, status, summary, affected_sector_ids, valid_from, valid_until, recommended_actions, forbidden_actions, emergency_contacts, assembly_building_ids, protocol_steps, source, responsible_service_id, validated_by, validated_at, procedure_version, is_fictional_alert) values
  (pg_temp.nid(27,1),  'alien-invasion-protocol', 'Protocole d''invasion extraterrestre', 'extreme', 'active',
    'Procédure officielle en cas de contact hostile avec une flotte extraterrestre. Exercice fictif.',
    array[pg_temp.nid(1,1), pg_temp.nid(1,7), pg_temp.nid(1,9)], now() - interval '30 days', null,
    array['Rester à l''abri dans un bâtiment','Fermer les fenêtres et couper les ascenseurs de façade','Écouter les annonces officielles','Rejoindre le point de rassemblement si demandé'],
    array['Ne pas approcher les engins non identifiés','Ne pas diffuser de rumeurs','Ne pas utiliser de drones privés'],
    '[{"service":"Nova Police","phone":"+999 112"},{"service":"Fire & Rescue","phone":"+999 118"},{"service":"Emergency Medical","phone":"+999 115"}]',
    array[pg_temp.nid(3,1), pg_temp.nid(3,6), pg_temp.nid(3,9)],
    '[{"order":1,"title":"Identifier l''alerte","detail":"Une alerte est émise par le centre de commandement de Sentinel Ward."},{"order":2,"title":"Confirmer la source","detail":"La source est vérifiée par au moins deux systèmes indépendants."},{"order":3,"title":"Informer la population","detail":"Message officiel sur le site, le chatbot et les écrans publics."},{"order":4,"title":"Rester à l''abri","detail":"Les habitants se mettent à l''abri et attendent les consignes."},{"order":5,"title":"Éviter les zones concernées","detail":"Les secteurs Orbis Port et Sentinel Ward sont à éviter."},{"order":6,"title":"Coordonner les services","detail":"Police, pompiers et urgences médicales agissent de concert."},{"order":7,"title":"Publier les mises à jour","detail":"Une mise à jour est publiée toutes les 30 minutes."},{"order":8,"title":"Clôturer l''alerte","detail":"L''alerte est levée uniquement après validation officielle."}]',
    'Centre de commandement Sentinel (fictif)', pg_temp.nid(4,2), pg_temp.nid(7,1), now() - interval '30 days', 3, true),
  (pg_temp.nid(27,2),  'solar-flare-blackout',    'Panne géante après éruption solaire', 'high', 'active', 'Risque de coupure du réseau énergétique après une éruption solaire. Exercice fictif.', array[pg_temp.nid(1,3)], now() - interval '10 days', now() + interval '20 days', array['Charger les appareils essentiels','Éviter les ascenseurs'], array['Ne pas ouvrir les armoires électriques'], '[{"service":"Energy & Water Utility","phone":"+999 200 0006"}]', array[pg_temp.nid(3,6)], '[{"order":1,"title":"Alerte","detail":"Annonce de l''éruption."},{"order":2,"title":"Basculer sur les circuits de secours","detail":"Hôpitaux et sécurité prioritaires."},{"order":3,"title":"Rétablissement","detail":"Retour progressif du réseau."}]', 'Observatoire solaire (fictif)', pg_temp.nid(4,6), pg_temp.nid(7,1), now() - interval '10 days', 1, true),
  (pg_temp.nid(27,3),  'anti-gravity-failure',    'Défaillance anti-gravité locale', 'moderate', 'active', 'Instabilité d''un générateur anti-gravité dans Aurora Heights. Exercice fictif.', array[pg_temp.nid(1,2)], now() - interval '4 days', now() + interval '3 days', array['S''éloigner des balcons','Suivre les consignes du personnel'], array['Ne pas utiliser les ascenseurs'], '[{"service":"Public Works & Roads","phone":"+999 200 0005"}]', array[pg_temp.nid(3,2)], '[{"order":1,"title":"Évacuer les balcons","detail":"Zone sécurisée."},{"order":2,"title":"Inspection","detail":"Équipe technique sur place."},{"order":3,"title":"Réouverture","detail":"Après validation."}]', 'Service travaux publics', pg_temp.nid(4,5), pg_temp.nid(7,5), now() - interval '4 days', 1, true),
  (pg_temp.nid(27,4),  'toxic-nebula-cloud',      'Nuage de nébuleuse toxique', 'high', 'draft', 'Brouillon : procédure en cours de rédaction pour un nuage toxique approchant la ville.', array[pg_temp.nid(1,6)], now(), null, '{}', '{}', '[]', '{}', '[]', 'Brouillon', pg_temp.nid(4,8), null, null, 1, true),
  (pg_temp.nid(27,5),  'meteor-shower',           'Pluie de météores', 'low', 'active', 'Pluie de météores attendue cette nuit, risque faible. Exercice fictif.', array[pg_temp.nid(1,5), pg_temp.nid(1,7)], now() - interval '1 day', now() + interval '2 days', array['Rester à l''intérieur pendant le pic'], array['Ne pas sortir sur les passerelles extérieures'], '[{"service":"Fire & Rescue","phone":"+999 118"}]', array[pg_temp.nid(3,5)], '[{"order":1,"title":"Surveillance","detail":"Suivi radar."},{"order":2,"title":"Abri","detail":"Rester à l''intérieur."},{"order":3,"title":"Fin d''alerte","detail":"Annonce officielle."}]', 'Observatoire (fictif)', pg_temp.nid(4,3), pg_temp.nid(7,3), now() - interval '1 day', 1, true),
  (pg_temp.nid(27,6),  'cyber-attack-grid',       'Cyberattaque sur le réseau de la ville', 'high', 'active', 'Tentative d''intrusion détectée sur le réseau Cipher Quarter. Exercice fictif.', array[pg_temp.nid(1,8)], now() - interval '2 days', now() + interval '5 days', array['Ne pas ouvrir de liens suspects','Utiliser les canaux officiels'], array['Ne pas partager de mots de passe'], '[{"service":"Energy & Water Utility","phone":"+999 200 0006"}]', array[pg_temp.nid(3,8)], '[{"order":1,"title":"Isoler le segment","detail":"Coupure du segment touché."},{"order":2,"title":"Analyser","detail":"Équipe de réponse numérique."},{"order":3,"title":"Restaurer","detail":"Retour au service."}]', 'Équipe de réponse numérique (fictive)', pg_temp.nid(4,6), pg_temp.nid(7,1), now() - interval '2 days', 2, true),
  (pg_temp.nid(27,7),  'hull-breach-ferrum-docks','Brèche de coque à Ferrum Docks', 'high', 'active', 'Une brèche de coque est suspectée sur le quai 4. Exercice fictif.', array[pg_temp.nid(1,4)], now() - interval '1 day', now() + interval '3 days', array['Évacuer le quai 4','Utiliser les sorties signalées'], array['Ne pas retourner chercher des affaires'], '[{"service":"Fire & Rescue","phone":"+999 118"}]', array[pg_temp.nid(3,4)], '[{"order":1,"title":"Évacuation","detail":"Quai 4 évacué."},{"order":2,"title":"Colmatage","detail":"Équipe technique."},{"order":3,"title":"Contrôle","detail":"Inspection avant réouverture."}]', 'Service travaux publics', pg_temp.nid(4,3), pg_temp.nid(7,3), now() - interval '1 day', 1, true),
  (pg_temp.nid(27,8),  'contagion-quarantine',    'Quarantaine après contagion', 'moderate', 'active', 'Mesures de quarantaine préventive dans le district médical. Exercice fictif.', array[pg_temp.nid(1,6)], now() - interval '6 days', now() + interval '8 days', array['Porter un masque','Se signaler au 115 en cas de symptôme'], array['Ne pas quitter le district sans autorisation'], '[{"service":"Emergency Medical","phone":"+999 115"}]', array[pg_temp.nid(3,6)], '[{"order":1,"title":"Isolement","detail":"Zone délimitée."},{"order":2,"title":"Dépistage","detail":"Tests gratuits."},{"order":3,"title":"Levée","detail":"Après validation médicale."}]', 'Direction de la santé (fictive)', pg_temp.nid(4,4), pg_temp.nid(7,4), now() - interval '6 days', 1, true),
  (pg_temp.nid(27,9),  'temporal-rift-anomaly',   'Anomalie de faille temporelle', 'info', 'active', 'Anomalie bénigne : les horloges publiques peuvent dériver de quelques secondes. Exercice fictif.', array[pg_temp.nid(1,1)], now() - interval '3 days', now() + interval '30 days', array['Vérifier l''heure sur les écrans officiels'], '{}', '[{"service":"Citizen Relations Office","phone":"+999 200 0001"}]', '{}', '[{"order":1,"title":"Signaler","detail":"Utilisez le formulaire de signalement."},{"order":2,"title":"Recalibrage","detail":"Les horloges sont recalibrées chaque nuit."}]', 'Mairie', pg_temp.nid(4,1), pg_temp.nid(7,1), now() - interval '3 days', 1, true),
  (pg_temp.nid(27,10), 'training-drill',          'Exercice d''entraînement', 'info', 'archived', 'Exercice annuel d''évacuation (archivé). Alerte fictive.', array[pg_temp.nid(1,1)], now() - interval '120 days', now() - interval '119 days', array['Suivre les consignes de l''exercice'], '{}', '[{"service":"Fire & Rescue","phone":"+999 118"}]', array[pg_temp.nid(3,1)], '[{"order":1,"title":"Évacuation simulée","detail":"Exercice."},{"order":2,"title":"Bilan","detail":"Retour d''expérience."}]', 'Fire & Rescue', pg_temp.nid(4,3), pg_temp.nid(7,3), now() - interval '120 days', 2, true)
on conflict (id) do nothing;

-- 28. cameras (simulées ; jamais de direct public)
insert into public.cameras (id, code, name, sector_id, building_id, x, y, status)
select pg_temp.nid(28, n), 'CAM-S' || lpad(n::text, 2, '0'), 'Caméra ' || s.name, pg_temp.nid(1, n), pg_temp.nid(3, n), s.x + 3, s.y + 3,
       case when n = 8 then 'offline' else 'online' end
from generate_series(1, 10) as n
join public.sectors s on s.id = pg_temp.nid(1, n)
on conflict (id) do nothing;

-- 30. audit_logs (exemples réalistes, insertion seule)
insert into public.audit_logs (id, actor_id, actor_type, action, entity_type, entity_id, old_value, new_value, reason, created_at) values
  (pg_temp.nid(30,1),  pg_temp.nid(7,1), 'user',   'update', 'profiles',        pg_temp.nid(7,6),   '{"role":"citizen"}',                '{"role":"agent"}',                 'Promotion agent voirie', now() - interval '40 days'),
  (pg_temp.nid(30,2),  pg_temp.nid(7,2), 'user',   'update', 'reports',         pg_temp.nid(18,2),  '{"status":"received"}',             '{"status":"validated"}',           null, now() - interval '5 days'),
  (pg_temp.nid(30,3),  pg_temp.nid(7,1), 'user',   'update', 'news',            pg_temp.nid(21,1),  '{"status":"pending_review"}',       '{"status":"published"}',           'Publication urgente', now() - interval '1 day'),
  (pg_temp.nid(30,4),  pg_temp.nid(7,1), 'user',   'update', 'services',        pg_temp.nid(4,10),  '{"status":"open"}',                 '{"status":"hidden"}',              'Service en cours de révision', now() - interval '12 days'),
  (pg_temp.nid(30,5),  pg_temp.nid(7,1), 'user',   'update', 'citizens',        pg_temp.nid(8,9),   '{"kyc_status":"pending"}',          '{"kyc_status":"rejected"}',        'CIN non conforme', now() - interval '19 days'),
  (pg_temp.nid(30,6),  pg_temp.nid(7,1), 'user',   'update', 'service_members',pg_temp.nid(9,10),  '{"revoked_at":null}',               '{"revoked_at":"revoked"}',         'Changement d''affectation', now() - interval '10 days'),
  (pg_temp.nid(30,7),  null,             'system', 'update', 'reports',         pg_temp.nid(18,4),  '{"status":"received"}',             '{"status":"to_verify"}',           'Détection automatique', now() - interval '3 hours'),
  (pg_temp.nid(30,8),  pg_temp.nid(7,5), 'user',   'update', 'requests',        pg_temp.nid(14,7),  '{"status":"in_progress"}',          '{"status":"resolved"}',            null, now() - interval '3 days'),
  (pg_temp.nid(30,9),  pg_temp.nid(7,1), 'user',   'update', 'profiles',        pg_temp.nid(7,9),   '{"account_status":"active"}',       '{"account_status":"suspended"}',   'Tentative de fraude CIN', now() - interval '19 days'),
  (pg_temp.nid(30,10), pg_temp.nid(7,1), 'user',   'update', 'role_permissions',pg_temp.nid(11,6),  '{"scope":"own"}',                   '{"scope":"service"}',              'Ajustement matrice D09', now() - interval '30 days')
on conflict (id) do nothing;

-- 31. api_synchronizations
insert into public.api_synchronizations (id, source, started_at, finished_at, status, items_imported, items_pending_validation, items_failed, error_log, external_ref) values
  (pg_temp.nid(31,1),  'nova_api',       now() - interval '6 days',  now() - interval '6 days'  + interval '40 seconds', 'success', 120, 0,  0, '[]', 'sync-001'),
  (pg_temp.nid(31,2),  'camera_feed',    now() - interval '5 days',  now() - interval '5 days'  + interval '35 seconds', 'success', 18,  18, 0, '[]', 'sync-002'),
  (pg_temp.nid(31,3),  'satellite_feed', now() - interval '5 days',  now() - interval '5 days'  + interval '50 seconds', 'success', 6,   6,  0, '[]', 'sync-003'),
  (pg_temp.nid(31,4),  'nova_api',       now() - interval '4 days',  now() - interval '4 days'  + interval '38 seconds', 'success', 130, 0,  0, '[]', 'sync-004'),
  (pg_temp.nid(31,5),  'camera_feed',    now() - interval '3 days',  now() - interval '3 days'  + interval '33 seconds', 'success', 22,  22, 0, '[]', 'sync-005'),
  (pg_temp.nid(31,6),  'satellite_feed', now() - interval '2 days',  now() - interval '2 days'  + interval '47 seconds', 'success', 5,   5,  0, '[]', 'sync-006'),
  (pg_temp.nid(31,7),  'nova_api',       now() - interval '12 hours',now() - interval '12 hours'+ interval '55 seconds', 'partial', 98,  3,  7, '[{"code":"E_SCHEMA","message":"7 éléments rejetés : champ sector manquant"}]', 'sync-007'),
  (pg_temp.nid(31,8),  'camera_feed',    now() - interval '10 hours',now() - interval '10 hours'+ interval '30 seconds', 'partial', 15,  15, 3, '[{"code":"E_CAM_OFFLINE","message":"Caméra CAM-S08 hors ligne"}]', 'sync-008'),
  (pg_temp.nid(31,9),  'satellite_feed', now() - interval '6 hours', now() - interval '6 hours' + interval '12 seconds', 'failed',  0,   0,  0, '[{"code":"E_TIMEOUT","message":"Le flux satellite n''a pas répondu"}]', 'sync-009'),
  (pg_temp.nid(31,10), 'nova_api',       now() - interval '1 minute', null, 'running', 0, 0, 0, '[]', 'sync-010')
on conflict (id) do nothing;

-- 32. chat_sessions
insert into public.chat_sessions (id, profile_id, channel, keep_history, language, started_at, escalated_to_agent) values
  (pg_temp.nid(32,1),  pg_temp.nid(7,7),  'text',  true,  'fr', now() - interval '3 days', false),
  (pg_temp.nid(32,2),  pg_temp.nid(7,7),  'voice', true,  'fr', now() - interval '2 days', false),
  (pg_temp.nid(32,3),  pg_temp.nid(7,8),  'text',  false, 'fr', now() - interval '2 days', false),
  (pg_temp.nid(32,4),  pg_temp.nid(7,10), 'text',  true,  'fr', now() - interval '1 day',  false),
  (pg_temp.nid(32,5),  pg_temp.nid(7,5),  'text',  true,  'en', now() - interval '1 day',  false),
  (pg_temp.nid(32,6),  pg_temp.nid(7,6),  'voice', false, 'en', now() - interval '20 hours', false),
  (pg_temp.nid(32,7),  pg_temp.nid(7,7),  'text',  true,  'fr', now() - interval '6 hours', true),
  (pg_temp.nid(32,8),  pg_temp.nid(7,8),  'voice', true,  'fr', now() - interval '5 hours', false),
  (pg_temp.nid(32,9),  pg_temp.nid(7,2),  'text',  false, 'fr', now() - interval '3 hours', false),
  (pg_temp.nid(32,10), pg_temp.nid(7,7),  'text',  true,  'fr', now() - interval '30 minutes', false)
on conflict (id) do nothing;

-- 33. chat_messages (sources liées aux pages officielles ; 1 action en attente de confirmation)
insert into public.chat_messages (id, session_id, role, content, sources, confidence, pending_action, created_at) values
  (pg_temp.nid(33,1),  pg_temp.nid(32,1),  'user',      'Quels documents pour renouveler mon titre de résidence ?', '[]', null, null, now() - interval '3 days'),
  (pg_temp.nid(33,2),  pg_temp.nid(32,1),  'assistant', 'Il faut votre CIN. Le service Relations citoyennes vous guide pas à pas.', '[{"type":"service","title":"Citizen Relations Office","url":"/services/citizen-relations"}]', 0.91, null, now() - interval '3 days'),
  (pg_temp.nid(33,3),  pg_temp.nid(32,2),  'user',      'Où se trouve l''hôpital ?', '[]', null, null, now() - interval '2 days'),
  (pg_temp.nid(33,4),  pg_temp.nid(32,2),  'assistant', 'L''hôpital central Vitalis est au 3 Avenue Vitalis, secteur S-06, ouvert 24 h/24.', '[{"type":"service","title":"Emergency Medical","url":"/services/emergency-medical"}]', 0.95, null, now() - interval '2 days'),
  (pg_temp.nid(33,5),  pg_temp.nid(32,3),  'user',      'Que faire en cas d''invasion extraterrestre ?', '[]', null, null, now() - interval '2 days'),
  (pg_temp.nid(33,6),  pg_temp.nid(32,3),  'assistant', 'Restez à l''abri et suivez les annonces officielles. Voici le protocole complet (exercice fictif).', '[{"type":"danger","title":"Protocole d''invasion extraterrestre","url":"/dangers/alien-invasion-protocol"}]', 0.97, null, now() - interval '2 days'),
  (pg_temp.nid(33,7),  pg_temp.nid(32,7),  'user',      'Je voudrais signaler une panne réseau à Cipher Quarter.', '[]', null, null, now() - interval '6 hours'),
  (pg_temp.nid(33,8),  pg_temp.nid(32,7),  'assistant', 'Je peux préparer ce signalement. Confirmez-vous la création ?', '[]', 0.88, '{"type":"create_report","draft":{"title":"Panne réseau dans le quartier Cipher","category":"infrastructure","sector":"S-08"},"status":"awaiting_confirmation"}', now() - interval '6 hours'),
  (pg_temp.nid(33,9),  pg_temp.nid(32,9),  'user',      'Quel est le numéro de la police ?', '[]', null, null, now() - interval '3 hours'),
  (pg_temp.nid(33,10), pg_temp.nid(32,9),  'assistant', 'La police est joignable au +999 112 (24 h/24).', '[{"type":"service","title":"Nova Police","url":"/services/nova-police"}]', 0.99, null, now() - interval '3 hours')
on conflict (id) do nothing;

-- 34. knowledge_base (extraits publiés des services, actualités et dangers)
insert into public.knowledge_base (id, entity_type, entity_id, title, content, url, version, is_published, content_hash) values
  (pg_temp.nid(34,1),  'service', pg_temp.nid(4,1),  'Citizen Relations Office', 'Guichet unique : questions, démarches et orientation. Ouvert du lundi au vendredi 08:00-17:00 et le samedi 09:00-12:00. Documents : CIN.', '/services/citizen-relations', 1, true, md5('Citizen Relations Office v1')),
  (pg_temp.nid(34,2),  'service', pg_temp.nid(4,2),  'Nova Police', 'Sécurité publique ouverte 24 h/24. Téléphone +999 112 0002. Étapes : signaler l''incident puis être contacté par un agent.', '/services/nova-police', 1, true, md5('Nova Police v1')),
  (pg_temp.nid(34,3),  'service', pg_temp.nid(4,4),  'Emergency Medical', 'Ambulances et urgences 24 h/24. Appelez le 115 et décrivez l''état de la personne.', '/services/emergency-medical', 1, true, md5('Emergency Medical v1')),
  (pg_temp.nid(34,4),  'service', pg_temp.nid(4,5),  'Public Works & Roads', 'Voirie et éclairage public. Pour signaler un problème : indiquez le secteur, le bâtiment et ajoutez une photo.', '/services/public-works', 1, true, md5('Public Works v1')),
  (pg_temp.nid(34,5),  'service', pg_temp.nid(4,7),  'Transport Authority', 'Lignes de tram T1, maglev M1, sky-pods, navettes et ferry. Consultez la carte pour les itinéraires.', '/services/transport-authority', 1, true, md5('Transport Authority v1')),
  (pg_temp.nid(34,6),  'news',    pg_temp.nid(21,1), 'Inspection de la coque à Ferrum Docks', 'Le quai 4 est partiellement fermé pendant 48 h. Les drones de fret passent par le quai 2.', '/news/inspection-coque-ferrum-docks', 1, true, md5('News inspection v1')),
  (pg_temp.nid(34,7),  'news',    pg_temp.nid(21,9), 'Comment déposer un signalement', 'Vérifiez votre identité, choisissez le secteur et le bâtiment, décrivez le problème, joignez une photo. La dictée vocale est possible.', '/news/comment-deposer-un-signalement', 1, true, md5('News report guide v1')),
  (pg_temp.nid(34,8),  'danger',  pg_temp.nid(27,1), 'Protocole d''invasion extraterrestre', 'Huit étapes : identifier, confirmer, informer, rester à l''abri, éviter les zones, coordonner, publier, clôturer. Alerte fictive.', '/dangers/alien-invasion-protocol', 3, true, md5('Danger alien v3')),
  (pg_temp.nid(34,9),  'faq',     null,              'Qui peut déposer un signalement ?', 'Seuls les habitants dont l''identité (CIN fictif) est vérifiée peuvent déposer un signalement. Tous les habitants peuvent consulter les informations.', '/guide', 1, true, md5('FAQ report v1')),
  (pg_temp.nid(34,10), 'service', pg_temp.nid(4,10), 'Urban Planning', 'Contenu non publié (service masqué).', '/services/urban-planning', 1, false, md5('Urban Planning v1'))
on conflict (id) do nothing;

-- 35. ai_generated_content (génération IA validée par un humain avant publication)
insert into public.ai_generated_content (id, target_table, target_id, model, prompt_version, payload, status, reviewed_by, reviewed_at) values
  (pg_temp.nid(35,1),  'sectors',   pg_temp.nid(1,1),  'openrouter/auto', 'city-v1', '{"description":"Cœur administratif suspendu au-dessus du lac céleste."}', 'validated', pg_temp.nid(7,1), now() - interval '50 days'),
  (pg_temp.nid(35,2),  'sectors',   pg_temp.nid(1,3),  'openrouter/auto', 'city-v1', '{"description":"Anneau de fusion alimentant toute la ville."}',              'validated', pg_temp.nid(7,1), now() - interval '50 days'),
  (pg_temp.nid(35,3),  'buildings', pg_temp.nid(3,5),  'openrouter/auto', 'city-v1', '{"description":"Dôme botanique abritant 4 000 espèces."}',                  'validated', pg_temp.nid(7,1), now() - interval '49 days'),
  (pg_temp.nid(35,4),  'buildings', pg_temp.nid(3,7),  'openrouter/auto', 'city-v1', '{"description":"Spatioport reliant Nova Terra aux colonies."}',              'validated', pg_temp.nid(7,1), now() - interval '49 days'),
  (pg_temp.nid(35,5),  'services',  pg_temp.nid(4,7),  'openrouter/auto', 'city-v1', '{"description":"Réseau intégré de tram, maglev et sky-pods."}',              'validated', pg_temp.nid(7,1), now() - interval '48 days'),
  (pg_temp.nid(35,6),  'services',  pg_temp.nid(4,10), 'openrouter/auto', 'city-v1', '{"description":"Permis de construire pour structures suspendues."}',        'pending',   null, null),
  (pg_temp.nid(35,7),  'sectors',   pg_temp.nid(1,9),  'openrouter/auto', 'city-v1', '{"description":"Citadelle de sécurité surveillant les approches."}',        'validated', pg_temp.nid(7,1), now() - interval '48 days'),
  (pg_temp.nid(35,8),  'buildings', pg_temp.nid(3,8),  'openrouter/auto', 'city-v2', '{"description":"Centre de données refroidi par le vent d''altitude."}',       'pending',   null, null),
  (pg_temp.nid(35,9),  'services',  pg_temp.nid(4,8),  'openrouter/auto', 'city-v2', '{"description":"Compostage orbital des déchets organiques."}',               'rejected',  pg_temp.nid(7,1), now() - interval '10 days'),
  (pg_temp.nid(35,10), 'sectors',   pg_temp.nid(1,10), 'openrouter/auto', 'city-v2', '{"description":"Flèche universitaire dominant les jardins d''Aurora."}',    'pending',   null, null)
on conflict (id) do nothing;

-- 36. accessibility_preferences — vision (contraste/taille), assistance vocale, malentendants, guide vocal
insert into public.accessibility_preferences (id, profile_id, needs, theme, font_scale, line_spacing, reduce_motion, read_screen_aloud, voice_navigation, voice_guide, tts_rate, speech_lang, captions, visual_alerts) values
  (pg_temp.nid(36,1),  pg_temp.nid(7,1),  '{}',                                         'default',             1.00, 1.00, false, false, false, false, 1.00, 'fr-FR', false, false),
  (pg_temp.nid(36,2),  pg_temp.nid(7,2),  '{}',                                         'default',             1.00, 1.00, false, false, false, false, 1.00, 'fr-FR', false, false),
  (pg_temp.nid(36,3),  pg_temp.nid(7,3),  '{}',                                         'default',             1.00, 1.00, false, false, false, true,  1.00, 'en-US', false, false),
  (pg_temp.nid(36,4),  pg_temp.nid(7,4),  array['hard_of_hearing']::public.accessibility_need[], 'default',    1.00, 1.00, false, true,  true,  true,  0.90, 'fr-FR', true,  false),
  (pg_temp.nid(36,5),  pg_temp.nid(7,5),  array['hard_of_hearing']::public.accessibility_need[], 'default',    1.00, 1.00, false, true,  true,  true,  1.10, 'fr-FR', true,  false),
  (pg_temp.nid(36,6),  pg_temp.nid(7,6),  array['low_vision','hard_of_hearing']::public.accessibility_need[], 'high_contrast_light', 1.50, 1.25, true, true, true, true, 1.00, 'en-US', true, true),
  (pg_temp.nid(36,7),  pg_temp.nid(7,7),  array['low_vision']::public.accessibility_need[],      'high_contrast_dark',  1.50, 1.25, true,  false, false, false, 1.00, 'fr-FR', false, false),
  (pg_temp.nid(36,8),  pg_temp.nid(7,8),  array['low_vision']::public.accessibility_need[],      'yellow_on_black',     1.80, 1.50, true,  false, false, false, 1.00, 'fr-FR', false, false),
  (pg_temp.nid(36,9),  pg_temp.nid(7,9),  array['hard_of_hearing']::public.accessibility_need[], 'default',            1.00, 1.00, false, false, false, false, 1.00, 'en-US', true,  true),
  (pg_temp.nid(36,10), pg_temp.nid(7,10), '{}',                                         'default',             1.00, 1.00, false, false, false, false, 1.00, 'fr-FR', false, false)
on conflict (id) do nothing;

-- 37. guide_tours
insert into public.guide_tours (id, code, title, description, audience, route_scope, is_published, estimated_minutes) values
  (pg_temp.nid(37,1),  'welcome',               'Bienvenue à Nova Terra',        'Découvrez les zones principales du portail.',            array['citizen','agent','service_admin','general_admin']::public.user_role[], '/',            true, 3),
  (pg_temp.nid(37,2),  'services-news',         'Services et actualités',        'Trouver un service et lire les annonces.',               array['citizen']::public.user_role[], '/services',    true, 2),
  (pg_temp.nid(37,3),  'map',                   'La carte interactive',          'Secteurs, bâtiments, transports et itinéraires.',        array['citizen']::public.user_role[], '/map',         true, 3),
  (pg_temp.nid(37,4),  'send-request',          'Envoyer une demande',           'Contacter un service et suivre sa demande.',             array['citizen']::public.user_role[], '/app/requests', true, 2),
  (pg_temp.nid(37,5),  'file-report',           'Déposer un signalement',        'Formulaire, dictée vocale et preuves.',                  array['citizen']::public.user_role[], '/app/reports',  true, 3),
  (pg_temp.nid(37,6),  'chatbot',               'L''assistant virtuel',          'Poser une question à voix haute ou par écrit.',          array['citizen']::public.user_role[], '/app/assistant', true, 2),
  (pg_temp.nid(37,7),  'dangers',               'Dangers et alertes',            'Consulter les protocoles et alertes officielles.',       array['citizen']::public.user_role[], '/dangers',      true, 2),
  (pg_temp.nid(37,8),  'profile-accessibility', 'Profil et accessibilité',       'Contraste, taille du texte et assistance vocale.',       array['citizen','agent','service_admin','general_admin']::public.user_role[], '/app/accessibility', true, 2),
  (pg_temp.nid(37,9),  'agent-workspace',       'Espace de travail des agents',  'Tableau de bord, demandes, signalements et preuves.',    array['agent','service_admin','general_admin']::public.user_role[], '/agent',       true, 4),
  (pg_temp.nid(37,10), 'admin-console',         'Console d''administration',     'Utilisateurs, droits, modération et audit.',             array['general_admin']::public.user_role[], '/admin',        true, 4)
on conflict (id) do nothing;

-- 38. guide_tour_steps — parcours « Bienvenue » complet (10 étapes) ; texte affiché + script vocal
insert into public.guide_tour_steps (id, tour_id, step_order, route, target_selector, title, body, voice_script, placement, locale) values
  (pg_temp.nid(38,1),  pg_temp.nid(37,1), 1,  '/', null,                              'Bienvenue',                'Nova Terra est la ville du futur. Ce guide vous présente le portail en quelques étapes.', 'Bienvenue à Nova Terra. Ce guide vous présente le portail en quelques étapes.', 'center', 'fr'),
  (pg_temp.nid(38,2),  pg_temp.nid(37,1), 2,  '/', '[data-tour="header"]',           'Le menu principal',        'Le menu en haut de page donne accès aux services, aux actualités, à la carte et aux dangers.', 'En haut de la page, le menu principal vous donne accès aux services, aux actualités, à la carte et aux dangers.', 'bottom', 'fr'),
  (pg_temp.nid(38,3),  pg_temp.nid(37,1), 3,  '/', '[data-tour="global-search"]',    'La recherche',             'Tapez un mot-clé pour trouver un service, une actualité ou un bâtiment.', 'La barre de recherche vous aide à trouver un service, une actualité ou un bâtiment.', 'bottom', 'fr'),
  (pg_temp.nid(38,4),  pg_temp.nid(37,1), 4,  '/', '[data-tour="services"]',         'Les services',             'Consultez les horaires, les documents nécessaires et la localisation de chaque service.', 'Ici, vous trouvez les services de la ville, leurs horaires et les documents nécessaires.', 'top', 'fr'),
  (pg_temp.nid(38,5),  pg_temp.nid(37,1), 5,  '/', '[data-tour="news"]',             'Les actualités',           'Les annonces importantes et urgentes sont mises en avant.', 'Les actualités de la ville sont ici. Les informations urgentes sont mises en avant.', 'top', 'fr'),
  (pg_temp.nid(38,6),  pg_temp.nid(37,1), 6,  '/', '[data-tour="map"]',              'La carte',                 'La carte en ruche présente les secteurs, les bâtiments et les transports.', 'La carte en forme de ruche présente les secteurs, les bâtiments et les transports.', 'top', 'fr'),
  (pg_temp.nid(38,7),  pg_temp.nid(37,1), 7,  '/', '[data-tour="chatbot"]',          'L''assistant',             'Posez une question par écrit ou à voix haute. L''assistant cite toujours ses sources.', 'L''assistant répond à vos questions par écrit ou à voix haute, et cite ses sources.', 'left', 'fr'),
  (pg_temp.nid(38,8),  pg_temp.nid(37,1), 8,  '/', '[data-tour="report-cta"]',       'Signaler un problème',     'Après vérification de votre identité, vous pouvez signaler un problème dans votre secteur.', 'Ce bouton permet de signaler un problème. Votre identité doit d''abord être vérifiée.', 'top', 'fr'),
  (pg_temp.nid(38,9),  pg_temp.nid(37,1), 9,  '/', '[data-tour="accessibility-menu"]','Accessibilité',          'Ajustez le contraste, la taille du texte ou activez l''assistance vocale.', 'Ce menu règle le contraste, la taille du texte et l''assistance vocale.', 'bottom', 'fr'),
  (pg_temp.nid(38,10), pg_temp.nid(37,1), 10, '/', '[data-tour="help"]',             'Besoin d''aide ?',         'Rouvrez ce guide à tout moment depuis le bouton d''aide.', 'Vous pouvez rouvrir ce guide à tout moment avec le bouton d''aide. Bonne visite !', 'bottom', 'fr')
on conflict (id) do nothing;

-- 39. voice_commands (phrases en français et en anglais ; mutations toujours confirmées)
insert into public.voice_commands (id, code, locale, phrases, action, target, description, requires_confirmation, min_role) values
  (pg_temp.nid(39,1),  'go-home',       'any', array['accueil','retour à l''accueil','page d''accueil','go home','home'],               'navigate', '/',             'Aller à la page d''accueil.', false, null),
  (pg_temp.nid(39,2),  'open-services', 'any', array['services','ouvre les services','liste des services','open services'],            'navigate', '/services',     'Ouvrir la liste des services.', false, null),
  (pg_temp.nid(39,3),  'open-news',     'any', array['actualités','ouvre les actualités','les nouvelles','open news'],                 'navigate', '/news',         'Ouvrir les actualités.', false, null),
  (pg_temp.nid(39,4),  'open-map',      'any', array['carte','ouvre la carte','plan de la ville','open the map','map'],                'navigate', '/map',          'Ouvrir la carte interactive.', false, null),
  (pg_temp.nid(39,5),  'open-chatbot',  'any', array['assistant','ouvre l''assistant','parler à l''assistant','open assistant'],       'navigate', '/app/assistant','Ouvrir l''assistant virtuel.', false, 'citizen'),
  (pg_temp.nid(39,6),  'new-report',    'any', array['nouveau signalement','signaler un problème','new report','report a problem'],     'navigate', '/app/reports/new','Commencer un signalement (identité vérifiée requise).', true, 'citizen'),
  (pg_temp.nid(39,7),  'my-requests',   'any', array['mes demandes','suivre mes demandes','my requests'],                              'navigate', '/app/requests', 'Voir mes demandes et leur statut.', false, 'citizen'),
  (pg_temp.nid(39,8),  'read-page',     'any', array['lis la page','lis l''écran','read this page','read the screen'],                 'read',     null,            'Lire le contenu de la page à voix haute.', false, null),
  (pg_temp.nid(39,9),  'help',          'any', array['aide','où suis-je','que puis-je dire','help','where am i'],                      'help',     null,            'Expliquer la page actuelle et les commandes vocales disponibles.', false, null),
  (pg_temp.nid(39,10), 'stop',          'any', array['stop','arrête','silence','annuler','cancel'],                                    'stop',     null,            'Arrêter la lecture ou annuler l''action en cours.', false, null)
on conflict (id) do nothing;

-- Tables du starter : 10 lignes chacune (le trigger de notification admin est coupé pour ne pas dupliquer les notifications)
alter table public.contact_messages disable trigger on_contact_message_notify_admins;
insert into public.contact_messages (id, name, email, message, status, created_at) values
  (pg_temp.nid(40,1),  'Elio Marchetti', 'elio@novaterra.test',  'Bonjour, j''ai une question sur les horaires de la mairie.', 'closed', now() - interval '20 days'),
  (pg_temp.nid(40,2),  'Jade Okafor',    'jade@novaterra.test',  'Je souhaite connaître les étapes de la vérification d''identité.', 'read', now() - interval '12 days'),
  (pg_temp.nid(40,3),  'Visiteur A',     'visiteur.a@novaterra.test', 'Comment accéder à la carte depuis mon téléphone ?', 'new', now() - interval '9 days'),
  (pg_temp.nid(40,4),  'Visiteur B',     'visiteur.b@novaterra.test', 'Le site est-il accessible aux personnes malvoyantes ?', 'read', now() - interval '8 days'),
  (pg_temp.nid(40,5),  'Visiteur C',     'visiteur.c@novaterra.test', 'Peut-on payer une facture en ligne ?', 'closed', now() - interval '7 days'),
  (pg_temp.nid(40,6),  'Visiteur D',     'visiteur.d@novaterra.test', 'Je veux proposer une idée pour le dôme Lumen.', 'new', now() - interval '6 days'),
  (pg_temp.nid(40,7),  'Visiteur E',     'visiteur.e@novaterra.test', 'Y a-t-il une application mobile pour Nova Terra ?', 'new', now() - interval '5 days'),
  (pg_temp.nid(40,8),  'Visiteur F',     'visiteur.f@novaterra.test', 'Bonjour, mon compte est suspendu, que faire ?', 'read', now() - interval '4 days'),
  (pg_temp.nid(40,9),  'Visiteur G',     'visiteur.g@novaterra.test', 'Merci pour l''assistant vocal, très pratique !', 'closed', now() - interval '3 days'),
  (pg_temp.nid(40,10), 'Visiteur H',     'visiteur.h@novaterra.test', 'Je ne reçois pas l''e-mail de confirmation.', 'new', now() - interval '1 day')
on conflict (id) do nothing;
alter table public.contact_messages enable trigger on_contact_message_notify_admins;

insert into public.ai_usage (user_id, usage_date, request_count)
select pg_temp.nid(7, n), current_date, (n * 2) % 20
from generate_series(1, 10) as n
on conflict (user_id, usage_date) do nothing;

alter table public.news enable trigger audit_row_change;
alter table public.services enable trigger audit_row_change;
