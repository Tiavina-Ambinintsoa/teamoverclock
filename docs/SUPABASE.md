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
9. `supabase/migrations/20261003214500_service_status_reports_and_appointments.sql` — horaires/statuts planifiés, agenda des rendez-vous, consignes de suivi et RPC sécurisée de notification des reports
10. `supabase/migrations/20261004001000_multi_locale_support.sql` — préférences de langue du profil, guides et commandes vocales
11. `supabase/migrations/20261004002000_civic_voting.sql` — projets municipaux, votes/commentaires vérifiés, agrégats de statistiques et votes de soutien aux signalements publics
12. `supabase/migrations/20261004003000_service_report_alerts.sql` — rappels de rendez-vous, notifications de suivi des signalements et refus des demandes aux services indisponibles
13. `supabase/nova-terra/12_service_report_alerts.sql` — mêmes fonctions et politiques pour les imports Nova Terra à partir de zéro
14. `supabase/migrations/20261004004000_personal_data_export.sql` — RPC limitée aux commentaires de projet créés par le compte connecté
15. `supabase/nova-terra/13_personal_data_export.sql` — même RPC pour les imports Nova Terra à partir de zéro
16. `supabase/migrations/20261004005000_device_login_alerts.sql` — stockage privé des empreintes hachées d'appareils déjà notifiés
17. `supabase/nova-terra/14_device_login_alerts.sql` — même table pour les imports Nova Terra
18. `supabase/migrations/20261004006000_content_translations.sql` — traductions enregistrées avec le contenu des actualités
19. `supabase/nova-terra/15_content_translations.sql` — même colonne pour les imports Nova Terra
20. `supabase/nova-terra/99_verify.sql` — les tables de seed doivent afficher `ok = true`, et la dernière requête ne doit retourner aucune table sans RLS. Les nouvelles tables de vote sont alimentées par les utilisateurs et restent vides au premier import.

Les codes de langue acceptés par `profiles.locale` sont `fr`, `en`, `mg`, `mfe` (kreol morisien), `rcf` (kréol rényoné) et `x-nova` (langue fictive Zorblax). Les catalogues de l'interface et les traductions des contenus sont déployés par étapes ; de nombreux textes restent bilingues français/anglais et les clés sans traduction dédiée s'affichent en anglais.

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

Après l'import de `20261004003000_service_report_alerts.sql` ou `12_service_report_alerts.sql`, configurez Supabase **Cron** pour exécuter `select public.send_appointment_reminders();` toutes les 15 minutes. Les rappels idempotents partent environ 24 heures et 1 heure avant les rendez-vous demandés ou confirmés, avec l'heure UTC, le motif, le lieu, le téléphone, les documents requis et les conseils de préparation.

Après l'import de `20261004004000_personal_data_export.sql` ou `13_personal_data_export.sql`, les comptes connectés peuvent télécharger ou imprimer les données de leur choix depuis **Mon espace → Paramètres → Mes données personnelles**. Les commentaires de projets sont fournis par une RPC qui ne retourne que ceux écrits par le compte connecté, sans exposer les identifiants des autres auteurs.

Pour activer l'alerte e-mail de nouvel appareil, déployez `device-login-alert` (JWT obligatoire) et configurez les secrets `RESEND_API_KEY` et `DEVICE_LOGIN_FROM_EMAIL`. Les secrets Resend restent côté Supabase Edge Functions. L'application n'envoie l'alerte qu'à la première connexion depuis un navigateur/appareil donné; la base ne conserve qu'une empreinte SHA-256 du jeton local, sans adresse IP ni localisation. La fonction limite l'envoi à cinq nouveaux appareils par compte et par période de 24 heures.

Pour activer la traduction IA d'actualités, déployez `translate-content` avec JWT obligatoire et activez `VITE_ENABLE_AI_CHAT=true` au build. Dans [Google AI Studio](https://aistudio.google.com/app/apikey), créez une clé API puis ajoutez-la dans **Supabase → Project Settings → Edge Functions → Secrets** sous le nom `GOOGLE_AI_STUDIO_API_KEY`. Vous pouvez aussi configurer `GOOGLE_AI_STUDIO_MODEL`; sans ce secret, la fonction utilise `gemini-3.8-flash`. Gardez la clé uniquement dans les secrets Supabase, jamais dans le navigateur ou le dépôt. Les traductions à la demande apparaissent dans le formulaire de rédaction et doivent être relues avant publication. Informez les rédacteurs que le texte soumis est envoyé à Google Gemini.

Pour activer le rattrapage automatique horaire des traductions publiques, appliquez `20261004006000_content_translations.sql`, `20261004007000_scheduled_public_translations.sql` puis `20261004008000_translation_attempt_tracking.sql`, et déployez `translate-content` avec JWT obligatoire. Le job traduit au plus quatre enregistrements par exécution dans `news`, `services`, `city_projects`, `dangers` et `buildings`; il détecte les textes modifiés et met à jour leurs traductions au prochain passage. Les erreurs sont réessayées au passage horaire suivant. Il exclut les rapports citoyens, rendez-vous, demandes et commentaires privés. Le rattrapage continue à chaque heure tant qu'il reste des textes à traduire.

Le cron attend le JWT `service_role` historique dans le secret Vault `nova_terra_service_role_key` pour autoriser l'appel de l'Edge Function. Dans **Supabase → Project Settings → API Keys → Legacy API Keys**, récupérez la clé `service_role` (JWT) et ajoutez-la vous-même dans **SQL Editor**; ne la mettez pas dans le dépôt ni dans le navigateur :

```sql
select vault.create_secret('COLLER_LA_CLE_SERVICE_ROLE_ICI', 'nova_terra_service_role_key');
```

Ne partagez jamais cette clé dans un chat. Le cron reste inactif tant que ce secret Vault n'existe pas. Il utilise en plus `GOOGLE_AI_STUDIO_API_KEY` pour les appels Gemini; cette clé se configure côté Edge Functions comme indiqué ci-dessus.

Pour repartir de zéro (données fictives uniquement) : `set app.allow_nova_reset = 'yes';` puis `00_reset_dev.sql`, puis relancer 06 et 07a-c.
Le plan complet et les décisions sont dans [PLAN.md](./PLAN.md).

## Établissements associés aux services

Les établissements sont des lignes de `public.buildings` avec `service_id`, `facility_type` et `offerings` renseignés ; le bâtiment principal du service continue d'utiliser `services.building_id`. Les administrateurs généraux peuvent gérer tous les bâtiments. Les administrateurs de service ne peuvent créer, modifier ou supprimer que les établissements des services qu'ils administrent, conformément à `can_manage_service()` et aux politiques RLS. Les bâtiments restent visibles par la carte partagée ; `/map?service=<service-id>` limite les marqueurs à ceux du service. Sur une fiche de service et sa carte filtrée, la recherche porte sur les noms, descriptions, adresses et prestations ; le type d'établissement peut aussi être filtré.

Pour mettre à jour un projet Nova Terra déjà initialisé, réexécutez `02_tables.sql`, `04_rls_grants.sql`, puis `07a_seed_city_identity.sql`, dans cet ordre. Le seed fournit dix établissements fictifs pour chacun des dix services ; il est relançable sans dupliquer ces exemples.

Appliquez également la migration `20261003214500_service_status_reports_and_appointments.sql` aux projets existants. Les administrateurs de service peuvent publier une fermeture immédiate ou programmée et une date de réouverture. Le calendrier permet les demandes de rendez-vous et l'agenda privé du service ; une contrainte SQL empêche deux réservations sur le même créneau exact. Le report d'un signalement passe par `postpone_report_with_notice`, qui exige une raison et envoie une notification au citoyen dans la même transaction.

Appliquez `20261004002000_civic_voting.sql` aux projets existants avant d'utiliser les pages de projets et les votes de signalement. Seuls les citoyens vérifiés peuvent voter ou commenter ; les statistiques agrégées sont réservées à l'administration générale et aux administrateurs du service responsable, sans révéler l'identité des personnes ayant voté. Les votes de soutien aux signalements ne modifient pas le score de réputation.

Appliquez `20261004003000_service_report_alerts.sql` aux projets existants pour notifier le citoyen des changements de statut, d'affectation et de consignes d'un signalement, refuser les demandes aux services indisponibles et installer les rappels de rendez-vous. Les administrateurs peuvent fermer ou suspendre leur service depuis **Gestion des services** ; la fiche publique affiche alors le motif et la réouverture prévue, et les demandes/rendez-vous en ligne sont bloqués jusqu'à la réouverture.
