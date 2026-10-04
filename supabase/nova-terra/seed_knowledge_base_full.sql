-- ============================================================================
-- NOVA TERRA — Knowledge Base complète : navigation + données réelles des tables
-- Relançable. À exécuter après 07a/07b/07c.
-- UUIDs : préfixe aa00 (navigation), bb00 (secteurs via SELECT), cc00 (services via SELECT),
--         dd00 (bâtiments via SELECT), ee00 (transports), ff00 (dangers), ab00 (docs)
-- ============================================================================

-- ─── 1. NAVIGATION GÉNÉRALE ─────────────────────────────────────────────────

insert into public.knowledge_base (id, entity_type, entity_id, title, content, url, version, is_published, content_hash)
values

('aa000000-0000-4000-8000-000000000001','navigation','aa000000-0000-4000-8000-000000000001',
'Plan du site Nova Terra — toutes les pages',
'Pages publiques sans compte : / Vue ensemble ville, /welcome accueil animé, /services liste services, /services/:slug détail service, /news actualités, /news/:slug détail actualité, /map carte hexagonale, /dangers alertes, /dangers/:slug détail danger, /reports signalements publics, /projects projets de ville, /guide visites guidées, /faq questions fréquentes, /contact formulaire, /connexion se connecter, /inscription créer un compte, /mot-de-passe-oublie réinitialiser mot de passe. Espace citoyen compte requis : /app tableau de bord, /app/requests mes demandes, /app/requests/new nouvelle demande, /app/requests/:id détail demande, /app/reports mes signalements, /app/reports/new nouveau signalement, /app/reports/:id détail signalement, /app/verification vérifier identité CIN, /app/parametres paramètres compte, /app/accessibility préférences accessibilité, /app/newsletter abonnements, /app/reputation score réputation. Espace agent rôle agent requis : /agent tableau de bord, /agent/requests demandes service, /agent/reports signalements service, /agent/sync synchronisation API. Espace admin rôle admin requis : /admin console, /admin/users utilisateurs, /admin/services services, /admin/news actualités, /admin/reports tous signalements, /admin/dangers alertes, /admin/ai-content contenus IA, /admin/audit journal audit, /admin/map éditeur carte.',
'/',1,true,md5('nav-sitemap-v1')),

('aa000000-0000-4000-8000-000000000002','navigation','aa000000-0000-4000-8000-000000000002',
'Comment créer un compte citoyen',
'Pour créer un compte sur Nova Terra : 1. Aller sur /inscription. 2. Remplir prénom, nom, email, mot de passe, secteur de résidence obligatoire, accepter conditions et consentement données. 3. Confirmer email via lien reçu. 4. Se connecter sur /connexion. 5. Aller sur /app/verification pour soumettre CIN fictif format NT-CIN-XXXXXX pour obtenir statut vérifié. Seuls citoyens vérifiés peuvent déposer signalements. Comptes non vérifiés peuvent consulter informations, utiliser chatbot et envoyer demandes.',
'/inscription',1,true,md5('nav-inscription-v1')),

('aa000000-0000-4000-8000-000000000003','navigation','aa000000-0000-4000-8000-000000000003',
'Comment déposer un signalement',
'Pour déposer un signalement : 1. Avoir compte avec statut KYC vérifié sinon aller sur /app/verification. 2. Aller sur /app/reports/new. 3. Choisir secteur S-01 à S-10 et optionnellement bâtiment. 4. Sélectionner catégorie : infrastructure, safety, health, environment, transport, noise, other. 5. Remplir titre, description, faits observés. 6. Ajouter photos ou preuves optionnel. 7. Utiliser saisie vocale si besoin bouton microphone. 8. Soumettre. Signalement reçoit numéro NT-REP-YYYY-NNNN. Statut initial received puis validé par admin service avant publication publique. Suivre sur /app/reports/:id.',
'/app/reports/new',1,true,md5('nav-signalement-v1')),

('aa000000-0000-4000-8000-000000000004','navigation','aa000000-0000-4000-8000-000000000004',
'Comment contacter un service municipal',
'Pour contacter un service : 1. Aller sur /app/requests/new compte requis ou /contact visiteurs. 2. Choisir service destinataire. 3. Remplir sujet, catégorie, description, pièces jointes optionnelles images PDF max 5 Mo max 5 fichiers. 4. Soumettre. Numéro NT-REQ-YYYY-NNNN généré. Suivre sur /app/requests. Délais SLA : urgences 24h, administration 48h, travaux publics 96h, éducation 120h. Notification envoyée à chaque changement de statut.',
'/app/requests/new',1,true,md5('nav-contact-v1')),

('aa000000-0000-4000-8000-000000000005','navigation','aa000000-0000-4000-8000-000000000005',
'Numéros urgence Nova Terra',
'Numéros urgence Nova Terra : Police Nova Police +999 112 0002 disponible 24h/24 7j/7 secteur S-09 Sentinel Ward. Pompiers Fire and Rescue +999 118 0003 disponible 24h/24 7j/7 secteur S-04 Ferrum Docks. Ambulances Emergency Medical +999 115 0004 disponible 24h/24 7j/7 secteur S-06 Vitalis District. En cas de danger immédiat appeler directement sans passer par formulaire. Alertes actives sur /dangers. Protocoles urgence sur page détail du danger concerné.',
'/dangers',1,true,md5('nav-urgences-v1')),

('aa000000-0000-4000-8000-000000000006','navigation','aa000000-0000-4000-8000-000000000006',
'Comment utiliser la carte interactive',
'Carte interactive accessible sur /map. Affiche 10 secteurs hexagonaux, bâtiments, transports, zones danger. Fonctionnalités : cliquer secteur pour voir informations et services, cliquer bâtiment pour horaires et services, filtrer par couche secteurs bâtiments transports dangers signalements, rechercher bâtiment par nom, calculer itinéraire entre deux points. Mobile : pincer pour zoomer, feuille détail en bas. Bâtiments fermés signalés. Zones danger actif hachurées. Admins : mode édition pour déplacer bâtiments et transports via /admin/map.',
'/map',1,true,md5('nav-carte-v1')),

('aa000000-0000-4000-8000-000000000007','navigation','aa000000-0000-4000-8000-000000000007',
'Accessibilité et préférences visuelles',
'Options accessibilité sur /app/accessibility ou bouton flottant bas droite. Thèmes : Standard, Haut contraste clair, Haut contraste sombre, Jaune sur noir contraste AAA. Taille police 85% à 200%. Espacement lignes ajustable. Réduction animations. Lecture vocale écran : IA lit titres sections formulaires. Navigation vocale : dicter champs, dire suivant soumettre aller aux services. Guide vocal : dire aide pour commandes disponibles. Sous-titres : contenu vocal aussi en texte. Alertes visuelles : notifications sonores avec bandeau visuel. Préférences sauvegardées par compte synchronisées tous appareils.',
'/app/accessibility',1,true,md5('nav-accessibilite-v1')),

('aa000000-0000-4000-8000-000000000008','navigation','aa000000-0000-4000-8000-000000000008',
'Vérification identité CIN',
'Vérification KYC nécessaire pour signalements. Étapes : 1. Aller /app/verification. 2. Photographier CIN fictif format NT-CIN-XXXXXX. 3. Soumettre photo. 4. IA analyse selon modèle CIN Nova Terra. 5. Si validé score supérieur 0.9 statut passe à vérifié. 6. Si rejeté image floue ou format incorrect soumettre nouvelle photo nette. Statuts : none pas soumis, pending en analyse, verified validé accès complet, rejected refusé nouvelle soumission possible. Mineurs doivent avoir parrain adulte vérifié désigné à création compte.',
'/app/verification',1,true,md5('nav-kyc-v1')),

('aa000000-0000-4000-8000-000000000009','navigation','aa000000-0000-4000-8000-000000000009',
'Projets de ville et votes citoyens',
'Projets de ville sur /projects. Initiatives publiées par administration générale. Citoyens vérifiés peuvent voter pour ou contre chaque projet un vote par projet modifiable. Commentaires publics ouverts aux citoyens vérifiés. Statistiques votes total soutien % opposition % visibles publiquement. Résultats détaillés réservés admins. Pour voter : /projects cliquer projet cliquer Soutenir ou Opposer. Pour commenter : écrire zone commentaire et soumettre. Votes projets indépendants du score réputation.',
'/projects',1,true,md5('nav-projets-v1')),

('aa000000-0000-4000-8000-000000000010','navigation','aa000000-0000-4000-8000-000000000010',
'Score de réputation citoyen',
'Score réputation visible sur /app/reputation. Reflète crédibilité citoyen. Fonctionnement : citoyens vérifiés attribuent points mutuellement +1 +2 ou -1. Pas de auto-notation. Un seul vote par paire. Votes sur personnes jamais sur signalements. Score apparaît à côté signalements publics et commentaires. Ne remplace pas validation administrative. Niveaux : 0-20 Débutant, 21-50 Contributeur, 51-100 Fiable, 101+ Expert. Points vote projets et soutien signalements séparés du score réputation.',
'/app/reputation',1,true,md5('nav-reputation-v1'))

on conflict (id) do update
  set content = excluded.content, version = public.knowledge_base.version + 1,
      is_published = true, content_hash = excluded.content_hash, updated_at = now()
where public.knowledge_base.content_hash <> excluded.content_hash;

-- ─── 2. SECTEURS (SELECT depuis public.sectors) ──────────────────────────────

insert into public.knowledge_base (id, entity_type, entity_id, title, content, url, version, is_published, content_hash)
select
  ('bb000000-0000-4000-8000-' || lpad(row_number() over (order by code)::text, 12, '0'))::uuid,
  'sector', id,
  'Secteur ' || code || ' — ' || name,
  'Secteur ' || code || ' : ' || name || '. ' || coalesce(description,'') ||
  ' Coordonnées hex q=' || hex_q || ' r=' || hex_r || '.' ||
  ' Position x=' || round(x::numeric,1) || ' y=' || round(y::numeric,1) || '.' ||
  ' Couleur ' || color || '. Activité ' || activity_level || '/100.' ||
  case when is_active then ' Actif.' else ' Inactif.' end ||
  ' Voir sur la carte : /map?sector=' || code || '.',
  '/map?sector=' || code,
  1, true,
  md5('sector|' || code || '|' || name || '|' || coalesce(description,''))
from public.sectors
on conflict (id) do update
  set content = excluded.content, version = public.knowledge_base.version + 1,
      is_published = true, content_hash = excluded.content_hash, updated_at = now()
where public.knowledge_base.content_hash <> excluded.content_hash;

-- ─── 3. SERVICES (SELECT depuis public.services) ─────────────────────────────

insert into public.knowledge_base (id, entity_type, entity_id, title, content, url, version, is_published, content_hash)
select
  ('cc000000-0000-4000-8000-' || lpad(row_number() over (order by slug)::text, 12, '0'))::uuid,
  'service', s.id,
  'Service : ' || s.name,
  'Service municipal : ' || s.name || '. Catégorie : ' || s.category || '. ' ||
  coalesce(s.description,'') ||
  ' Adresse : ' || coalesce(s.address,'non renseignée') || '.' ||
  ' Téléphone : ' || coalesce(s.phone,'non renseigné') || '.' ||
  ' Email : ' || coalesce(s.email,'non renseigné') || '.' ||
  ' Statut : ' || s.status::text || '.' ||
  case when s.is_emergency then ' Urgence 24h/24.' else '' end ||
  ' Délai traitement : ' || s.default_sla_hours || 'h.' ||
  coalesce(' Langues : ' || array_to_string(s.languages,', ') || '.','') ||
  coalesce(' Documents requis : ' || array_to_string(s.required_documents,', ') || '.','') ||
  coalesce(' Tarifs : ' || s.fees || '.','') ||
  ' Page : /services/' || s.slug || '.',
  '/services/' || s.slug,
  1, true,
  md5('service|' || s.slug || '|' || s.status::text || '|' || coalesce(s.description,''))
from public.services s
where s.status <> 'hidden'
on conflict (id) do update
  set content = excluded.content, version = public.knowledge_base.version + 1,
      is_published = true, content_hash = excluded.content_hash, updated_at = now()
where public.knowledge_base.content_hash <> excluded.content_hash;

-- ─── 4. BÂTIMENTS (SELECT depuis public.buildings) ───────────────────────────

insert into public.knowledge_base (id, entity_type, entity_id, title, content, url, version, is_published, content_hash)
select
  ('dd000000-0000-4000-8000-' || lpad(row_number() over (order by b.name)::text, 12, '0'))::uuid,
  'building', b.id,
  'Bâtiment : ' || b.name,
  'Bâtiment : ' || b.name || '. Type : ' || b.type::text || '.' ||
  ' Secteur : ' || coalesce(sec.code || ' ' || sec.name,'inconnu') || '.' ||
  ' Adresse : ' || coalesce(b.address,'non renseignée') || '.' ||
  ' Statut : ' || b.status::text || '.' ||
  case b.status::text
    when 'temporarily_closed' then ' Temporairement fermé.'
    when 'restricted' then ' Accès restreint.'
    when 'under_maintenance' then ' En maintenance.'
    else ' Opérationnel.'
  end ||
  coalesce(' ' || b.description,'') ||
  coalesce(' Prestations : ' || array_to_string(b.offerings,', ') || '.','') ||
  ' Voir sur la carte : /map.',
  '/map',
  1, true,
  md5('building|' || b.name || '|' || b.status::text || '|' || coalesce(b.description,''))
from public.buildings b
left join public.sectors sec on sec.id = b.sector_id
on conflict (id) do update
  set content = excluded.content, version = public.knowledge_base.version + 1,
      is_published = true, content_hash = excluded.content_hash, updated_at = now()
where public.knowledge_base.content_hash <> excluded.content_hash;

-- ─── 5. TRANSPORTS (SELECT depuis public.transports) ─────────────────────────

insert into public.knowledge_base (id, entity_type, entity_id, title, content, url, version, is_published, content_hash)
select
  ('ee000000-0000-4000-8000-' || lpad(row_number() over (order by t.code)::text, 12, '0'))::uuid,
  'transport', t.id,
  'Transport : ' || t.code || coalesce(' — ' || t.route_name,''),
  'Transport : ' || t.code || '. Type : ' || t.type::text || '.' ||
  ' Statut : ' || t.status::text || '.' ||
  ' Visibilité : ' || t.visibility || '.' ||
  coalesce(' Ligne : ' || t.route_name || '.','') ||
  ' Capacité : ' || coalesce(t.capacity::text,'?') || ' passagers.' ||
  ' Secteur : ' || coalesce(sec.code || ' ' || sec.name,'inconnu') || '.' ||
  case t.visibility when 'public' then ' Transport public accessible à tous.' else ' Véhicule personnel.' end ||
  ' Voir sur la carte : /map.',
  '/map',
  1, true,
  md5('transport|' || t.code || '|' || t.status::text || '|' || t.visibility)
from public.transports t
left join public.sectors sec on sec.id = t.sector_id
where t.visibility = 'public'
on conflict (id) do update
  set content = excluded.content, version = public.knowledge_base.version + 1,
      is_published = true, content_hash = excluded.content_hash, updated_at = now()
where public.knowledge_base.content_hash <> excluded.content_hash;

-- ─── 6. DANGERS ACTIFS (SELECT depuis public.dangers) ────────────────────────

insert into public.knowledge_base (id, entity_type, entity_id, title, content, url, version, is_published, content_hash)
select
  ('ff000000-0000-4000-8000-' || lpad(row_number() over (order by d.title)::text, 12, '0'))::uuid,
  'danger', d.id,
  'Alerte : ' || d.title,
  'Alerte de sécurité : ' || d.title || '. Sévérité : ' || d.severity::text || '.' ||
  ' Statut : ' || d.status::text || '.' ||
  ' ' || coalesce(d.summary,'') ||
  coalesce(' À faire : ' || array_to_string(d.recommended_actions,'; ') || '.','') ||
  coalesce(' À ne pas faire : ' || array_to_string(d.forbidden_actions,'; ') || '.','') ||
  ' Valide du ' || d.valid_from::date::text ||
  coalesce(' au ' || d.valid_until::date::text,', sans date de fin') || '.' ||
  ' Page détail : /dangers/' || d.slug || '.',
  '/dangers/' || d.slug,
  1, true,
  md5('danger|' || d.slug || '|' || d.status::text || '|' || coalesce(d.summary,''))
from public.dangers d
where d.status = 'active'
on conflict (id) do update
  set content = excluded.content, version = public.knowledge_base.version + 1,
      is_published = true, content_hash = excluded.content_hash, updated_at = now()
where public.knowledge_base.content_hash <> excluded.content_hash;

-- ─── 7. ACTUALITÉS PUBLIÉES (SELECT depuis public.news) ──────────────────────

insert into public.knowledge_base (id, entity_type, entity_id, title, content, url, version, is_published, content_hash)
select
  ('ab000000-0000-4000-8000-' || lpad(row_number() over (order by n.published_at desc)::text, 12, '0'))::uuid,
  'news', n.id,
  'Actualité : ' || n.title,
  'Actualité : ' || n.title || '. Catégorie : ' || coalesce(n.category,'') || '.' ||
  ' Importance : ' || n.importance::text || '.' ||
  ' ' || coalesce(n.summary,'') ||
  ' Publiée le ' || n.published_at::date::text || '.' ||
  coalesce(' Expire le ' || n.valid_until::date::text || '.','') ||
  ' Lire sur /news/' || n.slug || '.',
  '/news/' || n.slug,
  1, true,
  md5('news|' || n.slug || '|' || coalesce(n.summary,''))
from public.news n
where n.status = 'published'
  and n.deleted_at is null
  and (n.valid_until is null or n.valid_until >= now())
on conflict (id) do update
  set content = excluded.content, version = public.knowledge_base.version + 1,
      is_published = true, content_hash = excluded.content_hash, updated_at = now()
where public.knowledge_base.content_hash <> excluded.content_hash;

-- ─── 8. DÉPARTEMENTS (SELECT depuis public.departments) ──────────────────────

insert into public.knowledge_base (id, entity_type, entity_id, title, content, url, version, is_published, content_hash)
select
  ('ac000000-0000-4000-8000-' || lpad(row_number() over (order by code)::text, 12, '0'))::uuid,
  'department', id,
  'Département : ' || name,
  'Département municipal : ' || name || ' (code ' || code || ').' ||
  ' ' || coalesce(description,'') ||
  ' Responsable : ' || coalesce(head_title,'non renseigné') || '.' ||
  ' Voir les services de ce département sur /services.',
  '/services',
  1, true,
  md5('dept|' || code || '|' || name)
from public.departments
on conflict (id) do update
  set content = excluded.content, version = public.knowledge_base.version + 1,
      is_published = true, content_hash = excluded.content_hash, updated_at = now()
where public.knowledge_base.content_hash <> excluded.content_hash;

-- ─── 9. PROJETS DE VILLE PUBLIÉS (SELECT depuis public.city_projects) ─────────

insert into public.knowledge_base (id, entity_type, entity_id, title, content, url, version, is_published, content_hash)
select
  ('ad000000-0000-4000-8000-' || lpad(row_number() over (order by cp.created_at desc)::text, 12, '0'))::uuid,
  'city_project', cp.id,
  'Projet de ville : ' || cp.title,
  'Projet de ville : ' || cp.title || '.' ||
  ' ' || coalesce(cp.description,'') ||
  ' Statut : ' || cp.status::text || '.' ||
  ' Publié le ' || cp.created_at::date::text || '.' ||
  ' Les citoyens vérifiés peuvent voter et commenter sur /projects.',
  '/projects',
  1, true,
  md5('project|' || cp.id::text || '|' || cp.title || '|' || coalesce(cp.description,''))
from public.city_projects cp
where cp.status in ('published','closed')
on conflict (id) do update
  set content = excluded.content, version = public.knowledge_base.version + 1,
      is_published = true, content_hash = excluded.content_hash, updated_at = now()
where public.knowledge_base.content_hash <> excluded.content_hash;

-- ─── 10. TOPICS NEWSLETTER (SELECT depuis public.newsletter_topics) ───────────

insert into public.knowledge_base (id, entity_type, entity_id, title, content, url, version, is_published, content_hash)
select
  ('ae000000-0000-4000-8000-' || lpad(row_number() over (order by code)::text, 12, '0'))::uuid,
  'newsletter_topic', id,
  'Newsletter : ' || label,
  'Sujet newsletter : ' || label || ' (code ' || code || ').' ||
  ' ' || coalesce(description,'') ||
  ' Pour s''abonner à ce sujet aller sur /app/newsletter et sélectionner ' || label || '.' ||
  ' Fréquences disponibles : instant, daily, weekly.',
  '/app/newsletter',
  1, true,
  md5('newsletter|' || code || '|' || label)
from public.newsletter_topics
on conflict (id) do update
  set content = excluded.content, version = public.knowledge_base.version + 1,
      is_published = true, content_hash = excluded.content_hash, updated_at = now()
where public.knowledge_base.content_hash <> excluded.content_hash;
