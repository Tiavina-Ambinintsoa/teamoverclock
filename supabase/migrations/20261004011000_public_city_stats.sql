create or replace function public.public_city_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  with public_services as (
    select s.id, s.name, s.category
    from public.services s
    where s.published_at is not null and s.status <> 'hidden'
  ),
  service_usage as (
    select
      s.id as service_id,
      s.name,
      s.category,
      coalesce((
        select count(*)
        from public.requests r
        where r.service_id = s.id and r.deleted_at is null
      ), 0)::bigint as request_count,
      coalesce((
        select count(*)
        from public.service_appointments a
        where a.service_id = s.id and a.status in ('requested', 'confirmed')
      ), 0)::bigint as appointment_count
    from public_services s
  ),
  usage_ranked as (
    select
      service_id,
      name,
      category,
      request_count,
      appointment_count,
      (request_count + appointment_count)::bigint as total_usage
    from service_usage
    order by total_usage desc, request_count desc, name
  ),
  public_reports as (
    select r.category::text as category, r.status::text as status
    from public.reports r
    where r.is_public
      and r.deleted_at is null
      and r.status in ('validated', 'assigned', 'in_progress', 'resolved')
  ),
  report_categories as (
    select category as key, count(*)::bigint as count
    from public_reports
    group by category
    order by count desc, category
  ),
  report_status_counts as (
    select status as key, count(*)::bigint as count
    from public_reports
    group by status
    order by count desc, status
  ),
  project_votes as (
    select
      p.id as project_id,
      p.service_id,
      p.title,
      p.status::text as status,
      p.created_at,
      count(v.id) filter (where v.support) as yes_votes,
      count(v.id) filter (where not v.support) as no_votes,
      (select count(*) from public.city_project_comments c where c.project_id = p.id) as comment_count
    from public.city_projects p
    left join public.city_project_votes v on v.project_id = p.id
    where p.status in ('published', 'closed')
    group by p.id, p.service_id, p.title, p.status, p.created_at
  ),
  project_summaries as (
    select
      project_id,
      service_id,
      title,
      status,
      created_at,
      yes_votes::bigint,
      no_votes::bigint,
      comment_count::bigint,
      (yes_votes + no_votes)::bigint as total_votes
    from project_votes
  )
  select jsonb_build_object(
    'service_count', (select count(*)::bigint from public_services),
    'public_reports_count', (select count(*)::bigint from public_reports),
    'published_projects_count', (select count(*)::bigint from public.city_projects p where p.status in ('published', 'closed')),
    'total_project_votes', (select coalesce(sum(total_votes), 0)::bigint from project_summaries),
    'active_dangers_count', (
      select count(*)::bigint
      from public.dangers d
      where d.status = 'active'
        and d.valid_from <= now()
        and (d.valid_until is null or d.valid_until >= now())
    ),
    'top_services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'service_id', service_id,
        'name', name,
        'category', category,
        'request_count', request_count,
        'appointment_count', appointment_count,
        'total_usage', total_usage
      ))
      from (select * from usage_ranked limit 6) ranked_services
    ), '[]'::jsonb),
    'top_report_categories', coalesce((
      select jsonb_agg(jsonb_build_object('key', key, 'count', count))
      from (select * from report_categories limit 6) ranked_categories
    ), '[]'::jsonb),
    'report_status_counts', coalesce((
      select jsonb_agg(jsonb_build_object('key', key, 'count', count))
      from report_status_counts
    ), '[]'::jsonb),
    'project_summaries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'project_id', project_id,
        'service_id', service_id,
        'title', title,
        'status', status,
        'created_at', created_at,
        'yes_votes', yes_votes,
        'no_votes', no_votes,
        'comment_count', comment_count,
        'total_votes', total_votes
      ))
      from (select * from project_summaries order by created_at desc, total_votes desc limit 12) latest_projects
    ), '[]'::jsonb),
    'top_projects', coalesce((
      select jsonb_agg(jsonb_build_object(
        'project_id', project_id,
        'service_id', service_id,
        'title', title,
        'status', status,
        'created_at', created_at,
        'yes_votes', yes_votes,
        'no_votes', no_votes,
        'comment_count', comment_count,
        'total_votes', total_votes
      ))
      from (select * from project_summaries order by total_votes desc, comment_count desc, created_at desc limit 6) ranked_projects
    ), '[]'::jsonb)
  )
  into v_result;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

revoke all on function public.public_city_stats() from public;
grant execute on function public.public_city_stats() to anon, authenticated;
