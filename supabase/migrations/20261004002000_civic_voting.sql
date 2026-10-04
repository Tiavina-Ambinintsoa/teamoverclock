create table if not exists public.city_projects (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete restrict,
  created_by uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  title text not null check (char_length(title) between 3 and 150),
  description text not null check (char_length(description) between 10 and 5000),
  status text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  created_at timestamptz not null default now()
);
create index if not exists city_projects_service_status_idx on public.city_projects (service_id, status, created_at desc);

create table if not exists public.city_project_votes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.city_projects (id) on delete cascade,
  citizen_id uuid not null references public.citizens (id) on delete cascade,
  support boolean not null,
  created_at timestamptz not null default now(),
  unique (project_id, citizen_id)
);
create index if not exists city_project_votes_project_idx on public.city_project_votes (project_id, support);

create table if not exists public.city_project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.city_projects (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists city_project_comments_project_idx on public.city_project_comments (project_id, created_at);

create table if not exists public.report_upvotes (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  citizen_id uuid not null references public.citizens (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (report_id, citizen_id)
);
create index if not exists report_upvotes_report_idx on public.report_upvotes (report_id);

alter table public.city_projects enable row level security;
alter table public.city_project_votes enable row level security;
alter table public.city_project_comments enable row level security;
alter table public.report_upvotes enable row level security;
revoke select on public.city_projects from anon, authenticated;
grant select (id, service_id, title, description, status, created_at) on public.city_projects to anon, authenticated;
grant insert, update, delete on public.city_projects to authenticated;
drop policy if exists "city_projects_select" on public.city_projects;
create policy "city_projects_select" on public.city_projects for select to anon, authenticated using (
  status in ('published', 'closed')
  or (select public.can_manage_service(service_id))
  or (select public.is_admin())
);
drop policy if exists "city_projects_insert_admin" on public.city_projects;
create policy "city_projects_insert_admin" on public.city_projects for insert to authenticated with check (
  (select public.is_admin()) and created_by = (select auth.uid())
);
drop policy if exists "city_projects_update_admin" on public.city_projects;
create policy "city_projects_update_admin" on public.city_projects for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "city_projects_delete_admin" on public.city_projects;
create policy "city_projects_delete_admin" on public.city_projects for delete to authenticated
  using ((select public.is_admin()));

grant insert, update, delete on public.city_project_votes to authenticated;
revoke select on public.city_project_votes from authenticated;
grant select (project_id, citizen_id, support) on public.city_project_votes to authenticated;
drop policy if exists "city_project_votes_select_own_or_manager" on public.city_project_votes;
drop policy if exists "city_project_votes_select_own" on public.city_project_votes;
create policy "city_project_votes_select_own" on public.city_project_votes for select to authenticated using (
  citizen_id = (select public.my_citizen_id())
);
drop policy if exists "city_project_votes_insert_verified" on public.city_project_votes;
create policy "city_project_votes_insert_verified" on public.city_project_votes for insert to authenticated with check (
  citizen_id = (select public.my_citizen_id())
  and (select public.is_verified_citizen())
  and exists (select 1 from public.city_projects p where p.id = project_id and p.status = 'published')
);
drop policy if exists "city_project_votes_update_own" on public.city_project_votes;
create policy "city_project_votes_update_own" on public.city_project_votes for update to authenticated
  using (citizen_id = (select public.my_citizen_id()))
  with check (
    citizen_id = (select public.my_citizen_id())
    and (select public.is_verified_citizen())
    and exists (select 1 from public.city_projects p where p.id = project_id and p.status = 'published')
  );
  drop policy if exists "city_project_votes_delete_own" on public.city_project_votes;
  create policy "city_project_votes_delete_own" on public.city_project_votes for delete to authenticated
  using (citizen_id = (select public.my_citizen_id()));

revoke select on public.city_project_comments from anon, authenticated;
grant select (id, project_id, body, created_at) on public.city_project_comments to anon, authenticated;
grant insert, delete on public.city_project_comments to authenticated;
drop policy if exists "city_project_comments_select" on public.city_project_comments;
create policy "city_project_comments_select" on public.city_project_comments for select to anon, authenticated using (
  exists (select 1 from public.city_projects p where p.id = project_id and p.status in ('published', 'closed'))
  or (select public.is_admin())
  or exists (select 1 from public.city_projects p where p.id = project_id and (select public.can_manage_service(p.service_id)))
);
drop policy if exists "city_project_comments_insert_verified" on public.city_project_comments;
create policy "city_project_comments_insert_verified" on public.city_project_comments for insert to authenticated with check (
  author_id = (select auth.uid())
  and (select public.is_verified_citizen())
  and exists (select 1 from public.city_projects p where p.id = project_id and p.status = 'published')
);
drop policy if exists "city_project_comments_delete_own_or_admin" on public.city_project_comments;
create policy "city_project_comments_delete_own_or_admin" on public.city_project_comments for delete to authenticated
  using (author_id = (select auth.uid()) or (select public.is_admin()));

grant insert, delete on public.report_upvotes to authenticated;
revoke select on public.report_upvotes from authenticated;
grant select (report_id, citizen_id) on public.report_upvotes to authenticated;
drop policy if exists "report_upvotes_select_own" on public.report_upvotes;
create policy "report_upvotes_select_own" on public.report_upvotes for select to authenticated
  using (citizen_id = (select public.my_citizen_id()));
drop policy if exists "report_upvotes_insert_verified_public" on public.report_upvotes;
create policy "report_upvotes_insert_verified_public" on public.report_upvotes for insert to authenticated with check (
  citizen_id = (select public.my_citizen_id())
  and (select public.is_verified_citizen())
  and exists (
    select 1 from public.reports r
    where r.id = report_id and r.is_public and r.deleted_at is null
      and r.status in ('validated', 'assigned', 'in_progress', 'resolved')
  )
);
drop policy if exists "report_upvotes_delete_own" on public.report_upvotes;
create policy "report_upvotes_delete_own" on public.report_upvotes for delete to authenticated
  using (citizen_id = (select public.my_citizen_id()));

create or replace function public.get_city_project_stats()
returns table (
  project_id uuid,
  service_id uuid,
  title text,
  status text,
  yes_votes bigint,
  no_votes bigint,
  comment_count bigint
)
language sql stable security definer set search_path = '' as $$
  select p.id, p.service_id, p.title, p.status,
         count(v.id) filter (where v.support) as yes_votes,
         count(v.id) filter (where not v.support) as no_votes,
         (select count(*) from public.city_project_comments c where c.project_id = p.id) as comment_count
  from public.city_projects p
  left join public.city_project_votes v on v.project_id = p.id
  where (select public.can_manage_service(p.service_id))
     or (select public.is_admin())
  group by p.id, p.service_id, p.title, p.status;
$$;
revoke all on function public.get_city_project_stats() from public;
grant execute on function public.get_city_project_stats() to authenticated;

create or replace function public.get_public_report_upvote_counts(p_report_ids uuid[])
returns table (report_id uuid, upvote_count bigint)
language sql stable security definer set search_path = '' as $$
  select r.id, count(u.id) as upvote_count
  from public.reports r
  left join public.report_upvotes u on u.report_id = r.id
  where r.id = any(p_report_ids)
    and r.is_public and r.deleted_at is null
    and r.status in ('validated', 'assigned', 'in_progress', 'resolved')
  group by r.id;
$$;
revoke all on function public.get_public_report_upvote_counts(uuid[]) from public;
grant execute on function public.get_public_report_upvote_counts(uuid[]) to anon, authenticated;
