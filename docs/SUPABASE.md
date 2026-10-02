# Configuration Supabase

## Donner le rôle administrateur à un compte

1. La personne crée d'abord son compte dans l'application, puis se connecte une fois.
2. Dans le tableau de bord Supabase, ouvrez **Authentication → Users** et copiez l'UUID de son compte.
3. Ouvrez **SQL Editor**, vérifiez que vous êtes dans le bon projet, puis exécutez cette requête en remplaçant l'UUID :

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where id = 'REMPLACER_PAR_UUID'::uuid
returning id, email;
```

4. Demandez à cette personne de se déconnecter, puis de se reconnecter. Supabase renouvelle alors sa session et le rôle est lu depuis `app_metadata.role`.
5. Elle peut ensuite ouvrir `/admin/connexion` ou être redirigée vers `/admin` après connexion.

Pour contrôler le rôle dans le SQL Editor :

```sql
select id, email, raw_app_meta_data ->> 'role' as role
from auth.users
where id = 'REMPLACER_PAR_UUID'::uuid;
```

Pour retirer le rôle admin et revenir au rôle membre :

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) - 'role'
where id = 'REMPLACER_PAR_UUID'::uuid;
```

Le SQL Editor est une opération privilégiée : réservez-la au propriétaire ou à une personne de confiance du projet. Pour automatiser l'attribution du rôle, faites-la dans une Edge Function ou un serveur protégé après vérification stricte de l'identité de l'opérateur, avec `supabase.auth.admin.updateUserById()`. Cet appel est réservé au serveur ; ne placez jamais une clé `service_role` ou `sb_secret` dans `VITE_*`, le navigateur ou le dépôt.

Le starter vérifie `app_metadata.role` pour afficher et protéger les pages admin, et la fonction `admin-data` vérifie également le rôle côté serveur. Utilisez `raw_app_meta_data` / `app_metadata` pour l'autorisation : `user_metadata` est modifiable par l'utilisateur et ne doit pas donner de droits. Les politiques RLS doivent elles aussi contrôler l'accès aux tables.

Références : [mise à jour admin d'un utilisateur](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid) · [row level security et métadonnées](https://supabase.com/docs/guides/database/postgres/row-level-security)

## Authentification locale

Sans variables Supabase, l'application utilise une démo locale dans le navigateur. Ce mode ne persiste pas les comptes sur un serveur et ne convient pas à la production.

Dans `.env.local`, définissez uniquement les valeurs publiques :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Activez Email dans **Authentication → Sign In / Providers**. Pour OAuth, configurez le fournisseur et ses identifiants côté Supabase, puis ajoutez l'URL de production et les URL locales aux **Redirect URLs** autorisées. Les clés privées fournies par Google/Facebook restent dans Supabase, jamais dans les variables `VITE_*`.

Le guide [HODI](./DEPLOIEMENT-HODI.md) détaille les URLs, variables de build et e-mails à configurer pour le déploiement.
