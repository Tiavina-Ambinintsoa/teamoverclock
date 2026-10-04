-- ============================================================================
-- NOVA TERRA — Seed knowledge_base depuis docs/
-- Insère les 9 fichiers de documentation comme entrées versionnées du chatbot.
-- Relançable : on conflict (entity_type, entity_id) met à jour si le contenu change.
-- ============================================================================

insert into public.knowledge_base (id, entity_type, entity_id, title, content, url, version, is_published, content_hash)
values

-- 1. PLAN.md
(
  'doc00000-0000-4000-8000-000000000001',
  'doc',
  'doc00000-0000-4000-8000-000000000001',
  'Nova Terra — Master Plan',
  'Nova Terra est une ville fictive futuriste organisée en 3 espaces : Portail Citoyen (visiteurs/citoyens), Espace Agents Municipaux, Console Admin. 44 tables Postgres, 10 lignes de seed par table. Secteurs hexagonaux S-01 à S-10 : Nexus Core (administration), Aurora Heights (résidentiel), Helios Grid (énergie), Ferrum Docks (industriel), Lumen Gardens (parcs), Vitalis District (hôpitaux), Orbis Port (spatioport), Cipher Quarter (télécom), Sentinel Ward (sécurité), Academia Spire (écoles). Stack : React 19 + Vite + Tailwind 4 + React Query + Supabase + OpenRouter/Gemini. Rôles : citizen, agent, service_admin, general_admin, system. Statuts demandes : new, received, to_qualify, assigned, in_progress, waiting_info, resolved, closed, rejected, cancelled. Statuts signalements : draft, received, to_verify, validated, rejected, assigned, in_progress, resolved, archived. Seuls les citoyens kyc_status=verified peuvent créer des signalements. Le chatbot demande confirmation avant toute création. Accessibilité : thèmes haut contraste, taille de police 85–200%, lecture vocale, navigation vocale, visite guidée textuelle. Alertes canicule : admin publie un danger heatwave, webhook dispatch-heat-alert notifie les citoyens des secteurs affectés. Projets de ville : votes et commentaires par citoyens vérifiés. Numéros de suivi : NT-REQ-YYYY-NNNN et NT-REP-YYYY-NNNN.',
  '/docs/plan',
  1,
  true,
  md5('Nova Terra — Master Plan' || '|' || 'plan-content-v1')
),

-- 2. REQUESTS.md
(
  'doc00000-0000-4000-8000-000000000002',
  'doc',
  'doc00000-0000-4000-8000-000000000002',
  'Cahier des charges Nova Terra',
  'Cahier des charges fonctionnel de la plateforme Nova Terra. D01 : créer un compte habitant (email, mot de passe, zone de résidence, consentement, vérification email). D03 : connexion sécurisée, session expirante, réinitialisation mot de passe, redirection par rôle. D04 : contacter les services municipaux via formulaire (service destinataire, sujet, catégorie, description, pièces jointes ≤5 Mo, numéro de suivi généré). D05 : consulter les services municipaux (liste, recherche, filtre catégorie, fiche détaillée, horaires, statut ouvert/fermé). D06 : consulter les actualités municipales (liste chronologique, urgentes en évidence, archivage automatique, partage de lien). D07 : page d'accueil claire (logo, recherche globale, connexion, services populaires, actualités, signalement, démarches, contacts urgence, carte, chatbot). D08 : gestion des profils (citoyen, agent, admin service, admin général). D09 : droits d'accès (moindre privilège, refus par défaut, contrôle côté serveur et interface). D19 : espace de travail agents (tableau de bord, liste demandes/signalements, filtres, affectation, commentaires internes, historique, preuves, sync API). F22 : suivi des demandes (cycle de vie complet, historique, relance automatique, clôture avec note obligatoire). Chatbot : base de connaissances versionnée, sources citées, confirmation avant création, voix et texte. Signalements : sources citizen/agent/chatbot/camera/satellite/api, preuves séparées, validation admin avant publication, regroupement par type/localisation. Carte interactive : hexagonale par secteurs, bâtiments et transports dynamiques, navigation, zones dangereuses. Dangers : protocole alien invasion en 8 étapes, alertes archivées, validation admin.',
  '/docs/requests',
  1,
  true,
  md5('Cahier des charges Nova Terra' || '|' || 'requests-content-v1')
),

-- 3. SUPABASE.md
(
  'doc00000-0000-4000-8000-000000000003',
  'doc',
  'doc00000-0000-4000-8000-000000000003',
  'Configuration Supabase — Nova Terra',
  'Pour donner le rôle administrateur : dans Authentication → Users copier l UUID, puis SQL Editor : update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, {}::jsonb) || {"role":"admin"}::jsonb where id = UUID. Se déconnecter et reconnecter pour renouveler la session. Pour retirer le rôle : raw_app_meta_data - role. Importer Nova Terra dans cet ordre : 01_enums_extensions.sql, 02_tables.sql, 03_functions_triggers.sql, 04_rls_grants.sql, 05_storage.sql, 06_seed_auth.sql (10 comptes démo, mot de passe NovaTerra!2026, admin@novaterra.test est admin général), 07a/07b/07c seed, 08 à 11, puis migrations 20261003 à 20261004. Après import de 10_knowledge_base.sql : ouvrir /admin/ai-content → Reconstruire la base du chatbot. Alertes canicule : déployer dispatch-heat-alert, secret HEAT_ALERT_WEBHOOK_SECRET, webhook sur table dangers INSERT. Cron : remind_stalled_requests() toutes les heures, send_newsletter_digest(daily) chaque jour, send_appointment_reminders() toutes les 15 minutes. Traduction IA : déployer translate-content, secret GOOGLE_AI_STUDIO_API_KEY dans Edge Functions. Repartir de zéro : set app.allow_nova_reset = yes puis 00_reset_dev.sql. Ne jamais mettre service_role ou sb_secret dans VITE_ ou le dépôt.',
  '/docs/supabase',
  1,
  true,
  md5('Configuration Supabase — Nova Terra' || '|' || 'supabase-content-v1')
),

-- 4. DEPLOIEMENT-HODI.md
(
  'doc00000-0000-4000-8000-000000000004',
  'doc',
  'doc00000-0000-4000-8000-000000000004',
  'Déploiement HODI et configuration de production',
  'Variables de build HODI requises : VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_MAPTILER_API_KEY (optionnel), VITE_BASE (défaut /), VITE_USE_HASH_ROUTER (false par défaut, true si HODI ne réécrit pas les URL), VITE_ENABLE_AI_CHAT, VITE_ENABLE_AI_HISTORY. Commandes : npm ci puis npm run build, publier dist/. Ne jamais publier .env.local, node_modules, clé sb_secret ou service_role. Supabase Authentication : Site URL = URL HODI, Redirect URLs inclure origine et routes callback. OAuth Google/Facebook : configurer identifiants dans Supabase Auth, callback reste https://<project>.supabase.co/auth/v1/callback. Edge Functions à déployer : gemini-chat, gemini-voice-chat, admin-data, account-delete, contact-submit. Secrets requis : GOOGLE_AI_STUDIO_API_KEY, GOOGLE_AI_STUDIO_MODEL, APP_ORIGINS, RESEND_API_KEY, CONTACT_TO_EMAIL, MAIL_FROM, CONTACT_RATE_LIMIT_SALT. contact-submit est la seule fonction publique (verify_jwt=false). Sans Resend, messages stockés dans contact_messages visibles dans /admin/moderation.',
  '/docs/deploiement',
  1,
  true,
  md5('Déploiement HODI et configuration de production' || '|' || 'hodi-content-v1')
),

-- 5. GOOGLE-AI-STUDIO-TEXT.md
(
  'doc00000-0000-4000-8000-000000000005',
  'doc',
  'doc00000-0000-4000-8000-000000000005',
  'Chat texte Google AI Studio — Gemini',
  'Le chatbot flottant utilise Gemini via la fonction Supabase gemini-chat pour les questions d information posées depuis un compte connecté non-démo. Il transmet la question, jusqu à 12 tours précédents et les contenus publiés de la base de connaissances (guides, étapes, services, alertes, documents requis). Si Gemini est indisponible, le chatbot utilise les réponses locales. Configuration : supabase secrets set GOOGLE_AI_STUDIO_API_KEY=VOTRE_CLE puis supabase functions deploy gemini-chat. GOOGLE_AI_STUDIO_MODEL est facultatif, défaut gemini-3.8-flash. Pas de variable VITE_ nécessaire. Quota : 20 appels IA par jour et par compte. Les réponses Gemini ne peuvent pas créer de demande ni de signalement directement. La clé API ne doit jamais être dans une variable VITE_.',
  '/docs/google-ai-studio-text',
  1,
  true,
  md5('Chat texte Google AI Studio — Gemini' || '|' || 'gemini-text-content-v1')
),

-- 6. GOOGLE-AI-STUDIO-VOICE.md
(
  'doc00000-0000-4000-8000-000000000006',
  'doc',
  'doc00000-0000-4000-8000-000000000006',
  'Chat vocal Google AI Studio — Gemini Voice',
  'Le chat vocal utilise l API Gemini de Google AI Studio via la fonction gemini-voice-chat. Gemini comprend l enregistrement audio, garde le contexte des derniers échanges et répond à partir du contenu public de la base de connaissances Nova Terra. Les réponses sont lues à voix haute et affichent les liens sources. Configuration : supabase secrets set GOOGLE_AI_STUDIO_API_KEY=VOTRE_CLE GOOGLE_AI_STUDIO_MODEL=gemini-3.8-flash puis supabase functions deploy gemini-voice-chat. Variable de build : VITE_ENABLE_GOOGLE_AI_STUDIO_VOICE=true. Prérequis : compte Supabase réel (non démo), connexion internet, autorisation microphone. Enregistrements limités à 30 secondes, convertis en WAV mono 16 kHz localement. L audio n est pas enregistré dans l historique. Quota partagé : 20 appels par jour et par compte.',
  '/docs/google-ai-studio-voice',
  1,
  true,
  md5('Chat vocal Google AI Studio — Gemini Voice' || '|' || 'gemini-voice-content-v1')
),

-- 7. OPENROUTER.md
(
  'doc00000-0000-4000-8000-000000000007',
  'doc',
  'doc00000-0000-4000-8000-000000000007',
  'OpenRouter — intégration héritée',
  'Le widget chatbot actuel n utilise plus OpenRouter : le texte et la voix passent par Google AI Studio/Gemini. La fonction openrouter-chat reste dans le dépôt pour compatibilité avec d anciens clients mais le widget courant ne l appelle plus. Pour configurer le chatbot actuel, consulter les docs Google AI Studio Text et Voice.',
  '/docs/openrouter',
  1,
  true,
  md5('OpenRouter — intégration héritée' || '|' || 'openrouter-content-v1')
),

-- 8. ANIMATIONS-ET-COMPOSANTS.md
(
  'doc00000-0000-4000-8000-000000000008',
  'doc',
  'doc00000-0000-4000-8000-000000000008',
  'Animations et composants — Guide sprint',
  'Composants animés disponibles : TransitionLink (transition de route), TextReveal (text, as, by=word/character, effect=rise/blur/slide), AuroraShader WebGL (colorA/B/C, speed), HomeInteractiveBackground (suit pointeur et scroll), ImageParallaxBackground, Marquee, MeteorField, BorderBeam, AnimatedGradientText. Primitives UI : Button (variantes default/secondary/outline/soft/ghost/link/highlight/destructive/gradient/glass/inverse, formes default/rounded/squircle/pill/square/asymmetric, tailles sm/default/lg/xl/icon-sm/icon/icon-lg), Card, Badge, Input, Label, Textarea, Dialog, Tooltip, Separator, Skeleton, Accordion, Avatar, Breadcrumb, Checkbox, Progress, Select, Slider, Switch, Table, Tabs, Sonner, BentoGrid, AsyncButton, LikeButton. Ajouter shadcn : npx shadcn@latest add <composant>. Ajouter Magic UI : npx shadcn@latest add @magicui/<composant>. Galerie disponible sur /modeles/animations et /kit. Respecter prefers-reduced-motion. Préférer transform et opacity aux animations de dimensions.',
  '/docs/animations',
  1,
  true,
  md5('Animations et composants — Guide sprint' || '|' || 'animations-content-v1')
),

-- 9. HERO_ASSETS.md
(
  'doc00000-0000-4000-8000-000000000009',
  'doc',
  'doc00000-0000-4000-8000-000000000009',
  'Assets optimisés de la page d accueil',
  'La page d accueil utilise des images WebP servies localement et une vidéo intro VP9/WebM 1080p (~2 Mo). Les 4 images WebP font ~1 Mo au total. Le modèle 3D GLB (~9.5 Mo) est chargé à la demande uniquement quand il approche du viewport. Sources originales conservées dans assets-source/home/ non incluses dans le bundle. Pour servir depuis Supabase Storage : appliquer la migration hero-assets bucket, configurer SUPABASE_SERVICE_ROLE_KEY, exécuter npm run upload:hero-assets, puis définir VITE_HERO_ASSET_BASE_URL dans l environnement de déploiement. Le bucket est public en lecture seule. Incrémenter la version dans scripts/upload-hero-assets.mjs lors du remplacement d assets. Sans VITE_HERO_ASSET_BASE_URL, les assets sont servis depuis public/.',
  '/docs/hero-assets',
  1,
  true,
  md5('Assets optimisés de la page d accueil' || '|' || 'hero-assets-content-v1')
)

on conflict (id) do update
  set title        = excluded.title,
      content      = excluded.content,
      url          = excluded.url,
      version      = excluded.version + 1,
      is_published = true,
      content_hash = excluded.content_hash,
      updated_at   = now()
where public.knowledge_base.content_hash <> excluded.content_hash;
