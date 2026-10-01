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


-- ---------------------------------------------------------------------------
-- 3) OPTIONNEL : temps réel (les clients reçoivent les changements en direct)
-- ---------------------------------------------------------------------------
-- alter publication supabase_realtime add table public.items;


-- ---------------------------------------------------------------------------
-- 4) OPTIONNEL : stockage d'images (bucket "uploads", 2 Mo max, images seulement)
--    Convention : chaque utilisateur écrit dans SON dossier  <user_id>/nom-du-fichier.webp
-- ---------------------------------------------------------------------------
-- insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- values ('uploads', 'uploads', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
-- on conflict (id) do nothing;
--
-- drop policy if exists "uploads_read" on storage.objects;
-- create policy "uploads_read" on storage.objects
--   for select using (bucket_id = 'uploads');
--
-- drop policy if exists "uploads_insert_own_folder" on storage.objects;
-- create policy "uploads_insert_own_folder" on storage.objects
--   for insert to authenticated
--   with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);
--
-- drop policy if exists "uploads_delete_own_folder" on storage.objects;
-- create policy "uploads_delete_own_folder" on storage.objects
--   for delete to authenticated
--   using (bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);


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
