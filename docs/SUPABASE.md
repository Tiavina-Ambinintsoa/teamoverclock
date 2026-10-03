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

## Importer Nova Terra (structure + données fictives)

Pré-requis : `supabase/schema.sql` (starter) déjà exécuté. Dans **SQL Editor → New query**, collez et exécutez **dans cet ordre**, un fichier à la fois (chacun est relançable) :

1. `supabase/nova-terra/01_enums_extensions.sql`
2. `supabase/nova-terra/02_tables.sql`
3. `supabase/nova-terra/03_functions_triggers.sql`
4. `supabase/nova-terra/04_rls_grants.sql`
5. `supabase/nova-terra/05_storage.sql`
6. `supabase/nova-terra/06_seed_auth.sql` — crée 10 comptes de démo (mot de passe commun `NovaTerra!2026`, développement uniquement ; `admin@novaterra.test` est administrateur général)
7. `supabase/nova-terra/07a_seed_city_identity.sql`, puis `07b_…`, puis `07c_…`
8. `supabase/nova-terra/08_citizen_rpcs.sql`, `09_workflow_support.sql`, `10_knowledge_base.sql`, puis `11_heat_alerts.sql` — fonctions de l'application, secteur de résidence, diffusion canicule par secteur ou tous secteurs et profil de santé privé avec RLS propriétaire uniquement
9. `supabase/nova-terra/99_verify.sql` — toutes les lignes doivent afficher `ok = true`, et la dernière requête ne doit retourner aucune table sans RLS.

Après l'import de 10, ouvrez **/admin/ai-content → Reconstruire la base du chatbot** (connecté en `admin@novaterra.test`) pour remplir la base de connaissances.
Si `11_heat_alerts.sql` a déjà été importé, réexécutez-le pour installer les fonctions mises à jour de secteur résidentiel et de diffusion à tous les secteurs.

### Diffusion des alertes canicule

Pour activer la notification immédiate et le webhook :

1. Déployez `dispatch-heat-alert` avec la vérification JWT désactivée (l'Edge Function valide elle-même soit le compte administrateur, soit le secret du webhook) :

   ```powershell
   supabase functions deploy dispatch-heat-alert --project-ref VOTRE_PROJECT_REF
   supabase secrets set HEAT_ALERT_WEBHOOK_SECRET=VOTRE_SECRET_LONG_ALEATOIRE --project-ref VOTRE_PROJECT_REF
   ```

   Gardez le secret hors du dépôt et du navigateur.
2. Dans **Supabase → Database → Webhooks**, créez un webhook `heatwave-danger-created` : table `public.dangers`, événement `INSERT`, méthode `POST`, cible Edge Function `dispatch-heat-alert`, en-tête HTTP `x-heat-alert-secret` égal à `HEAT_ALERT_WEBHOOK_SECRET`.
3. L'Edge Function ignore les autres dangers, n'envoie que les alertes `heatwave-*` actives et distribue une seule notification par citoyen actif dans les secteurs affectés. L'interface appelle aussi la fonction juste après la publication pour livrer sans attendre le webhook ; les deux voies sont idempotentes.
4. Les données santé facultatives restent dans `citizen_health_profiles` avec une politique RLS propriétaire uniquement. Elles ne sont jamais incluses dans le webhook ni dans les notifications. Retirer le consentement efface le groupe sanguin et les conditions enregistrés.

À planifier (Supabase → Database → Cron, ou Edge Function planifiée) : `select public.remind_stalled_requests();` toutes les heures et `select public.send_newsletter_digest('daily');` chaque jour.

Pour repartir de zéro (données fictives uniquement) : `set app.allow_nova_reset = 'yes';` puis `00_reset_dev.sql`, puis relancer 06 et 07a-c.
Le plan complet et les décisions sont dans [PLAN.md](./PLAN.md).

## Établissements associés aux services

Les établissements sont des lignes de `public.buildings` avec `service_id`, `facility_type` et `offerings` renseignés ; le bâtiment principal du service continue d'utiliser `services.building_id`. Les administrateurs généraux peuvent gérer tous les bâtiments. Les administrateurs de service ne peuvent créer, modifier ou supprimer que les établissements des services qu'ils administrent, conformément à `can_manage_service()` et aux politiques RLS. Les bâtiments restent visibles par la carte partagée ; `/map?service=<service-id>` limite les marqueurs à ceux du service. Sur une fiche de service et sa carte filtrée, la recherche porte sur les noms, descriptions, adresses et prestations ; le type d'établissement peut aussi être filtré.

Pour mettre à jour un projet Nova Terra déjà initialisé, réexécutez `02_tables.sql`, `04_rls_grants.sql`, puis `07a_seed_city_identity.sql`, dans cet ordre. Le seed fournit dix établissements fictifs pour chacun des dix services ; il est relançable sans dupliquer ces exemples.
