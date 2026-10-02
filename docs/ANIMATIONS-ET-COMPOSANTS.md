# Animations et composants à choisir pendant le sprint

## Démonstration prête à ouvrir

En développement, ouvrez `/modeles/animations`. La galerie montre les transitions entre routes, le hero séquencé, le navbar qui flotte au scroll, le fond aurora WebGL, les animations de texte, un slider, un marquee, une grille bento, les meteors et le beam de bordure.

| Besoin | Composant ou emplacement | Import / action |
|---|---|---|
| Transition de route | `src/components/animated/transition-link.tsx` | `import { TransitionLink } from "@/components/animated/transition-link"` |
| Hero animé | `rise` dans `src/index.css`, `TextReveal` | `import { TextReveal } from "@/components/animated/text-reveal"` |
| Arrière-plan qui suit le pointeur et le scroll sur l'accueil | `src/components/home-interactive-background.tsx`, réglages dans `src/lib/home-background-config.ts` | `import { HomeInteractiveBackground } from "@/components/home-interactive-background"` |
| Shader WebGL aurora | `src/components/animated/aurora-shader.tsx` | `import { AuroraShader } from "@/components/animated/aurora-shader"` |
| Texte dégradé, reveal texte, marquee, meteors, border beam | `src/components/animated/` | Imports individuels, aucun paquet d'animation requis |
| Slider natif animé | `src/components/ui/slider.tsx` | `import { Slider } from "@/components/ui/slider"` |
| Bento grid | `src/components/ui/bento-grid.tsx` | `import { BentoGrid, BentoCard } from "@/components/ui/bento-grid"` |
| Navbar attaché puis détaché | `src/components/layout/site-header.tsx`, styles dans `src/index.css` | Déjà actif sur les pages publiques ; défiler pour le voir |

`AuroraShader` prend `colorA`, `colorB`, `colorC` (hex), `speed` et `className`. Il garde un fond CSS si WebGL est indisponible, réduit la résolution du canvas, suspend la boucle si l'onglet est caché et dessine une image fixe si `prefers-reduced-motion` est activé.

`TextReveal` accepte `text`, `as`, `by="word" | "character"`, `effect="rise" | "blur" | "slide"`, `delayMs` et `durationMs`. Pour les Marquee, utilisez du contenu décoratif non interactif : l'élément est dupliqué pour boucler sans interruption.

Pour animer un lien React Router, utilisez `TransitionLink` ou ajoutez `viewTransition` à `Link` / `NavLink`. Le CSS des pseudo-éléments `::view-transition-*` est déjà dans `src/index.css`. L'animation dépend du support View Transition du navigateur et disparaît avec la préférence de réduction des mouvements.

## Primitives d'interface déjà disponibles

Le starter fournit déjà `Button` (plusieurs formes et variantes), `Card`, `Badge`, `Input`, `Label`, `Textarea`, `Dialog`, `Tooltip`, `Separator`, `Skeleton`, `Accordion`, `Avatar`, `Breadcrumb`, `Checkbox`, `Progress`, `Select`, `Slider`, `Switch`, `Table`, `Tabs`, `Sonner`, un état vide, la confirmation, la pagination, les graphiques SVG, `AsyncButton`, `LikeButton` et `BentoGrid`. Le kit `/kit` les montre en contexte. Les fichiers UI se trouvent dans `src/components/ui/`; les motifs animés sont regroupés sous `src/components/animated/`.

## Ajouter d'autres composants shadcn/ui au besoin

Le CLI ajoute le code source à `src/components/ui/`, où l'équipe peut ensuite le modifier. `components.json` est déjà configuré. Commande pour les composants courants qui complètent ceux déjà présents :

```sh
npx shadcn@latest add alert-dialog aspect-ratio calendar carousel collapsible combobox command context-menu date-picker drawer dropdown-menu field hover-card input-group input-otp item kbd menubar navigation-menu popover radio-group resizable scroll-area sheet sidebar toggle toggle-group
```

Il n'est pas nécessaire de tout ajouter au produit final. Pendant le sprint, installez le petit groupe que le sujet réclame, examinez les dépendances annoncées par le CLI, puis supprimez les composants inutilisés avant publication.

`Data Table` est un guide de composition basé sur `Table` et TanStack Table, pas un composant autonome du CLI. Pour l'ajouter, installez `table`, puis suivez le [guide Data Table officiel](https://ui.shadcn.com/docs/components/data-table) et adaptez-le aux données du projet.

Références : [catalogue officiel shadcn/ui](https://ui.shadcn.com/docs/components) · [registre de composants](https://ui.shadcn.com/docs/directory).

## Ajouter des effets Magic UI

Magic UI est un registre communautaire : le CLI copie ses composants dans votre dépôt. La galerie locale fournit déjà des versions légères de Bento Grid, Border Beam, Meteor Field, texte dégradé, texte découpé et marquee. Pour comparer avec le registre officiel et copier d'autres effets :

```sh
npx shadcn@latest add @magicui/animated-list @magicui/blur-fade @magicui/magic-card @magicui/number-ticker @magicui/orbiting-circles @magicui/scroll-progress @magicui/shimmer-button @magicui/text-animate @magicui/word-rotate
```

Les versions locales de Bento Grid, Border Beam, Animated Gradient Text, Meteors et Marquee sont déjà dans le starter. Pour tester la version Bento Grid du registre, sauvegardez ou renommez `src/components/ui/bento-grid.tsx` avant d'exécuter `npx shadcn@latest add @magicui/bento-grid`, car les deux versions utilisent le même chemin.

La plupart des effets de texte ou de cartes peuvent importer une bibliothèque d'animation. Gardez un œil sur le JavaScript généré, n'activez pas plusieurs effets continus dans la même vue et respectez `prefers-reduced-motion`.

Références : [catalogue Magic UI](https://magicui.design/docs/components) · [grille bento](https://magicui.design/docs/components/bento-grid) · [Border Beam](https://magicui.design/docs/components/border-beam).

## Utilisation et installation hors ligne

Les commandes `shadcn` nécessitent un accès réseau et téléchargent du code de registre. Pour travailler hors ligne pendant le concours, ajoutez les composants susceptibles d'être utilisés avant le départ et gardez leurs sources dans le dépôt. Le starter lui-même ne requiert aucun accès CDN pour les composants déjà présents.
