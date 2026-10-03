-- ============================================================================
-- NOVA TERRA — 06 : 10 comptes de démonstration (auth.users + profiles)
-- DONNÉES FICTIVES — environnement de développement uniquement.
-- Mot de passe commun : NovaTerra!2026  (ne jamais réutiliser en production)
-- UUID stables : pg_temp.nid(7, n) = 00000007-0000-4000-8000-00000000000n
-- Prérequis : 01 → 05 exécutés. Relançable (on conflict do nothing).
-- ============================================================================

create or replace function pg_temp.nid(t int, n int) returns uuid language sql immutable as $$
  select (lpad(t::text, 8, '0') || '-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid
$$;

-- Évite 10 lignes d'audit parasites pendant l'amorçage
alter table public.profiles disable trigger audit_row_change;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select
  '00000000-0000-0000-0000-000000000000', pg_temp.nid(7, v.n), 'authenticated', 'authenticated',
  v.email, crypt('NovaTerra!2026', gen_salt('bf')), now(),
  case when v.n = 1 then '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb
       else '{"provider":"email","providers":["email"]}'::jsonb end,
  jsonb_build_object('display_name', v.display_name, 'is_fictional', true),
  now(), now(), '', '', '', ''
from (values
  (1,  'admin@novaterra.test',        'Amara Vale'),
  (2,  'police.admin@novaterra.test', 'Kaelen Draxx'),
  (3,  'fire.admin@novaterra.test',   'Soren Ignis'),
  (4,  'medical.admin@novaterra.test','Lyra Medina'),
  (5,  'relations.admin@novaterra.test','Mira Solenne'),
  (6,  'agent@novaterra.test',        'Tavi Rennick'),
  (7,  'elio@novaterra.test',         'Elio Marchetti'),
  (8,  'jade@novaterra.test',         'Jade Okafor'),
  (9,  'rowan@novaterra.test',        'Rowan Kestrel'),
  (10, 'pip@novaterra.test',          'Pip Marchetti')
) as v(n, email, display_name)
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select pg_temp.nid(7, n), pg_temp.nid(7, n), pg_temp.nid(7, n)::text, 'email',
       jsonb_build_object('sub', pg_temp.nid(7, n)::text, 'email', email, 'email_verified', true),
       now(), now(), now()
from (select n, email from (values
  (1,'admin@novaterra.test'),(2,'police.admin@novaterra.test'),(3,'fire.admin@novaterra.test'),
  (4,'medical.admin@novaterra.test'),(5,'relations.admin@novaterra.test'),(6,'agent@novaterra.test'),
  (7,'elio@novaterra.test'),(8,'jade@novaterra.test'),(9,'rowan@novaterra.test'),(10,'pip@novaterra.test')
) as x(n, email)) as i
on conflict do nothing;

-- Le trigger handle_new_user a créé les profils : on les complète.
-- primary_service_id est renseigné dans 07 (les services n'existent pas encore).
update public.profiles p
set first_name = v.first_name, last_name = v.last_name, display_name = v.display_name,
    phone = v.phone, role = v.role::public.user_role, account_status = v.status::public.account_status,
    locale = v.locale
from (values
  (1,  'Amara',  'Vale',     'Amara Vale',     '+999 100 0001', 'general_admin', 'active', 'fr'),
  (2,  'Kaelen', 'Draxx',    'Kaelen Draxx',   '+999 100 0002', 'service_admin', 'active', 'fr'),
  (3,  'Soren',  'Ignis',    'Soren Ignis',    '+999 100 0003', 'service_admin', 'active', 'en'),
  (4,  'Lyra',   'Medina',   'Lyra Medina',    '+999 100 0004', 'service_admin', 'active', 'fr'),
  (5,  'Mira',   'Solenne',  'Mira Solenne',   '+999 100 0005', 'service_admin', 'active', 'fr'),
  (6,  'Tavi',   'Rennick',  'Tavi Rennick',   '+999 100 0006', 'agent',         'active', 'en'),
  (7,  'Elio',   'Marchetti','Elio Marchetti', '+999 100 0007', 'citizen',       'active', 'fr'),
  (8,  'Jade',   'Okafor',   'Jade Okafor',    '+999 100 0008', 'citizen',       'active', 'fr'),
  (9,  'Rowan',  'Kestrel',  'Rowan Kestrel',  '+999 100 0009', 'citizen',       'suspended', 'en'),
  (10, 'Pip',    'Marchetti','Pip Marchetti',  null,            'citizen',       'active', 'fr')
) as v(n, first_name, last_name, display_name, phone, role, status, locale)
where p.id = pg_temp.nid(7, v.n);

alter table public.profiles enable trigger audit_row_change;
