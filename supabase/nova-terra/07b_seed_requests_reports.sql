-- ============================================================================
-- NOVA TERRA — 07b : données fictives — demandes et signalements (tables 14-20, 29)
-- DONNÉES FICTIVES. Prérequis : 07a. Relançable (on conflict do nothing).
-- ============================================================================

create or replace function pg_temp.nid(t int, n int) returns uuid language sql immutable as $$
  select (lpad(t::text, 8, '0') || '-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid
$$;

alter table public.requests disable trigger audit_row_change;
alter table public.reports  disable trigger audit_row_change;

-- 14. requests — couvre les 10 statuts, 2 en retard, 2 avec pièces jointes, 1 via chatbot, 1 via appel support
insert into public.requests (id, tracking_number, requester_id, service_id, assigned_agent_id, category, subject, description,
  priority, status, urgency_flag, due_at, satisfaction, attachments, resolution_note, closed_at, source, created_at) values
  (pg_temp.nid(14,1),  'NT-REQ-2026-0001', pg_temp.nid(7,7),  pg_temp.nid(4,1), null,              'information', 'Question sur un titre de résidence', 'Je souhaite connaître les documents nécessaires pour renouveler mon titre de résidence à Aurora Heights.', 'medium',   'new',          false, now() + interval '72 hours',  null, '[]', null, null, 'web',          now() - interval '2 hours'),
  (pg_temp.nid(14,2),  'NT-REQ-2026-0002', pg_temp.nid(7,8),  pg_temp.nid(4,5), null,              'infrastructure','Lampadaire défaillant secteur Lumen', 'Le lampadaire devant le dôme botanique clignote depuis trois nuits, photo jointe.', 'low',      'received',     false, now() + interval '90 hours',  null, '[{"path":"request-attachments/00000007-0000-4000-8000-000000000008/00000014-0000-4000-8000-000000000002/lampadaire.jpg","name":"lampadaire.jpg","mime":"image/jpeg"}]', null, null, 'web', now() - interval '1 day'),
  (pg_temp.nid(14,3),  'NT-REQ-2026-0003', pg_temp.nid(7,7),  pg_temp.nid(4,6), null,              'billing',     'Facture d''énergie inhabituelle', 'Ma facture énergie du mois est trois fois plus élevée que d''habitude, pouvez-vous vérifier ?', 'medium',   'to_qualify',   false, now() + interval '40 hours',  null, '[]', null, null, 'chatbot',      now() - interval '1 day'),
  (pg_temp.nid(14,4),  'NT-REQ-2026-0004', pg_temp.nid(7,7),  pg_temp.nid(4,5), pg_temp.nid(7,6),  'infrastructure','Nid-de-poule sur le quai 4', 'Un nid-de-poule profond sur la voie principale de Ferrum Docks gêne les drones de fret.', 'high',     'assigned',     true,  now() - interval '2 days',    null, '[]', null, null, 'web',          now() - interval '5 days'),
  (pg_temp.nid(14,5),  'NT-REQ-2026-0005', pg_temp.nid(7,8),  pg_temp.nid(4,7), pg_temp.nid(7,6),  'transport',   'Retards répétés du tram T1', 'Le tram T1 a plus de 15 minutes de retard chaque matin à la station Nexus. Capture d''écran jointe.', 'medium',   'in_progress',  false, now() - interval '1 day',     null, '[{"path":"request-attachments/00000007-0000-4000-8000-000000000008/00000014-0000-4000-8000-000000000005/horaires.png","name":"horaires.png","mime":"image/png"}]', null, null, 'web', now() - interval '6 days'),
  (pg_temp.nid(14,6),  'NT-REQ-2026-0006', pg_temp.nid(7,7),  pg_temp.nid(4,2), pg_temp.nid(7,2),  'safety',      'Dépôt de plainte pour vol de hoverbike', 'Mon véhicule a été volé devant la tour Aurora. Merci de préciser les pièces à fournir.', 'high',     'waiting_info', true,  now() + interval '10 hours',  null, '[]', null, null, 'web',          now() - interval '3 days'),
  (pg_temp.nid(14,7),  'NT-REQ-2026-0007', pg_temp.nid(7,7),  pg_temp.nid(4,1), pg_temp.nid(7,5),  'information', 'Attestation de résidence', 'Je demande une attestation de résidence pour mon dossier de bourse.', 'low',      'resolved',     false, now() - interval '4 days',    null, '[]', 'Attestation émise et envoyée par message sécurisé.', now() - interval '3 days', 'web', now() - interval '9 days'),
  (pg_temp.nid(14,8),  'NT-REQ-2026-0008', pg_temp.nid(7,8),  pg_temp.nid(4,8), pg_temp.nid(7,6),  'environment', 'Dépôt sauvage près du dôme', 'Des caisses sont abandonnées à l''entrée du dôme botanique.', 'medium',   'closed',       false, now() - interval '8 days',    4,    '[]', 'Dépôt évacué par l''équipe de collecte le 2026-09-24.', now() - interval '7 days', 'web', now() - interval '12 days'),
  (pg_temp.nid(14,9),  'NT-REQ-2026-0009', pg_temp.nid(7,10), pg_temp.nid(4,9), pg_temp.nid(7,5),  'education',   'Inscription à l''université', 'Je souhaite m''inscrire à l''université de la Flèche Academia.', 'low',      'rejected',     false, now() - interval '2 days',    null, '[]', 'Rejetée : l''âge minimum de 16 ans n''est pas atteint pour cette filière.', null, 'web', now() - interval '10 days'),
  (pg_temp.nid(14,10), 'NT-REQ-2026-0010', pg_temp.nid(7,7),  pg_temp.nid(4,6), null,              'billing',     'Annulation d''un raccordement', 'Je souhaite annuler la demande de raccordement faite par erreur.', 'low',      'cancelled',    false, now() - interval '1 day',     null, '[]', null, null, 'support_call', now() - interval '4 days')
on conflict (id) do nothing;

-- 15. request_comments (publics et notes internes)
insert into public.request_comments (id, request_id, author_id, body, is_internal, created_at) values
  (pg_temp.nid(15,1),  pg_temp.nid(14,4),  pg_temp.nid(7,5), 'Demande affectée à l''équipe voirie, intervention prévue sous 48 h.', false, now() - interval '4 days'),
  (pg_temp.nid(15,2),  pg_temp.nid(14,4),  pg_temp.nid(7,6), 'Note : le quai est partiellement fermé, prévoir une signalisation.', true,  now() - interval '4 days'),
  (pg_temp.nid(15,3),  pg_temp.nid(14,5),  pg_temp.nid(7,6), 'Nous analysons les horaires de la ligne T1 avec l''autorité de transport.', false, now() - interval '5 days'),
  (pg_temp.nid(15,4),  pg_temp.nid(14,5),  pg_temp.nid(7,6), 'Le retard vient d''un capteur de voie défectueux, à confirmer.', true,  now() - interval '4 days'),
  (pg_temp.nid(15,5),  pg_temp.nid(14,6),  pg_temp.nid(7,2), 'Merci de nous envoyer le numéro de plaque et une photo du véhicule.', false, now() - interval '2 days'),
  (pg_temp.nid(15,6),  pg_temp.nid(14,6),  pg_temp.nid(7,7), 'Plaque NT-AX-0007, photo à venir.', false, now() - interval '2 days'),
  (pg_temp.nid(15,7),  pg_temp.nid(14,7),  pg_temp.nid(7,5), 'Votre attestation est prête et jointe à votre espace.', false, now() - interval '3 days'),
  (pg_temp.nid(15,8),  pg_temp.nid(14,8),  pg_temp.nid(7,6), 'Collecte réalisée, dossier clôturé.', false, now() - interval '7 days'),
  (pg_temp.nid(15,9),  pg_temp.nid(14,9),  pg_temp.nid(7,5), 'Rappel : un parrain majeur doit signer le dossier d''un mineur.', true,  now() - interval '9 days'),
  (pg_temp.nid(15,10), pg_temp.nid(14,2),  pg_temp.nid(7,5), 'Demande reçue et transmise au service de la voirie.', false, now() - interval '20 hours')
on conflict (id) do nothing;

-- 16. request_status_history
insert into public.request_status_history (id, request_id, from_status, to_status, changed_by, reason, changed_at) values
  (pg_temp.nid(16,1),  pg_temp.nid(14,2),  'new',          'received',     pg_temp.nid(7,5), null, now() - interval '20 hours'),
  (pg_temp.nid(16,2),  pg_temp.nid(14,4),  'received',     'assigned',     pg_temp.nid(7,5), 'Affectation à l''agent de voirie', now() - interval '4 days'),
  (pg_temp.nid(16,3),  pg_temp.nid(14,5),  'assigned',     'in_progress',  pg_temp.nid(7,6), null, now() - interval '5 days'),
  (pg_temp.nid(16,4),  pg_temp.nid(14,6),  'in_progress',  'waiting_info', pg_temp.nid(7,2), 'Besoin du numéro de plaque', now() - interval '2 days'),
  (pg_temp.nid(16,5),  pg_temp.nid(14,7),  'new',          'received',     pg_temp.nid(7,5), null, now() - interval '9 days'),
  (pg_temp.nid(16,6),  pg_temp.nid(14,7),  'received',     'in_progress',  pg_temp.nid(7,5), null, now() - interval '8 days'),
  (pg_temp.nid(16,7),  pg_temp.nid(14,7),  'in_progress',  'resolved',     pg_temp.nid(7,5), 'Attestation émise', now() - interval '3 days'),
  (pg_temp.nid(16,8),  pg_temp.nid(14,8),  'resolved',     'closed',       pg_temp.nid(7,6), 'Confirmé par le citoyen', now() - interval '7 days'),
  (pg_temp.nid(16,9),  pg_temp.nid(14,9),  'new',          'rejected',     pg_temp.nid(7,5), 'Âge minimum non atteint', now() - interval '9 days'),
  (pg_temp.nid(16,10), pg_temp.nid(14,10), 'new',          'cancelled',    pg_temp.nid(7,7), 'Demande faite par erreur', now() - interval '4 days')
on conflict (id) do nothing;

-- 17. report_clusters (regroupement par type / localisation ; report_count est tenu à jour par trigger)
insert into public.report_clusters (id, title, category, sector_id, building_id, centroid_x, centroid_y, cluster_key) values
  (pg_temp.nid(17,1),  'Éclairage instable — Helios Grid',      'infrastructure', pg_temp.nid(1,3),  pg_temp.nid(3,3),  86.6,  -150,   'lighting@S-03'),
  (pg_temp.nid(17,2),  'Nuisances sonores — Aurora Heights',    'noise',          pg_temp.nid(1,2),  pg_temp.nid(3,2),  173.2, 0,      'noise@S-02'),
  (pg_temp.nid(17,3),  'Voirie dégradée — Ferrum Docks',        'infrastructure', pg_temp.nid(1,4),  pg_temp.nid(3,4),  -86.6, -150,   'road_damage@S-04'),
  (pg_temp.nid(17,4),  'Fumée suspecte — Vitalis District',     'health',         pg_temp.nid(1,6),  pg_temp.nid(3,6),  -86.6, 150,    'smoke@S-06'),
  (pg_temp.nid(17,5),  'Retards de transport — Orbis Port',     'transport',      pg_temp.nid(1,7),  pg_temp.nid(3,7),  86.6,  150,    'transport_delay@S-07'),
  (pg_temp.nid(17,6),  'Dépôts sauvages — Lumen Gardens',       'environment',    pg_temp.nid(1,5),  pg_temp.nid(3,5),  -173.2, 0,     'dumping@S-05'),
  (pg_temp.nid(17,7),  'Activité suspecte — Sentinel Ward',     'safety',         pg_temp.nid(1,9),  pg_temp.nid(3,9),  -259.8, 150,   'suspicious@S-09'),
  (pg_temp.nid(17,8),  'Pannes réseau — Cipher Quarter',        'infrastructure', pg_temp.nid(1,8),  pg_temp.nid(3,8),  259.8, -150,   'network@S-08'),
  (pg_temp.nid(17,9),  'Pannes d''éclairage — Academia Spire',  'infrastructure', pg_temp.nid(1,10), pg_temp.nid(3,10), 259.8, 150,    'lighting@S-10'),
  (pg_temp.nid(17,10), 'Affluence — Nexus Core',                'safety',         pg_temp.nid(1,1),  pg_temp.nid(3,1),  0,     0,      'crowd@S-01')
on conflict (id) do nothing;

-- 18. reports — tous les statuts ; sources citoyen, agent, chatbot, caméra, satellite, API ; 1 transcription vocale
insert into public.reports (id, report_number, title, description, category, sector_id, building_id, x, y, observed_at, source,
  reporter_citizen_id, reporter_system, service_id, assigned_agent_id, priority, status, confidence_score, facts,
  voice_transcript, transcript_reviewed, cluster_id, validated_by, validated_at, resolved_at, is_public, created_at) values
  (pg_temp.nid(18,1),  'NT-REP-2026-0001', 'Lampadaires qui clignotent près de la centrale', 'Les lampadaires de l''anneau Helios clignotent chaque soir depuis trois jours.', 'infrastructure', pg_temp.nid(1,3), pg_temp.nid(3,3), 90, -145, now() - interval '1 day', 'citizen', pg_temp.nid(8,7), null, pg_temp.nid(4,5), null, 'medium', 'received', null, '{"lamps":6,"duration_days":3}', null, false, pg_temp.nid(17,1), null, null, null, false, now() - interval '1 day'),
  (pg_temp.nid(18,2),  'NT-REP-2026-0002', 'Bruit excessif nocturne à la tour Aurora', 'Musique très forte et vibrations entre 2 h et 4 h du matin au 40e étage.', 'noise', pg_temp.nid(1,2), pg_temp.nid(3,2), 170, 5, now() - interval '6 days', 'citizen', pg_temp.nid(8,7), null, pg_temp.nid(4,2), null, 'low', 'validated', null, '{"floor":40,"hours":"02:00-04:00"}', null, false, pg_temp.nid(17,2), pg_temp.nid(7,2), now() - interval '5 days', null, true, now() - interval '6 days'),
  (pg_temp.nid(18,3),  'NT-REP-2026-0003', 'Nid-de-poule sur la voie principale du quai 4', 'Cavité profonde de 40 cm repérée lors d''une ronde.', 'infrastructure', pg_temp.nid(1,4), pg_temp.nid(3,4), -80, -140, now() - interval '5 days', 'agent', null, null, pg_temp.nid(4,5), pg_temp.nid(7,6), 'high', 'in_progress', null, '{"depth_cm":40}', null, false, pg_temp.nid(17,3), pg_temp.nid(7,5), now() - interval '4 days', null, true, now() - interval '5 days'),
  (pg_temp.nid(18,4),  'NT-REP-2026-0004', 'Fumée détectée près de l''annexe de l''hôpital', 'Analyse automatique d''une caméra : panache de fumée possible sur le toit de l''annexe.', 'health', pg_temp.nid(1,6), pg_temp.nid(3,6), -86, 145, now() - interval '3 hours', 'camera', null, 'CAM-S06', pg_temp.nid(4,4), null, 'high', 'to_verify', 0.78, '{"detector":"smoke-v2"}', null, false, pg_temp.nid(17,4), null, null, null, false, now() - interval '3 hours'),
  (pg_temp.nid(18,5),  'NT-REP-2026-0005', 'Tram T1 immobilisé entre deux stations', 'Le flux de l''API de transport indique que T1 est arrêté depuis 12 minutes.', 'transport', pg_temp.nid(1,7), pg_temp.nid(3,7), 100, 150, now() - interval '2 days', 'external_api', null, 'nova_api', pg_temp.nid(4,7), pg_temp.nid(7,6), 'medium', 'assigned', 0.92, '{"line":"T1","stopped_minutes":12}', null, false, pg_temp.nid(17,5), pg_temp.nid(7,1), now() - interval '2 days', null, true, now() - interval '2 days'),
  (pg_temp.nid(18,6),  'NT-REP-2026-0006', 'Caisses abandonnées dans les jardins Lumen', 'Plusieurs caisses déposées sans autorisation à l''entrée du dôme.', 'environment', pg_temp.nid(1,5), pg_temp.nid(3,5), -170, 5, now() - interval '8 days', 'citizen', pg_temp.nid(8,7), null, pg_temp.nid(4,8), null, 'low', 'rejected', null, '{"crates":5}', null, false, pg_temp.nid(17,6), null, null, null, false, now() - interval '8 days'),
  (pg_temp.nid(18,7),  'NT-REP-2026-0007', 'Silhouette non identifiée sur le périmètre Sentinel', 'Analyse satellite : présence humaine possible dans une zone interdite.', 'safety', pg_temp.nid(1,9), pg_temp.nid(3,9), -255, 145, now() - interval '5 hours', 'satellite', null, 'ORB-SAT-02', pg_temp.nid(4,2), null, 'critical', 'to_verify', 0.55, '{"zone":"restricted"}', null, false, pg_temp.nid(17,7), null, null, null, false, now() - interval '5 hours'),
  (pg_temp.nid(18,8),  'NT-REP-2026-0008', 'Panne réseau dans le quartier Cipher', 'Brouillon créé par l''assistant : plusieurs habitants signalent une coupure de réseau.', 'infrastructure', pg_temp.nid(1,8), pg_temp.nid(3,8), 255, -145, now() - interval '30 minutes', 'chatbot', pg_temp.nid(8,7), null, pg_temp.nid(4,5), null, 'medium', 'draft', null, '{"affected":"fibre"}', null, false, pg_temp.nid(17,8), null, null, null, false, now() - interval '30 minutes'),
  (pg_temp.nid(18,9),  'NT-REP-2026-0009', 'Éclairage éteint dans la Flèche Academia', 'Le hall nord de l''université est dans le noir depuis la nuit dernière.', 'infrastructure', pg_temp.nid(1,10), pg_temp.nid(3,10), 255, 150, now() - interval '9 days', 'citizen', pg_temp.nid(8,7), null, pg_temp.nid(4,5), pg_temp.nid(7,6), 'medium', 'resolved', null, '{"area":"north hall"}', null, false, pg_temp.nid(17,9), pg_temp.nid(7,5), now() - interval '8 days', now() - interval '6 days', true, now() - interval '9 days'),
  (pg_temp.nid(18,10), 'NT-REP-2026-0010', 'Affluence dangereuse sur la place du Nexus', 'Signalement vocal : forte affluence près de l''escalier central pendant l''événement.', 'safety', pg_temp.nid(1,1), pg_temp.nid(3,1), 5, -5, now() - interval '14 days', 'citizen', pg_temp.nid(8,7), null, pg_temp.nid(4,2), null, 'medium', 'archived', null, '{"people_estimate":800}', 'Il y a énormément de monde devant l''escalier central de la mairie, ça devient dangereux.', true, pg_temp.nid(17,10), pg_temp.nid(7,2), now() - interval '13 days', null, false, now() - interval '14 days')
on conflict (id) do nothing;

-- 19. report_evidence — preuves citoyennes séparées des images caméra / satellite (sensibles)
insert into public.report_evidence (id, report_id, source, file_path, mime_type, captured_at, confidence_score, validation_status, validated_by, visibility, alt_text) values
  (pg_temp.nid(19,1),  pg_temp.nid(18,1),  'citizen',   '00000007-0000-4000-8000-000000000007/00000018-0000-4000-8000-000000000001/lampadaires.jpg', 'image/jpeg', now() - interval '1 day',  null, 'pending',   null, 'confidential', 'Rangée de lampadaires allumés de façon intermittente'),
  (pg_temp.nid(19,2),  pg_temp.nid(18,2),  'citizen',   '00000007-0000-4000-8000-000000000007/00000018-0000-4000-8000-000000000002/tour.jpg',       'image/jpeg', now() - interval '6 days', null, 'validated', pg_temp.nid(7,2), 'confidential', 'Façade de la tour Aurora de nuit'),
  (pg_temp.nid(19,3),  pg_temp.nid(18,3),  'agent',     'agents/00000018-0000-4000-8000-000000000003/nid-de-poule.jpg',                             'image/jpeg', now() - interval '5 days', null, 'validated', pg_temp.nid(7,5), 'internal',     'Nid-de-poule profond sur la voie du quai 4'),
  (pg_temp.nid(19,4),  pg_temp.nid(18,4),  'camera',    'system/camera/cam-s06/00000019-0000-4000-8000-000000000004.jpg',                           'image/jpeg', now() - interval '3 hours', 0.78, 'pending',   null, 'sensitive',    'Toit de l''annexe de l''hôpital avec une fumée grise'),
  (pg_temp.nid(19,5),  pg_temp.nid(18,5),  'api',       'system/api/00000019-0000-4000-8000-000000000005.png',                                      'image/png',  now() - interval '2 days', 0.92, 'validated', pg_temp.nid(7,1), 'internal',     'Capture du tableau de bord de la ligne T1'),
  (pg_temp.nid(19,6),  pg_temp.nid(18,6),  'citizen',   '00000007-0000-4000-8000-000000000007/00000018-0000-4000-8000-000000000006/caisses.jpg',    'image/jpeg', now() - interval '8 days', null, 'rejected',  pg_temp.nid(7,6), 'confidential', 'Caisses en bois empilées à l''entrée du dôme'),
  (pg_temp.nid(19,7),  pg_temp.nid(18,7),  'satellite', 'system/satellite/orb-sat-02/00000019-0000-4000-8000-000000000007.png',                     'image/png',  now() - interval '5 hours', 0.55, 'pending',   null, 'sensitive',    'Vue satellite du périmètre Sentinel avec une zone encadrée'),
  (pg_temp.nid(19,8),  pg_temp.nid(18,8),  'citizen',   '00000007-0000-4000-8000-000000000007/00000018-0000-4000-8000-000000000008/reseau.png',     'image/png',  now() - interval '30 minutes', null, 'pending',   null, 'confidential', 'Capture d''écran d''un réseau indisponible'),
  (pg_temp.nid(19,9),  pg_temp.nid(18,9),  'citizen',   '00000007-0000-4000-8000-000000000007/00000018-0000-4000-8000-000000000009/hall.jpg',      'image/jpeg', now() - interval '9 days', null, 'validated', pg_temp.nid(7,5), 'confidential', 'Hall de l''université plongé dans l''obscurité'),
  (pg_temp.nid(19,10), pg_temp.nid(18,10), 'camera',    'system/camera/cam-s01/00000019-0000-4000-8000-000000000010.jpg',                           'image/jpeg', now() - interval '14 days', 0.91, 'validated', pg_temp.nid(7,2), 'sensitive',    'Foule dense près de l''escalier central de la mairie')
on conflict (id) do nothing;

-- 20. report_status_history
insert into public.report_status_history (id, report_id, from_status, to_status, changed_by, reason, changed_at) values
  (pg_temp.nid(20,1),  pg_temp.nid(18,2),  'received',   'validated',   pg_temp.nid(7,2), 'Confirmé auprès du voisinage', now() - interval '5 days'),
  (pg_temp.nid(20,2),  pg_temp.nid(18,3),  'received',   'validated',   pg_temp.nid(7,5), null, now() - interval '4 days'),
  (pg_temp.nid(20,3),  pg_temp.nid(18,3),  'validated',  'in_progress', pg_temp.nid(7,6), 'Équipe voirie en route', now() - interval '3 days'),
  (pg_temp.nid(20,4),  pg_temp.nid(18,5),  'to_verify',  'validated',   pg_temp.nid(7,1), 'Donnée API vérifiée', now() - interval '2 days'),
  (pg_temp.nid(20,5),  pg_temp.nid(18,5),  'validated',  'assigned',    pg_temp.nid(7,1), null, now() - interval '2 days'),
  (pg_temp.nid(20,6),  pg_temp.nid(18,6),  'received',   'rejected',    pg_temp.nid(7,5), 'Dépôt déjà évacué', now() - interval '7 days'),
  (pg_temp.nid(20,7),  pg_temp.nid(18,9),  'received',   'validated',   pg_temp.nid(7,5), null, now() - interval '8 days'),
  (pg_temp.nid(20,8),  pg_temp.nid(18,9),  'validated',  'in_progress', pg_temp.nid(7,6), null, now() - interval '7 days'),
  (pg_temp.nid(20,9),  pg_temp.nid(18,9),  'in_progress','resolved',    pg_temp.nid(7,6), 'Éclairage remplacé', now() - interval '6 days'),
  (pg_temp.nid(20,10), pg_temp.nid(18,10), 'validated',  'archived',    pg_temp.nid(7,2), 'Événement terminé', now() - interval '10 days')
on conflict (id) do nothing;

-- 29. satellite_observations (simulées ; 2 ont généré un signalement)
insert into public.satellite_observations (id, satellite_code, observed_at, sector_id, x, y, image_path, analysis, confidence_score, validation_status, validated_by, validated_at, generated_report_id) values
  (pg_temp.nid(29,1),  'ORB-SAT-01', now() - interval '1 day',   pg_temp.nid(1,1),  0,      0,    'system/satellite/orb-sat-01/obs-001.png', '{"label":"normal","objects":0}',                 0.93, 'validated', pg_temp.nid(7,1), now() - interval '23 hours', null),
  (pg_temp.nid(29,2),  'ORB-SAT-01', now() - interval '1 day',   pg_temp.nid(1,2),  173.2,  0,    'system/satellite/orb-sat-01/obs-002.png', '{"label":"normal","objects":0}',                 0.90, 'validated', pg_temp.nid(7,1), now() - interval '23 hours', null),
  (pg_temp.nid(29,3),  'ORB-SAT-02', now() - interval '5 hours', pg_temp.nid(1,9),  -259.8, 150,  'system/satellite/orb-sat-02/obs-003.png', '{"label":"intrusion","objects":1}',             0.55, 'pending',   null, null, pg_temp.nid(18,7)),
  (pg_temp.nid(29,4),  'ORB-SAT-02', now() - interval '2 days',  pg_temp.nid(1,4),  -86.6, -150,  'system/satellite/orb-sat-02/obs-004.png', '{"label":"surface_damage","objects":1}',        0.81, 'validated', pg_temp.nid(7,5), now() - interval '2 days', null),
  (pg_temp.nid(29,5),  'ORB-SAT-03', now() - interval '3 days',  pg_temp.nid(1,5),  -173.2, 0,    'system/satellite/orb-sat-03/obs-005.png', '{"label":"debris","objects":5}',                 0.62, 'rejected',  pg_temp.nid(7,1), now() - interval '3 days', null),
  (pg_temp.nid(29,6),  'ORB-SAT-03', now() - interval '3 days',  pg_temp.nid(1,6),  -86.6, 150,   'system/satellite/orb-sat-03/obs-006.png', '{"label":"normal","objects":0}',                 0.88, 'validated', pg_temp.nid(7,1), now() - interval '3 days', null),
  (pg_temp.nid(29,7),  'ORB-SAT-01', now() - interval '4 days',  pg_temp.nid(1,7),  86.6,  150,   'system/satellite/orb-sat-01/obs-007.png', '{"label":"heavy_traffic","objects":14}',        0.74, 'pending',   null, null, null),
  (pg_temp.nid(29,8),  'ORB-SAT-02', now() - interval '14 days', pg_temp.nid(1,1),  0,      0,    'system/satellite/orb-sat-02/obs-008.png', '{"label":"crowd","objects":800}',                0.91, 'validated', pg_temp.nid(7,2), now() - interval '14 days', pg_temp.nid(18,10)),
  (pg_temp.nid(29,9),  'ORB-SAT-03', now() - interval '6 days',  pg_temp.nid(1,8),  259.8, -150,  'system/satellite/orb-sat-03/obs-009.png', '{"label":"antenna_misaligned","objects":1}',    0.67, 'pending',   null, null, null),
  (pg_temp.nid(29,10), 'ORB-SAT-01', now() - interval '7 days',  pg_temp.nid(1,10), 259.8, 150,   'system/satellite/orb-sat-01/obs-010.png', '{"label":"normal","objects":0}',                 0.95, 'validated', pg_temp.nid(7,1), now() - interval '7 days', null)
on conflict (id) do nothing;

alter table public.requests enable trigger audit_row_change;
alter table public.reports  enable trigger audit_row_change;
