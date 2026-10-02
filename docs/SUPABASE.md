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

Ce script crée les tables `profiles` et `items`, active RLS et ajoute les politiques nécessaires à l'exemple.

## 5. Donner l'accès admin à un compte

L'application affiche l'entrée **Espace admin** uniquement si le compte connecté a `app_metadata.role` égal à `admin`. Ce champ doit être modifié par une action de confiance côté serveur avec l'API Admin de Supabase, jamais par le formulaire du navigateur ni dans `user_metadata`. Exemple de logique serveur :

```ts
await supabaseAdmin.auth.admin.updateUserById(userId, {
  app_metadata: { role: "admin" },
})
```

Le client `supabaseAdmin` doit être créé côté serveur avec une clé `sb_secret_...` (ou ancienne `service_role`), stockée dans un secret serveur sans préfixe `VITE_`. Après l'attribution du rôle, déconnectez puis reconnectez ce compte pour renouveler sa session. La vérification dans l'interface protège la navigation; protégez aussi les données et opérations admin par RLS ou une fonction serveur.

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
