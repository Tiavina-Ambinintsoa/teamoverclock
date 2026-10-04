alter table public.city_projects
  add column if not exists status_changed_at timestamptz,
  add column if not exists taken_over_at timestamptz;

update public.city_projects
set status_changed_at = coalesce(status_changed_at, created_at)
where status_changed_at is null;

grant select (translations) on public.city_projects to anon, authenticated;
grant select (created_by, status_changed_at, taken_over_at) on public.city_projects to authenticated;

revoke update on public.city_projects from authenticated;
grant update (title, description, service_id, status) on public.city_projects to authenticated;

revoke update on public.reports from authenticated;
grant update (
  title, description, category, sector_id, building_id, x, y,
  status, assigned_agent_id, next_steps, required_documents, postponement_reason, is_public, priority
) on public.reports to authenticated;

create or replace function public.before_city_project_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is null then
    new.created_by := (select auth.uid());
  end if;
  if new.created_at is null then
    new.created_at := now();
  end if;
  new.status_changed_at := coalesce(new.status_changed_at, new.created_at, now());
  return new;
end;
$$;

revoke all on function public.before_city_project_insert() from public, anon, authenticated;
drop trigger if exists before_city_project_insert on public.city_projects;
create trigger before_city_project_insert
before insert on public.city_projects
for each row execute function public.before_city_project_insert();

create or replace function public.before_city_project_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) = old.created_by
     and not (select public.is_admin())
     and not (select public.can_manage_service(old.service_id)) then
    if coalesce(old.status_changed_at, old.created_at) is distinct from old.created_at then
      raise exception 'This project can no longer be edited by its creator because its status has changed' using errcode = '42501';
    end if;
    if old.taken_over_at is not null then
      raise exception 'This project can no longer be edited by its creator because another manager has taken it over' using errcode = '42501';
    end if;
    if new.status is distinct from old.status then
      raise exception 'The creator can only edit title, description, or responsible service' using errcode = '42501';
    end if;
  end if;

  if new.status is distinct from old.status then
    new.status_changed_at := now();
  else
    new.status_changed_at := coalesce(old.status_changed_at, old.created_at, now());
  end if;

  if (select auth.uid()) is distinct from old.created_by then
    new.taken_over_at := coalesce(old.taken_over_at, now());
  else
    new.taken_over_at := old.taken_over_at;
  end if;

  return new;
end;
$$;

revoke all on function public.before_city_project_update() from public, anon, authenticated;
drop trigger if exists before_city_project_update on public.city_projects;
create trigger before_city_project_update
before update on public.city_projects
for each row execute function public.before_city_project_update();

drop policy if exists "city_projects_update_admin" on public.city_projects;
create policy "city_projects_update_admin" on public.city_projects for update to authenticated
  using ((select public.is_admin()) or (select public.can_manage_service(service_id)))
  with check ((select public.is_admin()) or (select public.can_manage_service(service_id)));

drop policy if exists "city_projects_insert_admin" on public.city_projects;
create policy "city_projects_insert_admin" on public.city_projects for insert to authenticated with check (
  created_by = (select auth.uid()) and ((select public.is_admin()) or (select public.can_manage_service(service_id)))
);

drop policy if exists "city_projects_update_creator_untouched" on public.city_projects;
create policy "city_projects_update_creator_untouched" on public.city_projects for update to authenticated
  using (
    created_by = (select auth.uid())
    and coalesce(status_changed_at, created_at) = created_at
    and taken_over_at is null
  )
  with check (
    created_by = (select auth.uid())
    and coalesce(status_changed_at, created_at) = created_at
    and taken_over_at is null
  );

create or replace function public.before_report_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slug text;
begin
  if old.reporter_citizen_id = (select public.my_citizen_id())
     and not (select public.is_service_member(old.service_id))
     and not (select public.is_admin()) then
    if old.assigned_agent_id is not null
       or old.status not in ('draft', 'received')
       or exists (select 1 from public.report_status_history h where h.report_id = old.id) then
      raise exception 'This report can no longer be edited by its author' using errcode = '42501';
    end if;

    if new.status is distinct from old.status and not (old.status = 'draft' and new.status = 'received') then
      raise exception 'The author can only send a draft or edit report content while untouched' using errcode = '42501';
    end if;

    if row(
      new.assigned_agent_id,
      new.next_steps,
      new.required_documents,
      new.postponement_reason,
      new.is_public,
      new.priority
    ) is distinct from row(
      old.assigned_agent_id,
      old.next_steps,
      old.required_documents,
      old.postponement_reason,
      old.is_public,
      old.priority
    ) then
      raise exception 'The author can only edit report content columns while the report is untouched' using errcode = '42501';
    end if;

    new.assigned_agent_id := old.assigned_agent_id;
    new.next_steps := old.next_steps;
    new.required_documents := old.required_documents;
    new.postponement_reason := old.postponement_reason;
    new.is_public := old.is_public;
    new.priority := old.priority;

    if new.category is distinct from old.category then
      v_slug := case new.category
        when 'infrastructure' then 'public-works'
        when 'safety'         then 'nova-police'
        when 'health'         then 'emergency-medical'
        when 'environment'    then 'environment-waste'
        when 'transport'      then 'transport-authority'
        when 'noise'          then 'nova-police'
        else 'citizen-relations' end;
      select s.id into new.service_id from public.services s where s.slug = v_slug;
    end if;
  end if;

  if new.status = 'validated' and old.status is distinct from 'validated' then
    if (select auth.uid()) is not null and not public.can_validate_service(new.service_id) then
      raise exception 'Only an administrator of the responsible service can validate this report' using errcode = '42501';
    end if;
    new.validated_by := coalesce((select auth.uid()), new.validated_by);
    new.validated_at := now();
  end if;
  if new.status = 'resolved' and old.status is distinct from 'resolved' then
    new.resolved_at := now();
  end if;
  if new.is_public and not old.is_public and (select auth.uid()) is not null
     and not public.can_validate_service(new.service_id) then
    raise exception 'Only an administrator of the responsible service can publish this report' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.before_report_update() from public, anon, authenticated;
drop trigger if exists before_report_update on public.reports;
create trigger before_report_update
  before update on public.reports for each row execute function public.before_report_update();

drop policy if exists "reports_update" on public.reports;
drop policy if exists "reports_update_own_untouched" on public.reports;
create policy "reports_update_own_untouched" on public.reports for update to authenticated
  using (
    reporter_citizen_id = (select public.my_citizen_id())
    and assigned_agent_id is null
    and status in ('draft', 'received')
    and not exists (select 1 from public.report_status_history h where h.report_id = id)
  )
  with check (
    reporter_citizen_id = (select public.my_citizen_id())
    and assigned_agent_id is null
    and status in ('draft', 'received')
    and not is_public
  );

drop policy if exists "reports_update_staff" on public.reports;
create policy "reports_update_staff" on public.reports for update to authenticated
  using ((select public.is_service_member(service_id)) or (select public.is_admin()))
  with check ((select public.is_service_member(service_id)) or (select public.is_admin()));
