# Pages modèles facultatives

Les six pages sous `src/pages/templates/` servent de réserve de composants prêts à reprendre. Elles ne font pas partie du parcours public principal.

## Les ouvrir dans le navigateur

1. À la racine du projet, lancez `npm run dev`.
2. Ouvrez l'adresse locale affichée par Vite (par défaut `http://localhost:5173`) puis ajoutez `/modeles`.
3. Depuis l'index, choisissez une carte. Pour la galerie de composants et les palettes, ouvrez aussi `/kit`.

En développement, `/kit` et `/modeles` sont toujours disponibles. Pour les inclure dans un build de production, définissez `VITE_ENABLE_KIT=true` dans `.env.local` avant `npm run build`. Pour les masquer en production, laissez cette valeur absente ou mettez-la à `false`. Si `VITE_USE_HASH_ROUTER=true`, ouvrez les routes avec le hash, par exemple `http://localhost:5173/#/modeles`.

## Les six modèles

| Route | Fichier | Contenu |
|---|---|---|
| `/modeles/galerie` | `gallery-page.tsx` | Grille d'images et lightbox |
| `/modeles/3d` | `three-d-page.tsx` | Scène 3D légère, chargée avec sa route |
| `/modeles/video` | `video-page.tsx` | Lecteur vidéo responsive |
| `/modeles/interactions` | `interactions-page.tsx` | Bouton asynchrone, réaction et petites animations |
| `/modeles/marketing` | `marketing-page.tsx` | Sections hero, offres, FAQ et appels à l'action |
| `/modeles/tableau-de-bord` | `dashboard-page.tsx` | Cartes et graphiques SVG de démonstration |

Le contenu et les chiffres des pages modèles sont des exemples ; remplacez-les avant de présenter une fonctionnalité comme terminée. Le modèle 3D utilise Three.js et ne doit rester monté que si le sujet en a besoin.

## Garder, adapter ou retirer

- **Garder une page** : conservez sa route dans `src/app/router.tsx`, enlevez son avis de modèle si nécessaire, puis adaptez textes et données.
- **Réutiliser une partie** : copiez seulement les composants utiles dans la page réelle du sujet, puis retirez la route modèle.
- **Retirer les modèles** : retirez les routes facultatives correspondantes et les imports de l'index dans `templates-index-page.tsx`, puis supprimez les fichiers inutiles. Cherchez les références avant suppression.

Les composants de base réutilisés ailleurs vivent dans `src/components/` et `src/components/ui/`. Ne supprimez pas une primitive tant qu'une page ou un modèle l'importe.
