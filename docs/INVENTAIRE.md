# Inventaire du template

Ce document distingue les éléments déjà utilisables, les vues de démonstration et les idées qui restent à brancher. Les mentions « prêt » décrivent le code du starter ; elles ne garantissent pas qu'un service externe (Supabase, OAuth, envoi de courriel) soit configuré.

## Parcours et pages

| Route | État | Fichier ou comportement |
|---|---|---|
| `/` | Prêt | Accueil public : hero, présentation, quatre fonctionnalités, chiffres, citation et appels à l'action |
| `/equipe` | Prêt à personnaliser | Membres et démarche ; remplacez les exemples dans `src/lib/site.ts` |
| `/contact` | Démo | Formulaire avec honeypot ; n'envoie pas de message tant qu'un service de réception n'est pas relié |
| `/conditions`, `/confidentialite` | Modèle | Textes à faire compléter avant publication |
| `/connexion` | Prêt | E-mail, mot de passe, mot de passe visible/masqué, erreur, accès démo, Google et Facebook |
| `/inscription` | Prêt | Prénom, nom, e-mail, mot de passe, confirmation, conditions et OAuth |
| `/mot-de-passe-oublie`, `/nouveau-mot-de-passe` | Prêt avec Supabase | Demande et changement de mot de passe ; les redirections doivent être permises dans Supabase |
| `/admin/connexion` | Prêt | Connexion réservée au rôle admin ; bouton de démo disponible en mode local |
| `/app` | Fonctionnel | CRUD Notes : création, liste, recherche, pagination locale, suppression confirmée ; démo locale ou Supabase |
| `/app/items/:id` | Fonctionnel | Détail et édition de la note par son auteur, copie du lien |
| `/app/dashboard` | Squelette | Cartes, graphique et liste d'activité à relier aux données du vrai produit |
| `/app/parametres` | Prêt | Profil en lecture, état Supabase/démo, thème clair/sombre et langue |
| `/admin`, `/admin/users`, `/admin/moderation`, `/admin/logs`, `/admin/settings` | Squelette protégé | Navigation et états vides ; aucune action d'administration n'est reliée à une base |
| URL inconnue | Prêt | Page 404 du starter |
| `/kit`, `/modeles/*` | Outils facultatifs | Palette, composants et six pages modèles ; activés en développement ou avec `VITE_ENABLE_KIT=true` |

Le sélecteur français/anglais se trouve uniquement dans `/app/parametres`. Il traduit l'accueil, la navigation, les formulaires d'authentification et les vues de tableau de bord/admin/paramètres. Les exemples « Notes », contact et mentions légales restent en français et sont à adapter au contenu du projet.
## Composants réutilisables

### Mise en page

- `SiteHeader` : identité, navigation publique, connexion/inscription, profil après connexion et menu mobile.
- `SiteFooter` : à propos, contact, accès, conditions, confidentialité et emplacement Webcup/équipe.
- `RootLayout` : mise en page publique ; les écrans d'authentification et les espaces privés utilisent une pleine page dédiée.
- `ApplicationLayout` : sidebar repliable sur mobile, recherche de pages, notifications, profil et déconnexion.
- `Container` : largeur et marges cohérentes.
- `PageHeader` : titre, description, surtitre et actions alignés.
- `EmptyState` : état vide ou recherche sans résultat avec une action possible.
- `ConfirmDialog` : confirmation accessible pour action destructive, avec état asynchrone et erreur.
- `Pagination` : contrôles précédent/suivant pilotés par la page.
- `Reveal` : apparition au défilement, délai d'échelonnement et mouvement réduit.
- `AuthShell` : panneau visuel sans photo, carte animée et liens de navigation.

### Interface

Dans `src/components/ui/` :

- `Button` : variantes primaire, secondaire, contour, douce, texte, fantôme, danger et accent ; formes standard, arrondie, pilule et carrée ; tailles standard, petite, grande et icône.
- `Input`, `Textarea`, `Label` : champs de formulaire avec libellés, validation et erreurs accessibles.
- `Card`, `Badge`, `Separator` : présentation de contenu et d'état.
- `Dialog` : fenêtre modale accessible.
- `Skeleton` : chargement et espaces réservés.
- `Sonner` : toasts de réussite, d'information et d'erreur.
- `Tooltip` : aide contextuelle au survol/focus.

Autres composants :

- `AsyncButton` : bouton pour une action asynchrone.
- `LikeButton` : réaction animée.
- `Lightbox` et `VideoPlayer` : visionneuse d'image et lecteur vidéo.
- `BarChart`, `DonutChart`, `Sparkline` : graphiques SVG légers.
- `ThreeViewer` et `scene` : scène 3D chargée uniquement avec son modèle.
- `PageLoader`, `RouteError` : chargement et erreur de route.
- `ModeToggle`, `ThemeProvider` : choix du mode clair/sombre et persistance.

### Logique et données déjà présentes

- Auth Supabase optionnelle et mode démo local dans `src/features/auth/`.
- Route privée et vérification du rôle administrateur via `app_metadata.role`.
- OAuth Google/Facebook, demande de réinitialisation, changement de mot de passe.
- Exemple Notes avec API, hooks TanStack Query, création/lecture/modification/suppression, recherche, pagination locale, confirmation de suppression, formulaire et règles RLS dans `supabase/schema.sql`.
- Client Supabase optionnel, client HTTP, stockage local de secours, formats Ariary/date d'Antananarivo.
- Animations du hero, révélation au défilement, mini-graphique animé et survol des cartes ; prise en charge de `prefers-reduced-motion`.
- Hooks : compteur animé, montage, heure courante, mouvement réduit et apparition au défilement.
- Cinq palettes du starter, chacune en clair et en sombre : Lagon, Latérite, Baobab, Cosmos et Encre.
- Toutes les routes de page se chargent à la demande ; la 3D n'alourdit pas l'accueil.

## Ce qui dépend d'une configuration

1. **Supabase** : suivez le guide détaillé [docs/SUPABASE.md](SUPABASE.md), copiez `.env.example` vers `.env.local` et renseignez l'URL ainsi que la clé publishable/anon.
2. **OAuth** : activez Google et Facebook dans Supabase Auth, renseignez leurs secrets dans le tableau de bord du fournisseur, puis ajoutez le callback du fournisseur et les URL de retour du site.
3. **Récupération e-mail** : ajoutez `/nouveau-mot-de-passe` dans les URL de redirection Supabase et configurez l'envoi d'e-mails.
4. **Admin réel** : le rôle est lu depuis `app_metadata.role`. Attribuez-le uniquement par un moyen de confiance côté serveur ou tableau de bord ; ne l'enregistrez jamais dans `user_metadata`. Le mode démo est fictif et n'est pas une sécurité.
5. **Admin et données** : la console a une interface vide. Reliez chaque action à une Edge Function/API et vérifiez la RLS. Le contrôle de route côté navigateur ne remplace jamais les règles du serveur.
6. **Thème jour J** : changez `SITE.defaultPreset` dans `src/lib/site.ts`; la palette correspondante est dans `src/styles/presets.css`.
7. **Identité** : remplacez le nom, le slogan et les membres dans `src/lib/site.ts`, le titre/les métadonnées dans `index.html`, puis le texte d'accueil dans `src/pages/home-page.tsx`.

## Modules présents dans les pages modèles

Ils restent facultatifs : gardez la route et le fichier utiles, adaptez-les ou supprimez-les selon `docs/07-modeles-de-pages.md`.

- Galerie avec grille et lightbox.
- Visualisation 3D.
- Lecteur vidéo.
- Interactions, like et animations.
- Sections marketing (hero, tarifs, FAQ, etc.).
- Tableau de bord de démonstration avec graphiques.

## Idées du texte de préparation qui ne sont pas encore implémentées

Ne les déclarez pas comme terminées tant qu'elles ne sont pas réellement reliées et vérifiées :

- Éditeur de pages par blocs, partage public avec QR code, invitations et permissions par ressource.
- Upload avec compression et stockage Supabase, galerie d'albums, carte ou visite virtuelle.
- Révélation programmée, emails différés, tâches cron et compte à rebours métier.
- Commentaires, signalements, file de modération et notifications en temps réel.
- IA/OpenRouter, chatbot, quota d'usage et filtrage de contenu.
- Réservation/calendrier, PDF personnalisé, quiz à étapes, memory game, roue, code Konami.
- Recherche multicritère sur de vraies données, statistiques d'usage et export administrateur.
- Audio d'ambiance, particules configurables, confettis et lightbox vidéo reliée à du contenu réel.

## Retirer ce qui ne sert pas

- Pour enlever les pages modèles, retirez leurs routes optionnelles dans `src/app/router.tsx` et les fichiers concernés dans `src/pages/templates/`.
- Pour enlever « Notes », retirez `features/items`, les routes `/app` correspondantes et les tables/policies `items` du schéma Supabase.
- Pour enlever la démo locale, adaptez `src/features/auth/auth-provider.tsx` ainsi que `src/lib/local-db.ts` ; gardez un compte de démonstration si le jury doit tester l'application.
- Pour enlever une palette, suivez d'abord les références dans `src/lib/presets.ts` et `src/styles/presets.css` ; chaque palette doit garder tous les tokens clair/sombre.
- Avant de retirer un composant, utilisez la recherche de références dans `src/`. Ne supprimez pas une primitive encore importée par une page modèle.
