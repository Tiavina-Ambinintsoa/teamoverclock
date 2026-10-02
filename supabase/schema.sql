-- ============================================================================
-- SCHÉMA DE DÉPART — 24h by Webcup 2026
-- À exécuter dans Supabase > SQL Editor > New query. Relançable sans risque.
--
-- RÈGLE À RETENIR (changement Supabase 2026) :
--   Depuis le 30 mai 2026, une table créée dans le schéma "public" n'est PLUS exposée
--   automatiquement à l'API (supabase-js). Chaque table exige TROIS choses :
--     1. GRANT  -> le rôle a-t-il le droit d'accéder à la table ?   (sans lui : erreur 42501,
--                  ou liste vide côté client si vous ne lisez pas `error`)
--     2. RLS    -> ENABLE ROW LEVEL SECURITY                        (sans elle : tout le monde
--                  peut tout lire/écrire avec la clé publique)
--     3. POLICY -> quelles lignes chaque rôle peut voir/modifier.
--   Les assistants IA oublient très souvent le point 1 : vérifiez-le à chaque nouvelle table.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1) PROFILS : un profil public par utilisateur (nom affiché, avatar)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Rôle admin signé dans app_metadata (jamais modifiable depuis le client).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

grant select                 on public.profiles to anon, authenticated;
grant insert, update         on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select to anon, authenticated
  using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "profiles_admin_read" on public.profiles;
create policy "profiles_admin_read" on public.profiles
  for select to authenticated using ((select public.is_admin()));

-- Crée automatiquement le profil à l'inscription.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Rattrapage : profils des comptes créés AVANT ce script (ex : compte démo).
insert into public.profiles (id, display_name)
select id, coalesce(nullif(raw_user_meta_data ->> 'display_name', ''), split_part(email, '@', 1))
from auth.users
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------
-- 2) ITEMS : exemple de tranche verticale (les "Notes" de l'interface)
--    À renommer / remplacer par l'objet principal de votre sujet.
-- ---------------------------------------------------------------------------
create table if not exists public.items (
  id         uuid primary key default gen_random_uuid(),
  -- rempli par la base avec l'utilisateur connecté : impossible d'usurper un autre auteur
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title      text not null check (char_length(title) between 3 and 80),
  content    text check (content is null or char_length(content) <= 500),
  is_public  boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists items_user_id_idx    on public.items (user_id);
create index if not exists items_created_at_idx on public.items (created_at desc);

alter table public.items enable row level security;

grant select                         on public.items to anon, authenticated;
grant insert, update, delete         on public.items to authenticated;
grant select, insert, update, delete on public.items to service_role;

-- Lecture : les notes publiques (même sans compte) + les siennes.
drop policy if exists "items_select_visible" on public.items;
create policy "items_select_visible" on public.items
  for select to anon, authenticated
  using (is_public or (select auth.uid()) = user_id);

drop policy if exists "items_insert_own" on public.items;
create policy "items_insert_own" on public.items
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "items_update_own" on public.items;
create policy "items_update_own" on public.items
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "items_delete_own" on public.items;
create policy "items_delete_own" on public.items
  for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "items_admin_select" on public.items;
create policy "items_admin_select" on public.items
  for select to authenticated using ((select public.is_admin()));

drop policy if exists "items_admin_update" on public.items;
create policy "items_admin_update" on public.items
  for update to authenticated using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "items_admin_delete" on public.items;
create policy "items_admin_delete" on public.items
  for delete to authenticated using ((select public.is_admin()));


-- ---------------------------------------------------------------------------
-- 3) CHAT IA : historique privé et quota journalier consommé côté serveur
-- ---------------------------------------------------------------------------
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default 'Nouvelle conversation' check (char_length(title) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 8000),
  created_at timestamptz not null default now()
);

create index if not exists ai_conversations_user_updated_idx on public.ai_conversations(user_id, updated_at desc);
create index if not exists ai_messages_conversation_created_idx on public.ai_messages(conversation_id, created_at);
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
grant select, insert, update, delete on public.ai_conversations to authenticated;
grant select on public.ai_messages to authenticated;
grant select, insert, update, delete on public.ai_conversations, public.ai_messages to service_role;

drop policy if exists "ai_conversations_select_own" on public.ai_conversations;
create policy "ai_conversations_select_own" on public.ai_conversations
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "ai_conversations_insert_own" on public.ai_conversations;
create policy "ai_conversations_insert_own" on public.ai_conversations
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "ai_conversations_update_own" on public.ai_conversations;
create policy "ai_conversations_update_own" on public.ai_conversations
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "ai_conversations_delete_own" on public.ai_conversations;
create policy "ai_conversations_delete_own" on public.ai_conversations
  for delete to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "ai_messages_select_own_conversation" on public.ai_messages;
create policy "ai_messages_select_own_conversation" on public.ai_messages
  for select to authenticated using (
    exists (select 1 from public.ai_conversations c
      where c.id = conversation_id and c.user_id = (select auth.uid()))
  );

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, usage_date)
);
alter table public.ai_usage enable row level security;
grant all on public.ai_usage to service_role;
revoke all on public.ai_usage from anon, authenticated;

create or replace function public.consume_ai_request()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then return false; end if;
  insert into public.ai_usage(user_id, usage_date, request_count)
  values (current_user_id, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, usage_date) do update
    set request_count = public.ai_usage.request_count + 1
    where public.ai_usage.request_count < 20;
  return found;
end;
$$;
revoke all on function public.consume_ai_request() from public, anon;
grant execute on function public.consume_ai_request() to authenticated;


-- ---------------------------------------------------------------------------
-- 4) CONTACT : messages privés consultables uniquement depuis une Edge Function
-- ---------------------------------------------------------------------------
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  email text not null check (char_length(email) <= 254),
  message text not null check (char_length(message) between 10 and 5000),
  status text not null default 'new' check (status in ('new', 'read', 'closed')),
  created_at timestamptz not null default now()
);
alter table public.contact_messages enable row level security;
revoke all on public.contact_messages from anon, authenticated;
grant select, insert, update, delete on public.contact_messages to service_role;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) <= 500),
  href text not null default '/app/parametres',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
alter table public.notifications enable row level security;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant select, insert, update, delete on public.notifications to service_role;
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.notify_admin_of_contact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications(user_id, title, body, href)
  select u.id,
    'Nouveau message de contact',
    left(new.name || ' — ' || new.message, 500),
    '/admin/moderation'
  from auth.users u
  where u.raw_app_meta_data ->> 'role' = 'admin';
  return new;
end;
$$;
revoke all on function public.notify_admin_of_contact() from public, anon, authenticated;
drop trigger if exists on_contact_message_notify_admins on public.contact_messages;
create trigger on_contact_message_notify_admins
  after insert on public.contact_messages
  for each row execute function public.notify_admin_of_contact();

create table if not exists public.contact_rate_limits (
  ip_hash text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  primary key (ip_hash, window_start)
);
alter table public.contact_rate_limits enable row level security;
revoke all on public.contact_rate_limits from anon, authenticated;
grant all on public.contact_rate_limits to service_role;

create or replace function public.consume_contact_request(p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  bucket_start timestamptz := date_trunc('hour', now());
begin
  if p_ip_hash is null or char_length(p_ip_hash) < 32 then return false; end if;
  delete from public.contact_rate_limits where window_start < now() - interval '2 days';
  insert into public.contact_rate_limits(ip_hash, window_start, request_count)
  values (p_ip_hash, bucket_start, 1)
  on conflict (ip_hash, window_start) do update
    set request_count = public.contact_rate_limits.request_count + 1
    where public.contact_rate_limits.request_count < 5;
  return found;
end;
$$;
revoke all on function public.consume_contact_request(text) from public, anon, authenticated;
grant execute on function public.consume_contact_request(text) to service_role;


-- ---------------------------------------------------------------------------
-- 5) OPTIONNEL : temps réel (les clients reçoivent les changements en direct)
-- ---------------------------------------------------------------------------
-- alter publication supabase_realtime add table public.items;


-- ---------------------------------------------------------------------------
-- 6) STOCKAGE PRIVÉ (5 Mo max, images ou PDF ; chemin : <user_id>/nom-fichier)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('uploads', 'uploads', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

drop policy if exists "uploads_read" on storage.objects;
drop policy if exists "uploads_insert_own_folder" on storage.objects;
drop policy if exists "uploads_update_own_folder" on storage.objects;
drop policy if exists "uploads_delete_own_folder" on storage.objects;
drop policy if exists "uploads_read_own_folder" on storage.objects;
drop policy if exists "uploads_update_own_folder" on storage.objects;
drop policy if exists "uploads_delete_own_folder" on storage.objects;
create policy "uploads_read_own_folder" on storage.objects
  for select to authenticated using (
    bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "uploads_insert_own_folder" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "uploads_update_own_folder" on storage.objects
  for update to authenticated using (
    bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text
  ) with check (
    bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "uploads_delete_own_folder" on storage.objects
  for delete to authenticated using (
    bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text
  );


-- ---------------------------------------------------------------------------
-- 5) OPTIONNEL : données de démonstration pour le jury
--    (créez d'abord le compte démo : Authentication > Users > Add user > Auto Confirm User)
-- ---------------------------------------------------------------------------
-- insert into public.items (user_id, title, content, is_public)
-- select id, 'Note d''exemple', 'Créée depuis le SQL Editor pour la démonstration.', true
-- from public.profiles
-- order by created_at
-- limit 1;


-- ---------------------------------------------------------------------------
-- MODÈLE À COPIER POUR CHAQUE NOUVELLE TABLE
-- ---------------------------------------------------------------------------
-- create table public.ma_table (
--   id         uuid primary key default gen_random_uuid(),
--   user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
--   created_at timestamptz not null default now()
-- );
-- alter table public.ma_table enable row level security;
-- grant select                 on public.ma_table to anon, authenticated;   -- ou seulement authenticated
-- grant insert, update, delete on public.ma_table to authenticated;
-- grant select, insert, update, delete on public.ma_table to service_role;
-- create policy "ma_table_select" on public.ma_table for select to authenticated using ((select auth.uid()) = user_id);
-- create policy "ma_table_insert" on public.ma_table for insert to authenticated with check ((select auth.uid()) = user_id);
-- (Si vous utilisez `serial` plutôt que uuid : grant usage, select on all sequences in schema public to authenticated;)
