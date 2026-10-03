alter table public.services
  add column if not exists status_reason text,
  add column if not exists status_change_type text not null default 'manual'
    check (status_change_type in ('manual', 'scheduled', 'unexpected')),
  add column if not exists scheduled_status public.service_status,
  add column if not exists scheduled_at timestamptz,
  add column if not exists reopens_at timestamptz;

alter table public.services
  drop constraint if exists services_scheduled_status_check;
alter table public.services
  add constraint services_scheduled_status_check
  check (scheduled_status is null or scheduled_status in ('open', 'temporarily_closed', 'suspended'));

alter table public.reports
  add column if not exists next_steps text,
  add column if not exists required_documents text[] not null default '{}',
  add column if not exists postponement_reason text;

create table if not exists public.service_appointments (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  starts_at timestamptz not null,
  purpose text not null check (char_length(purpose) between 3 and 1000),
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists service_appointments_slot_idx
  on public.service_appointments (service_id, starts_at)
  where status in ('requested', 'confirmed');
create index if not exists service_appointments_user_date_idx
  on public.service_appointments (profile_id, starts_at);
create index if not exists service_appointments_service_date_idx
  on public.service_appointments (service_id, starts_at);

alter table public.service_appointments enable row level security;
grant select, insert on public.service_appointments to authenticated;
grant update (status) on public.service_appointments to authenticated;
grant select, insert, update, delete on public.service_appointments to service_role;

drop policy if exists "service_appointments_select_related" on public.service_appointments;
create policy "service_appointments_select_related" on public.service_appointments
  for select to authenticated using (
    profile_id = (select auth.uid()) or (select public.can_manage_service(service_id))
  );

drop policy if exists "service_appointments_insert_own" on public.service_appointments;
create policy "service_appointments_insert_own" on public.service_appointments
  for insert to authenticated with check (
    profile_id = (select auth.uid())
    and starts_at > now()
    and (select public.is_active_user())
    and exists (
      select 1 from public.services s
      where s.id = service_id and s.published_at is not null and s.status <> 'hidden'
        and (case
          when s.scheduled_at is not null and s.scheduled_at <= now() then s.scheduled_status
          else s.status
        end) = 'open'
        and (s.reopens_at is null or s.reopens_at <= now())
    )
  );

drop policy if exists "service_appointments_update_manager" on public.service_appointments;
create policy "service_appointments_update_manager" on public.service_appointments
  for update to authenticated using ((select public.can_manage_service(service_id)))
  with check ((select public.can_manage_service(service_id)));

create or replace function public.postpone_report_with_notice(
  p_report_id uuid,
  p_reason text,
  p_next_steps text,
  p_required_documents text[],
  p_locale text default 'fr'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_service_id uuid;
  v_citizen_id uuid;
  v_report_number text;
  v_user_id uuid;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if char_length(v_reason) < 5 or char_length(v_reason) > 500 then
    raise exception 'A postponement reason of 5 to 500 characters is required' using errcode = '22023';
  end if;

  select r.service_id, r.reporter_citizen_id, r.report_number
    into v_service_id, v_citizen_id, v_report_number
  from public.reports r
  where r.id = p_report_id
    and r.status in ('received', 'to_verify', 'validated', 'assigned', 'in_progress')
    and r.deleted_at is null
  for update;

  if not found or v_service_id is null
    or (not public.can_manage_service(v_service_id) and not public.is_admin()) then
    raise exception 'Report cannot be postponed by this user' using errcode = '42501';
  end if;

  select c.profile_id into v_user_id
  from public.citizens c
  where c.id = v_citizen_id and c.deleted_at is null;

  if v_user_id is null then
    raise exception 'The report has no active citizen reporter to notify' using errcode = '22023';
  end if;

  update public.reports
  set next_steps = nullif(btrim(coalesce(p_next_steps, '')), ''),
      required_documents = coalesce(p_required_documents, '{}'),
      postponement_reason = v_reason,
      updated_at = now()
  where id = p_report_id;

  insert into public.notifications (user_id, title, body, href)
  values (
    v_user_id,
    case when p_locale = 'en' then 'Your report has been postponed' else 'Votre signalement est reporté' end,
    left(case when p_locale = 'en'
      then 'Report ' || v_report_number || ': ' || v_reason
      else 'Signalement ' || v_report_number || ' : ' || v_reason end, 500),
    '/app/reports/' || p_report_id::text
  );
end;
$$;

revoke all on function public.postpone_report_with_notice(uuid, text, text, text[], text) from public, anon;
grant execute on function public.postpone_report_with_notice(uuid, text, text, text[], text) to authenticated;
