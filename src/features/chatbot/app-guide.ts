import type { KbEntry } from "@/features/chatbot/chatbot-engine"

/** Guide de l'application (écrans, chemins, étapes), toujours ajouté à la base de connaissances de l'assistant. */
const GUIDE: [title: string, url: string, content: string][] = [
  ["Accueil / Home (vue d'ensemble de la ville)", "/", "Page / : vue d'ensemble de la ville avec indicateurs, services, signalements, projets les plus soutenus, les plus utilisés, transports et raccourcis. City overview page with KPIs, services, reports, projects, most used items, transport and shortcuts."],
  ["Page Welcome", "/welcome", "Page /welcome : page d'accueil de présentation de Nova Terra avec barre de navigation Home et Welcome. Presentation landing page."],
  ["Se connecter / Log in", "/connexion", "Page /connexion : connexion avec e-mail et mot de passe. Un lien permet de récupérer un mot de passe oublié (/mot-de-passe-oublie). Les administrateurs utilisent /admin/connexion. Log in with email and password."],
  ["Créer un compte / Sign up", "/inscription", "Page /inscription : création d'un compte citoyen. Après l'inscription, vérifiez votre identité (CIN) dans /app/verification pour pouvoir voter et commenter. Create a citizen account, then verify identity to vote and comment."],
  ["Mot de passe oublié / Reset password", "/mot-de-passe-oublie", "Page /mot-de-passe-oublie : recevez un e-mail pour réinitialiser votre mot de passe, puis choisissez-en un nouveau sur /nouveau-mot-de-passe."],
  ["Services de la ville / City services", "/services", "Page /services : liste des services publics avec statut, horaires, note moyenne. Cliquez un service pour voir /services/:slug : démarches, documents requis, contacts, calendrier de rendez-vous, avis et commentaires. Dans votre espace utilisez /app/services."],
  ["Avis et commentaires sur un service ou un équipement / Reviews", "/app/services", "Pour noter ou commenter un service ou un équipement : ouvrez /app/services (Services et avis), choisissez un service, puis utilisez la section Avis en bas de la fiche. Il faut un compte connecté et vérifié. Rate or comment a service or facility from its detail page."],
  ["Projets de la ville et votes / City projects & voting", "/app/projects", "Pour voter pour un projet ou le commenter : ouvrez /app/projects (Projets et votes) dans votre espace, ou /projects en public. Il faut un compte vérifié. Vote and comment on city projects."],
  ["Actualités / News", "/news", "Page /news : actualités publiées par les services. /news/:slug : article détaillé avec commentaires."],
  ["Carte de la ville / Map", "/map", "Page /map : carte interactive de la ville avec secteurs, bâtiments, services et dangers."],
  ["Dangers et alertes / Dangers & alerts", "/dangers", "Page /dangers : alertes et dangers actifs ou archivés. /dangers/:slug : détail d'une alerte. En cas d'urgence appelez les numéros d'urgence."],
  ["Guide et FAQ", "/guide", "Pages /guide et /faq : aide à l'utilisation de l'application et questions fréquentes."],
  ["API développeurs / Developer API", "/developers", "Page /developers : catalogue de l'API publique et des fonctions (chat Gemini, chat vocal, etc.) pour les développeurs."],
  ["Mon espace : tableau de bord / My space dashboard", "/app", "Page /app : tableau de bord du citoyen avec résumé de vos demandes, signalements et notifications. Menu latéral Mon espace."],
  ["Mes demandes / My requests", "/app/requests", "Page /app/requests : créez et suivez vos demandes auprès des services (numéro de suivi, statut, messages). Vous pouvez aussi demander à l'assistant de créer une demande ; il demande confirmation avant."],
  ["Mes signalements / My reports", "/app/reports", "Page /app/reports : signalez un problème (voirie, éclairage, déchets...) et suivez son traitement. L'assistant peut préparer un signalement avec confirmation."],
  ["Appeler un conseiller / Call an agent", "/app/support", "Page /app/support : demandez à parler à un conseiller (appel). Call an agent."],
  ["Vérification d'identité / Identity verification", "/app/verification", "Page /app/verification : envoyez votre CIN pour vérifier votre identité. Un compte vérifié est nécessaire pour voter, commenter et noter."],
  ["Accessibilité et thème / Accessibility", "/app/accessibility", "Page /app/accessibility : choisissez le thème (minimaliste ou Nova Terra), taille du texte, contraste, animations réduites, lecture à voix haute."],
  ["Lettres d'information / Newsletters", "/app/newsletter", "Page /app/newsletter : abonnez-vous ou désabonnez-vous des lettres d'information."],
  ["Réputation et votes sur les utilisateurs / Reputation", "/app/reputation", "Page /app/reputation : classement et réputation des utilisateurs. Ouvrez un profil (/app/reputation/:profileId) pour voter pour un utilisateur. Vote for a user from their profile."],
  ["Paramètres / Settings", "/app/parametres", "Page /app/parametres : profil, langue, mot de passe, sécurité, alertes de connexion, suppression du compte."],
  ["Assistant virtuel / Chatbot", "/?assistant=open", "Bouton flottant d'assistant : posez vos questions sur la ville et l'application (réponses Gemini à partir des données publiées, avec sources), dictée vocale, lecture à voix haute. Limite de 20 messages IA par jour. L'assistant ne crée rien sans votre confirmation."],
  ["Espace agent : tableau de bord / Agent workspace", "/agent", "Pour les agents et administrateurs de service : /agent/requests (demandes), /agent/reports (signalements), /agent/dangers (alertes), /agent/analytics (analyses), /agent/calls (appels), /agent/news (actualités du service), /agent/services (mes services), /agent/projects (votes sur les projets), /agent/team (équipe), /agent/sync (synchronisation API)."],
  ["Administration / Admin", "/admin", "Pour les administrateurs : /admin/users (utilisateurs et rôles), /admin/verifications (vérifications CIN), /admin/services, /admin/projects (projets de la ville), /admin/map (éditeur de carte), /admin/news (modération), /admin/dangers, /admin/reports, /admin/analytics, /admin/ai-content (contenu IA), /admin/audit (journal d'audit). Connexion admin : /admin/connexion."],
  ["Barre de navigation et menu / Navigation", "/", "L'en-tête public contient les liens principaux, la langue (FR/EN), l'aide, le mode clair/sombre, le menu utilisateur (Mon espace, Paramètres, Quitter) et le bouton Espace admin pour les administrateurs. Dans l'espace connecté, la barre latérale regroupe Mon espace, Espace agent, Administration et La ville."],
  ["Rôles / Roles", "/app", "Rôles : citoyen (compte vérifié pour voter et commenter), agent, administrateur de service, administrateur général. Chaque rôle voit son menu dans la barre latérale."],
]

export const APP_GUIDE: KbEntry[] = GUIDE.map(([title, url, content], index) => ({
  id: `app-guide-${index}`,
  entity_type: "app_guide",
  title,
  content,
  url,
}))
