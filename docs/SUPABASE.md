# Connecter ce starter à Supabase

L'application utilise Supabase Auth pour les comptes et `supabase-js` pour les exemples de données. Sans variables d'environnement, elle reste en mode démo local. Les valeurs `VITE_*` sont intégrées au navigateur : la clé publishable/anon est prévue pour le client avec RLS activée, les clés secrètes ne le sont jamais.

## 1. Créer le projet et renseigner les clés

1. Créez un projet Supabase.
2. Dans **Connect** ou **Project Settings > API Keys**, copiez l'URL du projet et sa clé **publishable** (`sb_publishable_...`).
3. À la racine du starter, copiez le modèle puis ouvrez `.env.local` :

```powershell
Copy-Item .env.example .env.local
```

Renseignez les deux valeurs :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_votre_cle
```

Enregistrez, arrêtez Vite (`Ctrl+C`) puis relancez `npm run dev`. Ouvrez `/kit` et regardez la ligne **Backend** : elle doit indiquer que Supabase est configuré. Si vous avez déjà des clés historiques, leur clé `anon` publique peut servir en valeur de `VITE_SUPABASE_PUBLISHABLE_KEY`; préférez la clé publishable sur un nouveau projet.

Ne mettez jamais `sb_secret_...` ou `service_role` dans `.env.local` sous un nom `VITE_*`, dans le navigateur ou dans Git. Gardez `.env.local` privé.

## 2. Activer les comptes et les redirections

Dans **Authentication > URL Configuration** :

- Mettez l'URL locale en **Site URL** : `http://localhost:5173`.
- Ajoutez à **Redirect URLs** `http://localhost:5173/**` et l'URL de production, par exemple `https://mon-site.example/**`.
- En production, remplacez aussi la **Site URL** par le domaine public.

Ce projet redirige OAuth vers `/connexion`, la réinitialisation vers `/nouveau-mot-de-passe` et la confirmation d'inscription vers l'accueil du site. Supabase doit autoriser ces destinations sur vos domaines locaux et de production. Si vous déployez dans un sous-dossier, configurez aussi `VITE_BASE` (par exemple `/webcup/`) et ajoutez l'URL avec ce préfixe dans Supabase. L'e-mail/mot de passe est activé dans Supabase Auth; choisissez si la confirmation d'e-mail est requise. Pour un vrai site, configurez un SMTP adapté à votre volume et adaptez le modèle d'e-mail.

## 3. Configurer Google et Facebook (facultatif)

Pour chaque fournisseur, créez une application OAuth dans la console du fournisseur. Dans Supabase, ouvrez **Authentication > Sign In / Providers**, activez Google ou Facebook et collez l'identifiant client et le secret fournis par le fournisseur. Dans la console Google/Facebook, ajoutez comme callback l'URL exacte affichée par Supabase, généralement `https://<project-ref>.supabase.co/auth/v1/callback`.

Il y a deux adresses différentes à autoriser : le callback du fournisseur vers Supabase, puis les URL de redirection Supabase vers le site (`/connexion`, etc.). Vérifiez les deux listes si OAuth revient avec une erreur de redirection.

## 4. Créer les tables de l'exemple

La connexion et la création de compte fonctionnent sans créer de table applicative. Pour activer l'exemple « Notes » :

1. Ouvrez **SQL Editor** dans le tableau de bord Supabase.
2. Collez le contenu de `supabase/schema.sql` et exécutez-le.
3. Relisez les politiques RLS avant de réutiliser ce schéma avec des données réelles : la table `profiles` expose les noms affichés, et les notes publiques sont lisibles sans compte.

Ce script crée `profiles`, `items`, `ai_conversations`, `ai_messages`, `ai_usage`, `contact_messages`, `contact_rate_limits` et `notifications`. Il configure leurs GRANT/policies RLS, un quota IA, une limite publique anti-spam, des notifications aux administrateurs et le bucket privé `uploads`. Relancez le script si le projet avait déjà le premier schéma : les créations et politiques sont idempotentes.

## 5. Donner l'accès admin à un compte

L'application affiche l'entrée **Espace admin** uniquement si le compte connecté a `app_metadata.role` égal à `admin`. `/admin/users`, la boîte `/admin/moderation` et leurs changements appellent `admin-data`, qui revérifie ce claim avec Auth avant d'utiliser la clé Admin côté serveur. La base a également une fonction `public.is_admin()` et des policies admin. Le champ doit être modifié par une action de confiance côté serveur avec l'API Admin, jamais par le formulaire du navigateur ni dans `user_metadata`.

Pour attribuer le premier rôle, utilisez le Dashboard Supabase (Authentication → Users → compte → app_metadata) ou un script serveur local privé. N'accordez jamais la clé de service au navigateur. Après changement de rôle, déconnectez/reconnectez le compte pour renouveler le JWT.

La fonction d'administration utilise en interne une logique de ce type :

```ts
await supabaseAdmin.auth.admin.updateUserById(userId, {
  app_metadata: { role: "admin" },
})
```

Le code de gestion des rôles est `supabase/functions/admin-data/index.ts`. Son client service est construit dans une Edge Function; la clé `sb_secret_...` ou `service_role` n'est jamais embarquée dans le build web.

## 6. Profil, e-mail, mot de passe et suppression

Dans `/app/parametres`, les changements de nom sont enregistrés dans Supabase Auth et `profiles`. La modification d'e-mail passe par `auth.updateUser({ email })` et dépend des confirmations de l'instance Auth. Le nouveau mot de passe passe par `auth.updateUser({ password })`. `account-delete` vérifie la session et exige une connexion dans les 15 dernières minutes avant de supprimer le compte via l'API Admin ; les lignes liées ont des clés étrangères `on delete cascade`.

Configurez SMTP dans **Authentication → SMTP Settings** et les modèles de courriel. Le SMTP par défaut est destiné aux essais, pas à une démo où plusieurs personnes doivent recevoir leurs liens.

## 7. Fichiers privés

Le schéma crée un bucket privé `uploads` (5 Mo, JPEG/PNG/WebP/PDF). Les policies vérifient que le premier dossier est l'UUID du compte authentifié. `StorageUploader` crée des chemins aléatoires sous ce dossier et présente un lien signé valable une heure. Pour ajouter un type de fichier ou modifier la limite, changez le bucket **et** les validations de `src/components/storage-uploader.tsx`.

## 8. Contact, boîte admin et notifications

`contact-submit` est publique parce que le formulaire ne demande pas de compte. Elle applique un honeypot, validation des longueurs et limitation à cinq demandes par heure et adresse réseau hachée, puis écrit dans `contact_messages`. L'accès direct à la table est refusé aux rôles `anon` et `authenticated`; la boîte `/admin/moderation` passe par `admin-data`. Le trigger crée une notification privée pour chaque compte ayant le rôle admin.

Pour envoyer aussi un e-mail, vérifiez un domaine chez Resend et configurez `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `MAIL_FROM` dans les secrets Edge. Sans ces variables, le message reste sauvegardé dans l'inbox et le front indique que l'e-mail n'est pas configuré.

## 9. Déployer les Edge Functions

Après `supabase login` et `supabase link --project-ref ...`, déployez `openrouter-chat`, `admin-data`, `account-delete` et `contact-submit`. La seule fonction sans JWT de passerelle est `contact-submit` (indiqué dans `supabase/config.toml`) ; les autres revérifient aussi la session ou le rôle dans le code. Consultez [docs/OPENROUTER.md](OPENROUTER.md) et [docs/DEPLOIEMENT-HODI.md](DEPLOIEMENT-HODI.md) pour les secrets et les variables HODI.

## Dépannage rapide

- **Le mode démo s'affiche encore** : vérifiez que `.env.local` est à la racine, que les deux valeurs ne sont pas vides et que Vite a été redémarré.
- **Adresse ou clé invalide** : recopie l'URL et la clé publishable depuis le bon projet Supabase; ne confonds pas la clé publique et la clé secrète.
- **E-mail de confirmation absent** : vérifiez la confirmation e-mail, la Site URL, les Redirect URLs et la configuration d'envoi SMTP.
- **Google/Facebook refuse la connexion** : comparez exactement le callback dans la console du fournisseur avec celui affiché dans Supabase, puis vérifiez les URL de retour du site.
- **Erreur RLS ou liste vide** : exécutez le schéma de départ et vérifiez ensemble les droits SQL `GRANT`, RLS et les policies de la table concernée.

## Documentation officielle

- [Clés API Supabase](https://supabase.com/docs/guides/getting-started/api-keys)
- [URL de redirection Auth](https://supabase.com/docs/guides/auth/redirect-urls)
- [Connexion Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Connexion Facebook](https://supabase.com/docs/guides/auth/social-login/auth-facebook)
- [Authentification e-mail et mot de passe](https://supabase.com/docs/guides/auth/passwords)
- [Utilisateurs et métadonnées](https://supabase.com/docs/guides/auth/users)
- [Edge Functions et secrets](https://supabase.com/docs/guides/functions/secrets)
- [Politiques de sécurité du stockage](https://supabase.com/docs/guides/storage/security/access-control)
