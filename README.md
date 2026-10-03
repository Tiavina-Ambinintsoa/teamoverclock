# Webcup 2026 · Starter React

Un socle générique et adaptatif pour lancer le développement dès la révélation du sujet du 24h by Webcup. Il fournit l'accueil public, l'authentification, un espace privé, un exemple CRUD complet, un accès administrateur protégé, des composants réutilisables, des thèmes et plusieurs pages modèles.

**Ce starter accélère le démarrage ; il ne peut pas contenir à l'avance la logique propre à chaque sujet.** Le stockage et les notifications de contact sont prêts à configurer ; commentaires, notifications temps réel métier, paiements et règles de modération propres au sujet restent à construire.

## Démarrage en quelques minutes

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Sans clés Supabase, l'application fonctionne en mode démo local dans le navigateur. Pour utiliser un projet Supabase, renseignez dans `.env.local` :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Redémarrez Vite après une modification des variables. Le guide complet, les redirections OAuth et le rôle admin sont dans [docs/SUPABASE.md](docs/SUPABASE.md). La clé publishable/anon est destinée au navigateur avec RLS activée ; une clé `sb_secret` ou `service_role` doit rester sur le serveur.

Pour afficher la carte détaillée du modèle `/modeles/carte`, créez une clé MapTiler, ajoutez `VITE_MAPTILER_API_KEY=...` dans `.env.local` et restreignez cette clé à l'origine de votre site. Sur HODI, configurez la même variable dans l'environnement de build puis reconstruisez `dist/` (voir [docs/DEPLOIEMENT-HODI.md](docs/DEPLOIEMENT-HODI.md)). Sans clé, la page affiche un aperçu schématique local sans requêtes au serveur de tuiles OpenStreetMap. Les variables `VITE_*` sont publiques dans le navigateur.

## Importer les composants

L'alias `@/` pointe vers `src/`. Utilisez-le pour garder des imports lisibles :

```tsx
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"

<PageHeader
  eyebrow="Espace projet"
  title="Mes projets"
  description="Retrouvez vos projets et créez-en un nouveau."
  actions={<Button shape="pill">Nouveau projet</Button>}
/>
```

### Boutons

`Button` accepte les variantes `default`, `secondary`, `outline`, `soft`, `ghost`, `link`, `highlight`, `destructive`, `gradient`, `glass`, `inverse`; les formes `default`, `rounded`, `squircle`, `pill`, `square`, `asymmetric`; les tailles `sm`, `default`, `lg`, `xl`, `icon-sm`, `icon`, `icon-lg`.

```tsx
<Button variant="highlight" shape="pill" size="lg">Commencer</Button>
<Button variant="soft" shape="rounded">En savoir plus</Button>
<Button variant="destructive" shape="pill">Supprimer</Button>
<Button variant="gradient" size="xl">Créer mon projet</Button>
<Button variant="glass" shape="squircle">En savoir plus</Button>
```

La galerie `/kit` présente ces variantes avec les composants de formulaire et les autres primitives.

## Carte des dossiers et fichiers

| Chemin | Rôle | Import / exemple |
|---|---|---|
| `src/components/ui/` | `Button`, `Card`, `Badge`, `Dialog`, `Input`, `Label`, `Textarea`, `Tooltip`, `Separator`, `Skeleton`, `Accordion`, `Avatar`, `Breadcrumb`, `Checkbox`, `Progress`, `Select`, `Slider`, `Switch`, `Table`, `Tabs`, `Sonner`, `BentoGrid` | `import { Button } from "@/components/ui/button"` |
| `src/components/layout/` | `RootLayout`, `SiteHeader`, `SiteFooter`, `ApplicationLayout`, `Container` | `import { Container } from "@/components/layout/container"` |
| `src/components/` | `PageHeader`, `EmptyState`, `RouteError`, `ConfirmDialog`, `Pagination`, `Reveal`, `StorageUploader`, `Lightbox`, `VideoPlayer`, thème et langue | `import { EmptyState } from "@/components/empty-state"` |
| `src/components/interactive/` | `AsyncButton` pour les états chargement/réussite/erreur, `LikeButton` avec effet de particules | `import { AsyncButton } from "@/components/interactive/async-button"` |
| `src/components/animated/` | `TransitionLink`, `AuroraShader` WebGL, `TextReveal`, `AnimatedGradientText`, `Marquee`, `MeteorField`, `BorderBeam` | `import { AuroraShader } from "@/components/animated/aurora-shader"` |
| `src/components/home-interactive-background.tsx` + `src/lib/home-background-config.ts` | Fond de l'accueil en halos, réglable et réactif au pointeur/scroll | `import { HomeInteractiveBackground } from "@/components/home-interactive-background"` |
| `src/components/image-parallax-background.tsx` | Fond image local avec parallaxe pointeur/scroll et respect de la réduction des animations | `import { ImageParallaxBackground } from "@/components/image-parallax-background"` |
| `src/components/home-presets/alternate-home-heroes.tsx` | Heroes réutilisables classique alternatif : gaming futuriste, image animée, objet Three.js central | Page modèle `/modeles/accueils` |
| `src/components/theme-switcher.tsx` | Sélecteurs de mode clair/sombre, palette, police et morphisme global | `import { MorphismPicker } from "@/components/theme-switcher"` |
| `src/components/charts/` | `BarChart`, `DonutChart`, `Sparkline` légers en SVG | `import { Sparkline } from "@/components/charts/sparkline"` |
| `src/components/three/` | Visualiseur 3D et scène Three.js, réservés à la route modèle 3D | `import { ThreeViewer } from "@/components/three/three-viewer"` |
| `src/features/auth/` | Connexion, inscription, OAuth, mot de passe oublié, rôles et routes protégées | `import { useAuth } from "@/features/auth/auth-context"` |
| `src/features/items/` | Parcours vertical d'exemple Notes : API, hooks, formulaire et pages CRUD | `import { useItems } from "@/features/items/use-items"` |
| `src/features/admin/` | Console admin de départ et garde de rôle | Route `/admin`, rôle `app_metadata.role` |
| `src/features/notifications/` | Menu des notifications du compte connecté | `import { NotificationsMenu } from "@/features/notifications/notifications-menu"` |
| `src/pages/app/` | Tableau de bord et paramètres de l'espace privé | Route `/app/dashboard` |
| `src/pages/app/assistant-page.tsx` | Chatbot OpenRouter, historique facultatif | Route `/app/assistant` |
| `supabase/functions/` | Proxy OpenRouter, contact, suppression du compte et API admin | Secrets uniquement côté Edge Function |
| `src/pages/templates/` | Variantes d'accueil, animations, agenda, carte, galerie, 3D, vidéo, interactions, marketing, tableau de bord d'exemple | Index `/modeles` |
| `src/hooks/` | `useReveal`, `useCountUp`, `useReducedMotion`, `useNow`, `useMounted` | `import { useReveal } from "@/hooks/use-reveal"` |
| `src/lib/` | Environnement, Supabase, formatage, stockage, local DB, site, thèmes, polices et utilitaires | `import { SITE } from "@/lib/site"` |
| `src/lib/typography-presets.ts` | Choix des polices Instrument Sans, Bricolage Grotesque, Fraunces, système ou police de la palette | `import { TYPOGRAPHIES } from "@/lib/typography-presets"` |
| `src/lib/morphisms.ts` | Styles de surface Standard, glass, clay, skeuomorphique, neumorphique, minimal, néo-brutaliste et liquid glass | Sélection dans `/app/parametres` ou `/kit` |
| `docs/ANIMATIONS-ET-COMPOSANTS.md` | Catalogue des animations, primitives UI et commandes shadcn/Magic UI à choisir selon le sujet | Guide à garder ouvert pendant le sprint |
| `src/styles/presets.css` | Tokens et quatorze palettes clair/sombre, dont Miel & sauge et Canopée | sélection dans `/app/parametres` ou `/kit` |
| `supabase/schema.sql` | Tables de profil, Notes, chat, contact et notifications ; GRANT, RLS, fonctions de quota et Storage privé | À exécuter dans le SQL Editor Supabase |

### Composants transversaux ajoutés

- **`PageHeader`** : titre, description, petit surtitre et actions alignés.
- **`EmptyState`** : état vide ou recherche sans résultat avec icône, explication et action possible.
- **`ConfirmDialog`** : confirmation accessible pour suppression/action risquée. Il bloque les doubles soumissions et garde la fenêtre ouverte avec l'erreur si une action asynchrone échoue.
- **`Pagination`** : navigation précédente/suivante contrôlée par l'écran. La démo Notes filtre et pagine les résultats en mémoire ; pour de gros volumes, déplacez cette pagination dans la requête Supabase.
- **`Reveal`** : apparition au défilement avec délai d'échelonnement et respect de `prefers-reduced-motion`.

```tsx
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Reveal } from "@/components/reveal"

<Reveal delayMs={120}>
  <article className="rounded-2xl border p-5">Une carte qui apparaît au défilement</article>
</Reveal>

<ConfirmDialog
  open={confirmOpen}
  onOpenChange={setConfirmOpen}
  title="Supprimer cet élément ?"
  description="Cette action est définitive."
  confirmLabel="Supprimer"
  onConfirm={async () => await deleteItem(id)}
/>
```

## Pages déjà présentes

| Route | Usage |
|---|---|
| `/` | Accueil public, appels à l'action et aperçu animé du produit |
| `/connexion`, `/inscription` | Auth avec formulaire, Google/Facebook quand OAuth est configuré, mode démo sinon |
| `/mot-de-passe-oublie`, `/nouveau-mot-de-passe` | Récupération/changement de mot de passe via Supabase |
| `/equipe`, `/contact`, `/conditions`, `/confidentialite` | Pages publiques ; contact stocké côté serveur et envoyé par Resend si configuré |
| `/app` | CRUD Notes : créer, lire, rechercher, paginer, modifier et supprimer |
| `/app/items/:id` | Détail et modification de la note par son auteur |
| `/app/dashboard`, `/app/parametres` | Tableau de bord, édition du profil/e-mail, mot de passe, suppression du compte, fichiers privés et préférences |
| `/app/assistant` | Chat OpenRouter, quota quotidien; activation par `VITE_ENABLE_AI_CHAT=true`, historique facultatif |
| `/admin/connexion`, `/admin/*` | Console admin, gestion des utilisateurs et boîte contact via Edge Function protégée |
| `/kit` | Galerie de composants, thèmes, polices et diagnostics |
| `/modeles` et `/modeles/*` | Index des modèles et dix pages de démonstration, dont `/modeles/accueils`, `/modeles/animations`, `/modeles/agenda` et `/modeles/carte` |

Les pages `/kit` et `/modeles` sont ouvertes en développement. En production, elles sont désactivées par défaut ; ajoutez `VITE_ENABLE_KIT=true` avant le build seulement si vous en avez besoin. Les modèles et leurs routes sont listés dans la section [Pages déjà présentes](#pages-déjà-présentes).

## Copier le CRUD Notes pour le sujet

Le CRUD est organisé par fonctionnalité pour servir de patron plutôt que d'éparpiller les changements :

1. Copiez `src/features/items/` vers un nom métier comme `src/features/projets/`.
2. Changez l'interface/type, puis les fonctions `list`, `get`, `create`, `update`, `delete` dans `items-api.ts`.
3. Remplacez les hooks React Query et les clés de cache dans `use-items.ts`.
4. Adaptez le schéma Zod, le formulaire et les pages liste/détail.
5. Ajoutez ou changez les routes dans `src/app/router.tsx`.
6. Créez la table, les index, les GRANT et policies RLS dans `supabase/schema.sql`.
7. Essayez les deux chemins : démo locale et compte Supabase réel.

L'API de notes donne déjà un exemple de stockage Supabase **et** de secours local. Gardez les contrôles de propriété dans la base avec RLS : une route React privée ne sécurise pas des données.

## Animations et finition visuelle

La page d'accueil utilise une séquence d'entrée du hero, des cartes révélées au scroll, un aperçu flottant avec mini-graphique animé et des survols discrets. Son fond suit doucement le pointeur et le défilement. Le panneau login/signup a une entrée latérale et des halos décoratifs ; après une connexion réussie, la zone photo glisse à gauche et le formulaire à droite avant l'ouverture de l'espace. La galerie `/modeles/animations` regroupe les transitions de routes, le navbar flottant, hero, shaders WebGL, animations de texte, slider, marquee et effets bento/Magic UI. Le guide [docs/ANIMATIONS-ET-COMPOSANTS.md](docs/ANIMATIONS-ET-COMPOSANTS.md) liste les imports et commandes pour ajouter d'autres composants shadcn au besoin.

La galerie `/modeles/accueils` prévisualise trois directions alternatives. Essayez-les directement sur l'accueil avec `/?hero=futuriste`, `/?hero=image` ou `/?hero=3d`. Pour choisir celle qui sera utilisée par défaut, changez `HOME_HERO_DEFAULT` dans `src/pages/home-page.tsx` (`"classic"`, `"futuriste"`, `"image"` ou `"3d"`). Le fond image fourni est `public/images/home-aurora.svg`; remplacez ce fichier ou la propriété `src` de `ImageParallaxBackground` par votre image locale.

Le morphisme se choisit dans **Paramètres → Apparence** ou dans l'en-tête de `/kit`. Le choix est mémorisé dans le navigateur et agit sur les cartes, boutons, champs, dialogues, menus et panneaux d'authentification au niveau global. Choisissez **Standard** pour retrouver les formes du thème sans effet de morphisme. Les palettes gardent la responsabilité des couleurs ; le morphisme transforme les surfaces, contours, rayons et ombres.

À sa première connexion sur un appareil, chaque compte choisit entre **Nova Terra** et **Minimaliste**. Le mode minimaliste utilise les polices système, coupe animations et effets décoratifs, et charge uniquement la carte 2D (le moteur 3D est chargé à la demande). À la déconnexion, les réglages d'apparence de l'appareil reviennent aux valeurs `SITE` par défaut. Si le navigateur signale des tâches longues persistantes, ou si l'appareil ne signale qu'un ou deux cœurs CPU, l'application bascule automatiquement sur **Lagon** et réduit les animations. La détection des tâches longues dépend des capacités du navigateur.

Deux boutons flottants, au-dessus de l'assistant, ouvrent les réglages rapides d'accessibilité et activent/désactivent séparément la lecture automatique de l'écran. Les services affichent leur état en permanence ; leurs administrateurs peuvent publier une fermeture imprévue ou programmer un changement et une réouverture. Une fiche service inclut un agenda de demandes de rendez-vous. Les agents administrateurs peuvent renseigner les prochaines étapes et documents d'un signalement, et notifier le citoyen d'un report avec une explication obligatoire. Les changements importants apparaissent aussi sur l'accueil.

Ces fonctions nécessitent la migration [20261003214500_service_status_reports_and_appointments.sql](./supabase/migrations/20261003214500_service_status_reports_and_appointments.sql) ; appliquez-la à Supabase avant d'utiliser les écrans de gestion et de réservation.

Pour changer le fond d'accueil, modifiez `HOME_BACKGROUND_CONFIG` dans `src/lib/home-background-config.ts` : couleurs (tokens `var(--primary)`/`var(--highlight)`), nombre et taille des halos, positions, opacité, intensité du pointeur et du scroll. Passez `enabled` à `false` pour le désactiver. Le mouvement du pointeur ne s'active que sur les appareils avec une souris ou un pavé tactile précis ; les préférences `prefers-reduced-motion` coupent le mouvement.

Pour garder un rendu fluide et présentable au jury :

- préférez les transitions `transform` et `opacity` aux animations de dimensions ou de mise en page ;
- limitez les délais et les animations en boucle ; réservez-les aux éléments décoratifs ;
- gardez l'action et le texte lisibles sans animation ;
- conservez `prefers-reduced-motion` ; `Reveal` l'intègre déjà ;
- vérifiez le rendu mobile et les performances avant de garder une animation lourde.

Aucune animation ne remplace un vrai parcours métier et une démo fonctionnelle.

## Modules serveur à configurer

Les fonctions du dépôt fournissent une base exploitable, mais leurs secrets et le projet Supabase doivent être configurés. Commencez par [docs/DEPLOIEMENT-HODI.md](docs/DEPLOIEMENT-HODI.md), puis consultez les guides [Supabase](docs/SUPABASE.md) et [OpenRouter](docs/OPENROUTER.md).

- **Assistant IA** : clé et modèle OpenRouter côté Edge Function, quota de 20 demandes/jour, limite de 600 tokens/réponse. Historique désactivé par défaut ; activation coordonnée front/serveur documentée.
- **Admin** : `admin-data` revérifie `app_metadata.role` sur chaque appel. Le service role ne quitte jamais la fonction. Les policies SQL donnent les accès admin nécessaires.
- **Compte** : modifier nom, demander un changement d'e-mail avec confirmation, changer le mot de passe, supprimer le compte via une fonction serveur après connexion récente.
- **Fichiers** : bucket privé `uploads`, chemins isolés par utilisateur, images/PDF et 5 Mo maximum ; liens signés d'une heure.
- **Contact/notifications** : messages enregistrés côté serveur et visibles dans la boîte admin. La fonction crée une notification pour les admins. L'e-mail Resend n'est envoyé que si les secrets sont configurés.
- **Production** : OAuth Google/Facebook, SMTP Supabase, URL de redirection finale, variables de build HODI et secrets Edge documentés.

Commentaires publics, modération de contenu, paiements, tâches planifiées et notifications temps réel métier restent à créer selon le sujet. Gardez uniquement les fonctionnalités qui servent le parcours central du concours.

Le rôle admin est lu depuis `app_metadata.role`. Attribuez-le par un moyen de confiance côté serveur; n'acceptez pas un rôle reçu depuis un formulaire client ou `user_metadata`. Les routes et boutons admin ne remplacent pas des policies serveur/RLS.

## Préparation du sprint 24 h

1. Avant l'annonce, choisissez les polices, palettes et structure du dépôt, pas le métier.
2. Dès que le sujet arrive, extrayez les critères du barème et identifiez une seule tranche métier centrale.
3. Remplacez l'exemple Notes par la donnée et les parcours du sujet ; connectez Supabase/RLS au début.
4. Déployez une version minimale tôt, puis améliorez le parcours et le contenu réel.
5. Gardez `/modeles` comme réserve de sections, pas comme pages à montrer telles quelles au jury.
6. À la fin : arrêtez les fonctionnalités nouvelles, passez sur mobile, relisez les textes, vérifiez l'URL déployée et préparez la démonstration.

## Commandes

```sh
npm run dev       # développement local
npm run build     # TypeScript puis build de production
npm run lint      # analyse Oxlint
npm run predeploy # build et rapport avant publication
npm run release   # build strict et contrôle des marqueurs de démo
```

## Tests de parcours automatiques

Les tests Playwright couvrent l'inscription, la connexion, le CRUD complet des notes en mode local, le refus d'accès admin pour un membre et l'application d'une palette. Ils lancent Vite en mode test avec Supabase désactivé ; aucune donnée réelle n'est nécessaire.

```sh
npx playwright install chromium # à faire une fois par poste
npm run test:e2e
```

Le contrôle d'accès testé ici couvre la garde d'interface. Pour vérifier aussi les policies RLS et les fonctions Edge, lancez des tests d'intégration contre un projet Supabase de test.

Pour attribuer le rôle admin ou configurer les fournisseurs et redirections, suivez [docs/SUPABASE.md](docs/SUPABASE.md).
