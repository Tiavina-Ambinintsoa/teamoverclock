# Webcup 2026 · Starter React

Un socle générique et adaptatif pour lancer le développement dès la révélation du sujet du 24h by Webcup. Il fournit l'accueil public, l'authentification, un espace privé, un exemple CRUD complet, un accès administrateur protégé, des composants réutilisables, des thèmes et plusieurs pages modèles.

**Ce starter accélère le démarrage ; il ne peut pas contenir à l'avance la logique propre à chaque sujet.** Les uploads, notifications temps réel, paiements, emails de production, modération réelle et autres services métier restent à configurer ou à construire selon le sujet.

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

`Button` accepte les variantes `default`, `secondary`, `outline`, `soft`, `ghost`, `link`, `highlight`, `destructive`; les formes `default`, `rounded`, `pill`, `square`; les tailles `sm`, `default`, `lg`, `icon`.

```tsx
<Button variant="highlight" shape="pill" size="lg">Commencer</Button>
<Button variant="soft" shape="rounded">En savoir plus</Button>
<Button variant="destructive" shape="pill">Supprimer</Button>
```

La galerie `/kit` présente ces variantes avec les composants de formulaire et les autres primitives.

## Carte des dossiers et fichiers

| Chemin | Rôle | Import / exemple |
|---|---|---|
| `src/components/ui/` | Primitives d'interface : `Button`, `Card`, `Badge`, `Dialog`, `Input`, `Label`, `Separator`, `Skeleton`, `Textarea`, `Tooltip`, `Sonner` | `import { Button } from "@/components/ui/button"` |
| `src/components/layout/` | `RootLayout`, `SiteHeader`, `SiteFooter`, `ApplicationLayout`, `Container` | `import { Container } from "@/components/layout/container"` |
| `src/components/` | `PageHeader`, `EmptyState`, `ConfirmDialog`, `Pagination`, `Reveal`, `Lightbox`, `VideoPlayer`, thème et langue | `import { EmptyState } from "@/components/empty-state"` |
| `src/components/interactive/` | `AsyncButton` pour les états chargement/réussite/erreur, `LikeButton` avec effet de particules | `import { AsyncButton } from "@/components/interactive/async-button"` |
| `src/components/charts/` | `BarChart`, `DonutChart`, `Sparkline` légers en SVG | `import { Sparkline } from "@/components/charts/sparkline"` |
| `src/components/three/` | Visualiseur 3D et scène Three.js, réservés à la route modèle 3D | `import { ThreeViewer } from "@/components/three/three-viewer"` |
| `src/features/auth/` | Connexion, inscription, OAuth, mot de passe oublié, rôles et routes protégées | `import { useAuth } from "@/features/auth/auth-context"` |
| `src/features/items/` | Parcours vertical d'exemple Notes : API, hooks, formulaire et pages CRUD | `import { useItems } from "@/features/items/use-items"` |
| `src/features/admin/` | Console admin de départ et garde de rôle | Route `/admin`, rôle `app_metadata.role` |
| `src/pages/app/` | Tableau de bord et paramètres de l'espace privé | Route `/app/dashboard` |
| `src/pages/templates/` | Galerie, 3D, vidéo, interactions, marketing, tableau de bord d'exemple | Index `/modeles` |
| `src/hooks/` | `useReveal`, `useCountUp`, `useReducedMotion`, `useNow`, `useMounted` | `import { useReveal } from "@/hooks/use-reveal"` |
| `src/lib/` | Environnement, Supabase, formatage, stockage, local DB, site, thèmes et utilitaires | `import { SITE } from "@/lib/site"` |
| `src/styles/presets.css` | Tokens et cinq palettes clair/sombre | sélection dans `/kit` |
| `supabase/schema.sql` | Tables `profiles` et `items`, GRANT, RLS, policies et trigger de profil | À exécuter dans le SQL Editor Supabase |

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
| `/equipe`, `/contact`, `/conditions`, `/confidentialite` | Pages publiques à adapter ; le formulaire contact reste une démo |
| `/app` | CRUD Notes : créer, lire, rechercher, paginer, modifier et supprimer |
| `/app/items/:id` | Détail et modification de la note par son auteur |
| `/app/dashboard`, `/app/parametres` | Tableau de bord de départ, profil en lecture, préférences de thème/langue |
| `/admin/connexion`, `/admin/*` | Connexion admin et console squelette protégée par le rôle |
| `/kit` | Galerie de composants, thèmes et diagnostics |
| `/modeles` et `/modeles/*` | Index des modèles et six pages de démonstration |

Les pages `/kit` et `/modeles` sont ouvertes en développement. En production, elles sont désactivées par défaut ; ajoutez `VITE_ENABLE_KIT=true` avant le build seulement si vous en avez besoin. Voir [docs/07-modeles-de-pages.md](docs/07-modeles-de-pages.md) pour les URL directes.

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

La page d'accueil utilise une séquence d'entrée du hero, des cartes révélées au scroll, un aperçu flottant avec mini-graphique animé et des survols discrets. Le panneau login/signup a une entrée latérale et des halos décoratifs. D'autres exemples sont dans `/modeles/interactions`.

Pour garder un rendu fluide et présentable au jury :

- préférez les transitions `transform` et `opacity` aux animations de dimensions ou de mise en page ;
- limitez les délais et les animations en boucle ; réservez-les aux éléments décoratifs ;
- gardez l'action et le texte lisibles sans animation ;
- conservez `prefers-reduced-motion` ; `Reveal` l'intègre déjà ;
- vérifiez le rendu mobile et les performances avant de garder une animation lourde.

Aucune animation ne remplace un vrai parcours métier et une démo fonctionnelle.

## Ce qui reste à construire selon le sujet

Le starter n'a pas encore de service configuré pour le formulaire de contact, les uploads/galeries, le profil modifiable, les commentaires, la modération, les notifications temps réel, les emails transactionnels, l'IA, les paiements ou les tâches planifiées. La console admin et le dashboard sont des squelettes. Ajoutez seulement ce que le sujet et le barème demandent ; évitez les fonctionnalités sans parcours complet.

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

Les détails d'inventaire et les fonctions encore non implémentées sont dans [docs/INVENTAIRE.md](docs/INVENTAIRE.md).