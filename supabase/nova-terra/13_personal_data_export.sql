-- Export only a caller's own project comments without granting access to author IDs.
create or replace function public.my_city_project_comments(
  p_offset integer default 0,
  p_limit integer default 500
)
returns table (project_id uuid, body text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.project_id, c.body, c.created_at
  from public.city_project_comments c
  where c.author_id = (select auth.uid())
  order by c.created_at desc
  limit greatest(1, least(coalesce(p_limit, 500), 500))
  offset greatest(0, coalesce(p_offset, 0));
$$;

revoke all on function public.my_city_project_comments(integer, integer) from public, anon;
grant execute on function public.my_city_project_comments(integer, integer) to authenticated;
