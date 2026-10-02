# Déploiement HODI et configuration de production

Le site est une application Vite/React compilée en fichiers statiques. HODI sert le dossier `dist/`; les fonctions serveur, l'authentification, la base et le stockage résident dans Supabase.

## Avant le build HODI

Configurez ces variables dans l'environnement de build HODI, ou dans le `.env` utilisé pour produire `dist/` :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_MAPTILER_API_KEY=...        # optionnel ; active la carte détaillée /modeles/carte
VITE_BASE=/                         # ou /sous-dossier/ si le site n'est pas à la racine
VITE_USE_HASH_ROUTER=false          # passez à true si HODI ne permet pas de réécrire les URL
VITE_ENABLE_AI_CHAT=false           # true seulement après le déploiement de la fonction IA
VITE_ENABLE_AI_HISTORY=false        # optionnel ; voir docs/OPENROUTER.md
```

Puis générez les fichiers :

```sh
npm ci
npm run build
```

Publiez le contenu de `dist/` dans le dossier web servi par HODI. Ne publiez jamais `.env.local`, `node_modules/`, une clé `sb_secret_...`, `service_role` ou une clé OpenRouter. Les variables `VITE_*` sont publiques et intégrées au JavaScript généré.

Si vous utilisez des URL sans `/#/`, le serveur doit réécrire les chemins inconnus vers `index.html`. Si HODI ne propose pas cette règle, définissez `VITE_USE_HASH_ROUTER=true` avant le build. Avec un sous-dossier, la valeur `VITE_BASE` doit commencer et finir par `/`, et le même préfixe doit être autorisé dans les redirections Supabase.

## Authentification, Google/Facebook et courriels

Dans **Supabase → Authentication → URL Configuration** :

1. Remplacez **Site URL** par l'URL finale HODI.
2. Ajoutez à **Redirect URLs** l'origine et les routes de callback utilisées, par exemple `https://votre-domaine.example/**` (et l'éventuel sous-dossier).
3. Pour Google et Facebook, configurez les identifiants et secrets OAuth dans Supabase Auth. Dans chaque console OAuth, le callback du fournisseur reste l'URL Supabase `https://<project-ref>.supabase.co/auth/v1/callback`.
4. Configurez un SMTP personnalisé pour les confirmations de compte, les changements d'adresse et les réinitialisations de mot de passe. Vérifiez réellement la livraison vers une adresse externe.

Après toute modification d'une variable `VITE_*`, reconstruisez et republiez `dist/`. Les variables de build HODI ne sont pas lues dynamiquement par le site déjà compilé.

Pour la carte, créez une clé API MapTiler, autorisez l'origine exacte du domaine HODI dans les paramètres **Allowed HTTP origins** de cette clé, puis renseignez `VITE_MAPTILER_API_KEY` dans l'environnement de build HODI avant de reconstruire. Cette clé est visible dans le navigateur : sa restriction par origine est donc nécessaire. Sans cette variable, la page affiche un aperçu schématique local.

## Fonctions serveur et secrets

Les Edge Functions n'utilisent pas les variables publiques `VITE_*`. Déployez-les depuis le dossier du dépôt lié au projet :

```sh
supabase login
supabase link --project-ref VOTRE_PROJECT_REF
supabase functions deploy openrouter-chat
supabase functions deploy admin-data
supabase functions deploy account-delete
supabase functions deploy contact-submit
```

Ajoutez les secrets requis avec `supabase secrets set` ou **Supabase → Edge Functions → Secrets** :

| Secret | Fonction | Utilité |
|---|---|---|
| `OPENROUTER_API_KEY` | `openrouter-chat` | Clé privée OpenRouter |
| `OPENROUTER_MODEL` | `openrouter-chat` | Modèle autorisé côté serveur |
| `OPENROUTER_SAVE_HISTORY` | `openrouter-chat` | `true` ou `false`, désactivé par défaut |
| `APP_ORIGINS` | Toutes | Origines autorisées, séparées par des virgules |
| `APP_ORIGIN`, `APP_NAME` | `openrouter-chat` | Métadonnées envoyées à OpenRouter |
| `RESEND_API_KEY` | `contact-submit` | Envoi de la notification e-mail (optionnel) |
| `CONTACT_TO_EMAIL`, `MAIL_FROM` | `contact-submit` | Destinataire et expéditeur vérifié (optionnels) |
| `CONTACT_RATE_LIMIT_SALT` | `contact-submit` | Sel privé pour hacher l'adresse réseau (optionnel) |

Les variables système Supabase utilisées par les Edge Functions sont `SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY`. La clé de service reste exclusivement côté fonction. `contact-submit` est la seule fonction publique (`verify_jwt = false`) ; elle valide le contenu, le honeypot et un quota par adresse réseau, puis stocke le message. Toutes les autres fonctions vérifient la session et les droits côté serveur.

Sans Resend, les messages de contact restent stockés dans `contact_messages` et la boîte admin `/admin/moderation` ; aucun e-mail n'est prétendu envoyé. Pour activer la notification, vérifiez le domaine de `MAIL_FROM` chez Resend.

## Première mise en place Supabase

- Exécutez `supabase/schema.sql` dans le SQL Editor avant d'activer ces modules.
- Vérifiez les policies RLS des tables et le bucket privé `uploads`.
- Définissez le rôle admin dans `app_metadata` par le tableau de bord ou une fonction de confiance. Une connexion `/admin/connexion` ne confère pas ce rôle.
- Testez les parcours Auth, OAuth, mot de passe oublié, contact, upload, chatbot et administration sur l'URL HODI.

Voir aussi [docs/SUPABASE.md](SUPABASE.md) et [docs/OPENROUTER.md](OPENROUTER.md).
