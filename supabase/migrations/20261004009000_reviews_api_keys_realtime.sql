-- Avis (note + commentaire) sur les services et leurs établissements, clés API développeur,
-- et diffusion temps réel des signalements/alertes pour la gestion rapide des cas critiques.

create table if not exists public.service_reviews (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  building_id uuid references public.buildings (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(btrim(comment)) between 1 and 1500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists service_reviews_service_author_uidx
  on public.service_reviews (service_id, author_id) where building_id is null;
create unique index if not exists service_reviews_building_author_uidx
  on public.service_reviews (building_id, author_id) where building_id is not null;
create index if not exists service_reviews_service_idx on public.service_reviews (service_id, created_at desc);

alter table public.service_reviews enable row level security;
grant select on public.service_reviews to anon, authenticated;
grant insert, update, delete on public.service_reviews to authenticated;
drop policy if exists "service_reviews_select" on public.service_reviews;
create policy "service_reviews_select" on public.service_reviews for select to anon, authenticated using (true);
drop policy if exists "service_reviews_insert" on public.service_reviews;
create policy "service_reviews_insert" on public.service_reviews for insert to authenticated
  with check (author_id = (select auth.uid()) and (select public.is_active_user()));
drop policy if exists "service_reviews_update" on public.service_reviews;
create policy "service_reviews_update" on public.service_reviews for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
drop policy if exists "service_reviews_delete" on public.service_reviews;
create policy "service_reviews_delete" on public.service_reviews for delete to authenticated
  using (author_id = (select auth.uid()) or (select public.is_admin()));

create or replace view public.service_review_stats with (security_invoker = true) as
  select service_id, building_id, round(avg(rating)::numeric, 2) as average_rating, count(*)::int as review_count
  from public.service_reviews
  group by service_id, building_id;
grant select on public.service_review_stats to anon, authenticated;

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  key_prefix text not null,
  key_hash text not null unique,
  scopes text[] not null default '{read}',
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index if not exists api_keys_owner_idx on public.api_keys (owner_id, created_at desc);

alter table public.api_keys enable row level security;
revoke all on public.api_keys from anon, authenticated;
grant select (id, owner_id, name, key_prefix, scopes, created_at, last_used_at, revoked_at), insert (name, key_prefix, key_hash, scopes), update (revoked_at)
  on public.api_keys to authenticated;
drop policy if exists "api_keys_select_own" on public.api_keys;
create policy "api_keys_select_own" on public.api_keys for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists "api_keys_insert_own" on public.api_keys;
create policy "api_keys_insert_own" on public.api_keys for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists "api_keys_update_own" on public.api_keys;
create policy "api_keys_update_own" on public.api_keys for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- Les agents/admins reçoivent les nouveaux signalements et alertes en temps réel (RLS appliquée).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.reports;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.dangers;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
