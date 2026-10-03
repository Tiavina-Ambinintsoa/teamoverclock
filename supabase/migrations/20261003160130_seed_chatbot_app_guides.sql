-- Published, bilingual help articles for citizen-facing application screens.
-- entity_id values are stable identifiers for these FAQ rows (not foreign keys).
insert into public.knowledge_base (
  entity_type, entity_id, title, content, url, version, is_published, content_hash
)
values
  (
    'faq', '00000000-0000-4000-8000-000000000101',
    'Utiliser Nova Terra : écrans, menu et fonctionnalités | Using Nova Terra: screens and features',
    'AIDE APPLICATION — NAVIGATION. En haut ou dans le menu, retrouvez les pages publiques : Services (/services), Actualités (/news), Carte (/map), Dangers et alertes (/dangers), Guide (/guide), Signalements publics (/reports) et Contact (/contact). Après connexion, « Mon espace » donne accès au Tableau de bord (/app), Mes demandes (/app/requests), Mes signalements (/app/reports), Appeler un conseiller (/app/support), Vérification d’identité (/app/verification), Accessibilité (/app/accessibility), Lettres d’information (/app/newsletter) et Paramètres (/app/parametres). Les pages d’agent et d’administration sont visibles uniquement aux rôles autorisés. Demandez-moi le nom d’une fonctionnalité pour obtenir les étapes et ouvrir sa page. EN: APPLICATION HELP — NAVIGATION. Public pages include Services (/services), News (/news), Map (/map), Dangers and alerts (/dangers), Guide (/guide), Public reports (/reports), and Contact (/contact). After signing in, My space includes Dashboard (/app), My requests (/app/requests), My reports (/app/reports), Call an agent (/app/support), Identity verification (/app/verification), Accessibility (/app/accessibility), Newsletters (/app/newsletter), and Settings (/app/parametres). Agent and administration pages are restricted to authorized roles. Ask me for a feature name to get steps and a direct page link.',
    '/guide', 1, true, md5('app-guide-navigation-v1')
  ),
  (
    'faq', '00000000-0000-4000-8000-000000000102',
    'Créer un compte, se connecter et récupérer son mot de passe | Account, sign in and password recovery',
    'COMPTE — INSCRIPTION ET CONNEXION. Ouvrez Inscription (/inscription), renseignez prénom, nom, e-mail, date de naissance, secteur de résidence, mot de passe et confirmation, puis acceptez les conditions et le traitement des données. Suivez le lien de confirmation reçu par e-mail si demandé. Pour revenir, utilisez Connexion (/connexion). En cas d’oubli, demandez un lien sur Mot de passe oublié (/mot-de-passe-oublie), puis choisissez un nouveau mot de passe (/nouveau-mot-de-passe). Un mineur doit ensuite indiquer le CIN d’un parrain adulte vérifié dans Vérification d’identité. EN: ACCOUNT — SIGN-UP AND SIGN-IN. Open Sign up (/inscription), enter first and last name, email, date of birth, home sector, password and confirmation, then accept the terms and data processing. Follow the email confirmation link if requested. Return through Sign in (/connexion). For a forgotten password, request a link at Password recovery (/mot-de-passe-oublie), then set a new password (/nouveau-mot-de-passe). A minor must later provide a verified adult sponsor’s CIN in Identity verification.',
    '/inscription', 1, true, md5('app-guide-account-v1')
  ),
  (
    'faq', '00000000-0000-4000-8000-000000000103',
    'Compléter son profil et vérifier son identité (CIN) | Complete profile and verify identity',
    'PROFIL ET VÉRIFICATION. Ouvrez Mon espace → Vérification d’identité (/app/verification). Si le profil citoyen n’est pas encore créé, saisissez la date de naissance et le secteur de résidence. Pour un mineur, renseignez le CIN du parrain adulte vérifié au format NT-CIN-000000. Pour vérifier votre identité, saisissez le CIN fictif au format NT-CIN-000000 ; une photo du document est facultative (JPG, PNG, WEBP ou PDF, 5 Mo maximum). Consultez ensuite le statut et l’historique sur cette page. L’identité vérifiée est requise pour envoyer un signalement, mais pas pour consulter les informations. EN: PROFILE AND IDENTITY VERIFICATION. Open My space → Identity verification (/app/verification). If your citizen profile is not yet created, enter your date of birth and home sector. A minor must provide a verified adult sponsor’s CIN in the format NT-CIN-000000. To verify identity, enter the fictional CIN in that format; a document image is optional (JPG, PNG, WEBP or PDF, up to 5 MB). Check the status and history on the same page. Verified identity is required to submit a report, but not to browse information.',
    '/app/verification', 1, true, md5('app-guide-verification-v1')
  ),
  (
    'faq', '00000000-0000-4000-8000-000000000104',
    'Déposer un signalement : étapes et pièces jointes | Submit a report: steps and attachments',
    'SIGNALEMENT — ÉTAPES. Connectez-vous avec une identité vérifiée, puis ouvrez Mes signalements → Nouveau signalement (/app/reports/new). Choisissez le secteur, puis éventuellement le bâtiment, la catégorie et la priorité ; saisissez un titre (3 à 150 caractères), une description (10 à 5 000 caractères) et la date/heure du constat. Les photos/preuves sont facultatives : jusqu’à 5 fichiers JPG, PNG, WEBP ou PDF, 5 Mo maximum chacun. Si vous ajoutez une image, fournissez sa description accessible. Vous pouvez dicter la description ; relisez la transcription et cochez la confirmation avant l’envoi. Vous pouvez enregistrer un brouillon ou envoyer le signalement. Suivez-le ensuite dans Mes signalements (/app/reports). EN: REPORT — STEPS. Sign in with verified identity, then open My reports → New report (/app/reports/new). Choose a sector, optionally a building, category and estimated priority; enter a title (3–150 characters), description (10–5,000 characters), and when it was observed. Photos/evidence are optional: up to 5 JPG, PNG, WEBP or PDF files, maximum 5 MB each. If you attach an image, provide an accessible image description. You can dictate the description; review the transcript and confirm you checked it before submitting. Save a draft or send the report, then track it in My reports (/app/reports).',
    '/app/reports/new', 1, true, md5('app-guide-submit-report-v1')
  ),
  (
    'faq', '00000000-0000-4000-8000-000000000105',
    'Suivre un signalement et comprendre son statut | Track a report and understand its status',
    'SUIVI DES SIGNALEMENTS. Ouvrez Mes signalements (/app/reports), sélectionnez un élément pour voir son détail, son statut et les mises à jour disponibles. Un brouillon n’est pas encore envoyé. Après envoi, le signalement est vérifié par le service concerné ; sa visibilité publique dépend de sa validation. Pour envoyer un nouveau signalement, votre identité doit être vérifiée. EN: REPORT TRACKING. Open My reports (/app/reports), select an item to view its details, status and available updates. A draft has not been submitted. After submission, the responsible service reviews the report; public visibility depends on validation. Identity verification is required before submitting a new report.',
    '/app/reports', 1, true, md5('app-guide-track-report-v1')
  ),
  (
    'faq', '00000000-0000-4000-8000-000000000106',
    'Contacter un service : étapes, informations et pièces jointes | Contact a service: details and attachments',
    'DEMANDE À UN SERVICE — ÉTAPES. Connectez-vous et ouvrez Mes demandes → Nouvelle demande (/app/requests/new). Choisissez le service destinataire et une catégorie, saisissez un sujet (3 à 150 caractères) et une description détaillée (10 à 5 000 caractères), indiquez si la demande est urgente et acceptez le traitement des données. Les pièces jointes sont facultatives : jusqu’à 5 fichiers JPG, PNG, WEBP ou PDF, 5 Mo maximum chacun. Les justificatifs métier éventuellement requis dépendent du service : consultez sa fiche (/services) ou demandez à l’assistant avant d’envoyer. Après envoi, conservez le numéro de suivi affiché. EN: SERVICE REQUEST — STEPS. Sign in and open My requests → New request (/app/requests/new). Choose the recipient service and a category, enter a subject (3–150 characters) and detailed description (10–5,000 characters), mark urgency if needed, and accept data processing. Attachments are optional: up to 5 JPG, PNG, WEBP or PDF files, maximum 5 MB each. Any service-specific supporting documents depend on the service; check its details (/services) or ask the assistant before sending. Keep the tracking number shown after submission.',
    '/app/requests/new', 1, true, md5('app-guide-new-request-v1')
  ),
  (
    'faq', '00000000-0000-4000-8000-000000000107',
    'Suivre une demande, répondre au service et voir les mises à jour | Track a request and reply',
    'SUIVI DES DEMANDES. Ouvrez Mes demandes (/app/requests) et sélectionnez une demande pour voir son numéro, son statut, son échéance et les messages du service. Si le service demande des précisions, ouvrez le détail et répondez dans la conversation. Les changements de statut et les réponses y sont conservés ; les notifications peuvent aussi vous informer des évolutions. EN: REQUEST TRACKING. Open My requests (/app/requests) and select a request to see its tracking number, status, due date and service messages. If the service asks for more information, open the detail page and reply in the conversation. Status changes and replies remain there; notifications may also inform you of updates.',
    '/app/requests', 1, true, md5('app-guide-track-request-v1')
  ),
  (
    'faq', '00000000-0000-4000-8000-000000000108',
    'Trouver un service, ses démarches et les documents nécessaires | Find a service, procedures and required documents',
    'SERVICES MUNICIPAUX. Parcourez le répertoire (/services), recherchez ou choisissez un service, puis ouvrez sa fiche (/services/nom-du-service). La fiche publiée peut présenter la description, coordonnées, adresse, horaires, démarches, frais, délais et documents requis. Les pièces justificatives ne sont pas identiques pour tous les services : utilisez la liste de la fiche concernée, et contactez ce service si un renseignement n’est pas publié. Depuis une fiche, vous pouvez démarrer une demande adressée au service lorsqu’une action est disponible. EN: CITY SERVICES. Browse the directory (/services), search or choose a service, then open its details (/services/service-name). Published details may include description, contacts, address, opening hours, procedures, fees, service-level time and required documents. Supporting documents differ by service: use the list on the relevant service page, and contact that service if information is not published. A service page may offer a direct way to start a request.',
    '/services', 1, true, md5('app-guide-services-v1')
  ),
  (
    'faq', '00000000-0000-4000-8000-000000000109',
    'Lire les actualités et ouvrir une publication | Read news and open an article',
    'ACTUALITÉS. Ouvrez Actualités (/news) pour parcourir les publications, puis sélectionnez un titre afin de lire l’article complet (/news/slug). Les actualités peuvent signaler des travaux, perturbations ou informations municipales. Les dates de validité et secteurs concernés sont indiqués lorsqu’ils sont publiés. EN: NEWS. Open News (/news) to browse publications, then select a title to read the full article (/news/slug). News may cover works, disruptions or city information. Validity dates and affected sectors are shown when provided.',
    '/news', 1, true, md5('app-guide-news-v1')
  ),
  (
    'faq', '00000000-0000-4000-8000-000000000110',
    'Consulter les dangers, alertes et consignes officielles | View dangers, alerts and instructions',
    'DANGERS ET ALERTES. Ouvrez la liste des dangers (/dangers), puis une alerte (/dangers/slug) pour lire son résumé, sa gravité, son statut, les secteurs concernés, les périodes de validité, les consignes à suivre et à éviter, le protocole et les contacts publiés. Pour demander les alertes de votre secteur, associez d’abord votre secteur de résidence au profil (/app/verification), puis posez la question au chatbot. En cas de danger immédiat, contactez les secours indiqués par les autorités ; l’application ne remplace pas les services d’urgence. EN: DANGERS AND ALERTS. Open the danger list (/dangers), then an alert (/dangers/slug) to read its summary, severity, status, affected sectors, validity period, actions to take or avoid, protocol and published contacts. To ask about your sector’s alerts, first associate your home sector with your profile (/app/verification), then ask the chatbot. In immediate danger, contact emergency services as directed by authorities; the app does not replace emergency services.',
    '/dangers', 1, true, md5('app-guide-alerts-v1')
  ),
  (
    'faq', '00000000-0000-4000-8000-000000000111',
    'Utiliser la carte et localiser un équipement | Use the map and find a facility',
    'CARTE. Ouvrez la carte publique (/map) pour explorer les secteurs et les équipements de la ville. Sélectionnez un repère pour afficher les informations disponibles, comme le nom, l’adresse, le service associé ou les offres. La carte aide aussi à choisir un secteur et un bâtiment lors de la création d’un signalement. EN: MAP. Open the public map (/map) to explore city sectors and facilities. Select a marker to see available details such as name, address, associated service or offerings. The map can also help you choose a sector and building when creating a report.',
    '/map', 1, true, md5('app-guide-map-v1')
  ),
  (
    'faq', '00000000-0000-4000-8000-000000000112',
    'Découvrir le guide de Nova Terra et les parcours d’aide | Use the Nova Terra guide',
    'GUIDE. Ouvrez Guide (/guide) pour parcourir les conseils et informations d’utilisation de Nova Terra. Pour une action précise, le chatbot peut vous indiquer les étapes et vous proposer un lien direct vers le formulaire ou la page concernée. Les opérations qui créent une demande ou un signalement nécessitent votre confirmation dans le formulaire. EN: GUIDE. Open Guide (/guide) to browse Nova Terra help and usage information. For a specific task, the chatbot can explain the steps and provide a direct link to the relevant page or form. Actions that create a request or report require your confirmation in the form.',
    '/guide', 1, true, md5('app-guide-guide-v1')
  ),
  (
    'faq', '00000000-0000-4000-8000-000000000113',
    'Demander un appel avec un conseiller | Request a call with an agent',
    'CONSEILLER. Connectez-vous, ouvrez Appeler un conseiller (/app/support), choisissez un service puis cliquez sur Demander un appel. Un agent du service peut prendre l’appel ; l’interface indique le statut et, après la fin, le résumé disponible. L’appel est simulé dans la démonstration et n’est pas un appel téléphonique d’urgence. Pour une question écrite, utilisez Nouvelle demande (/app/requests/new). EN: AGENT SUPPORT. Sign in, open Call an agent (/app/support), choose a service and select Request a call. An agent may take the call; the page shows its status and any summary after it ends. Calls are simulated in the demo and are not emergency phone calls. For a written question, use New request (/app/requests/new).',
    '/app/support', 1, true, md5('app-guide-support-v1')
  ),
  (
    'faq', '00000000-0000-4000-8000-000000000114',
    'S’abonner aux lettres d’information par thème et fréquence | Subscribe to newsletters',
    'LETTRES D’INFORMATION. Connectez-vous puis ouvrez Lettres d’information (/app/newsletter). Activez les sujets qui vous intéressent et choisissez une fréquence — immédiate, quotidienne ou hebdomadaire. Désactivez un sujet pour arrêter ses envois. Les thèmes disponibles dépendent des publications configurées. EN: NEWSLETTERS. Sign in and open Newsletters (/app/newsletter). Enable topics you care about and choose a frequency — instant, daily or weekly. Turn a topic off to stop its messages. Available topics depend on configured publications.',
    '/app/newsletter', 1, true, md5('app-guide-newsletter-v1')
  ),
  (
    'faq', '00000000-0000-4000-8000-000000000115',
    'Modifier ses paramètres, sa langue et ses préférences | Change settings and preferences',
    'PARAMÈTRES. Ouvrez Mon espace → Paramètres (/app/parametres) pour consulter et modifier les préférences de votre compte disponibles sur cet écran. Les préférences d’accessibilité et de voix se règlent séparément dans Accessibilité (/app/accessibility). Pour mettre à jour les informations d’identité ou le secteur associé, ouvrez Vérification d’identité (/app/verification). EN: SETTINGS. Open My space → Settings (/app/parametres) to review and change account preferences available on that screen. Accessibility and voice preferences are managed separately in Accessibility (/app/accessibility). To update identity information or the associated home sector, open Identity verification (/app/verification).',
    '/app/parametres', 1, true, md5('app-guide-settings-v1')
  ),
  (
    'faq', '00000000-0000-4000-8000-000000000116',
    'Régler l’accessibilité, la lecture vocale et le chat vocal | Accessibility and voice settings',
    'ACCESSIBILITÉ ET VOIX. Ouvrez Accessibilité (/app/accessibility) pour régler contraste, taille du texte, interligne, réduction des animations, lecture vocale, vitesse, langue et voix installées. Le chatbot flottant s’ouvre avec le bouton en bas à droite ; vous pouvez épingler le panneau, activer/désactiver la lecture et arrêter une lecture en cours. Pour parler au chatbot, connectez-vous à un compte réel et utilisez le bouton microphone ; l’enregistrement est envoyé au service vocal Google AI Studio configuré. Les voix proposées pour la lecture dépendent de l’appareil. EN: ACCESSIBILITY AND VOICE. Open Accessibility (/app/accessibility) to adjust contrast, text size, line spacing, reduced motion, speech reading, speed, language and installed voices. Open the floating chatbot with the bottom-right button; pin the panel, toggle read-aloud or stop current speech. To speak to the chatbot, sign in to a real account and use the microphone button; the recording is sent to the configured Google AI Studio voice service. Available speech voices depend on your device.',
    '/app/accessibility', 1, true, md5('app-guide-accessibility-v1')
  ),
  (
    'faq', '00000000-0000-4000-8000-000000000117',
    'Tableau de bord citoyen : retrouver ses activités | Citizen dashboard and activity',
    'TABLEAU DE BORD. Après connexion, ouvrez Mon espace (/app) pour retrouver les raccourcis de votre compte, vos activités récentes et les informations qui vous concernent. Utilisez Mes demandes (/app/requests) pour les échanges avec les services et Mes signalements (/app/reports) pour les problèmes signalés. Si une fonction manque, vérifiez que vous êtes connecté avec le bon compte et le rôle approprié. EN: DASHBOARD. After signing in, open My space (/app) to find account shortcuts, recent activity and relevant information. Use My requests (/app/requests) for service correspondence and My reports (/app/reports) for submitted issues. If a feature is missing, check that you are signed in with the right account and role.',
    '/app', 1, true, md5('app-guide-dashboard-v1')
  ),
  (
    'faq', '00000000-0000-4000-8000-000000000118',
    'Lire les signalements publics | Browse public reports',
    'SIGNALEMENTS PUBLICS. La page Signalements (/reports) permet de consulter les signalements rendus publics après vérification et validation. Elle ne montre pas nécessairement tous les signalements privés ou en cours de vérification. Pour déposer et suivre votre propre signalement, connectez-vous et utilisez Mes signalements (/app/reports). EN: PUBLIC REPORTS. The Reports page (/reports) lets you browse reports made public after review and validation. It may not show private reports or reports still under review. To submit and track your own report, sign in and use My reports (/app/reports).',
    '/reports', 1, true, md5('app-guide-public-reports-v1')
  ),
  (
    'faq', '00000000-0000-4000-8000-000000000119',
    'Contacter Nova Terra depuis la page publique | Contact Nova Terra publicly',
    'CONTACT PUBLIC. Ouvrez Contact (/contact) pour consulter les moyens de contact publics et envoyer un message si le formulaire est disponible. Pour une demande suivie à un service précis, connectez-vous et utilisez Nouvelle demande (/app/requests/new) : vous pourrez choisir le service et recevoir un numéro de suivi. EN: PUBLIC CONTACT. Open Contact (/contact) to view public contact options and send a message if the form is available. For a trackable request to a specific service, sign in and use New request (/app/requests/new): choose a service and receive a tracking number.',
    '/contact', 1, true, md5('app-guide-contact-v1')
  ),
  (
    'faq', '00000000-0000-4000-8000-000000000120',
    'Obtenir de l’aide avec le chatbot et ouvrir la bonne page | Get chatbot help and open the right page',
    'AIDE PAR CHATBOT. Le bouton flottant en bas à droite ouvre l’assistant. Posez une question en langage naturel sur les services, alertes, démarches, pièces justificatives ou fonctionnalités de l’application. L’assistant répond à partir des informations publiées, affiche des sources cliquables et peut proposer des choix directs. Sélectionnez un lien pour ouvrir la bonne page ; les créations de demandes ou signalements demandent votre action et confirmation. Si l’information n’est pas publiée, l’assistant doit l’indiquer plutôt que l’inventer. EN: CHATBOT HELP. The floating bottom-right button opens the assistant. Ask in natural language about services, alerts, procedures, supporting documents or app features. It answers from published information, displays clickable sources and may offer direct choices. Select a link to open the right page; creating a request or report requires your action and confirmation. If information is not published, the assistant should say so rather than make it up.',
    '/guide', 1, true, md5('app-guide-chatbot-v1')
  )
on conflict (entity_type, entity_id, version) do update
set title = excluded.title,
    content = excluded.content,
    url = excluded.url,
    is_published = excluded.is_published,
    content_hash = excluded.content_hash,
    updated_at = now();
