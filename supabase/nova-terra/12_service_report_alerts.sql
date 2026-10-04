-- Rappels de rendez-vous (planifier avec pg_cron toutes les 15 minutes) et
-- notifications au citoyen lors des changements de statut/consignes d'un signalement.
-- Les politiques de création de demande refusent aussi les services indisponibles.

create unique index if not exists appointment_reminder_notification_dedupe_idx
  on public.notifications (user_id, entity_type, entity_id)
  where entity_type in ('appointment_reminder_24h', 'appointment_reminder_1h');

create or replace function public.send_appointment_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
begin
  with due_appointments as (
    select a.id, a.profile_id, a.starts_at, a.purpose,
           s.name as service_name, s.slug as service_slug, s.address, s.phone, s.required_documents,
           p.locale,
           case
             when a.starts_at between now() + interval '45 minutes' and now() + interval '75 minutes'
               then 'appointment_reminder_1h'
             else 'appointment_reminder_24h'
           end as reminder_kind
    from public.service_appointments a
    join public.services s on s.id = a.service_id
    join public.profiles p on p.id = a.profile_id and p.account_status = 'active'
    where a.status in ('requested', 'confirmed')
      and (
        a.starts_at between now() + interval '45 minutes' and now() + interval '75 minutes'
        or a.starts_at between now() + interval '23 hours 45 minutes' and now() + interval '24 hours 15 minutes'
      )
      and not exists (
        select 1 from public.notifications n
        where n.user_id = a.profile_id
          and n.entity_type = case
            when a.starts_at between now() + interval '45 minutes' and now() + interval '75 minutes'
              then 'appointment_reminder_1h'
            else 'appointment_reminder_24h'
          end
          and n.entity_id = a.id
      )
  ), inserted as (
    insert into public.notifications (user_id, type, title, body, href, entity_type, entity_id)
    select d.profile_id,
           'system',
           case when d.locale = 'en' then 'Appointment reminder' else 'Rappel de rendez-vous' end,
           left(concat_ws(
             E'\n',
             case when d.locale = 'en'
               then case when d.reminder_kind = 'appointment_reminder_1h'
                         then 'Your appointment is in about 1 hour.'
                         else 'Your appointment is tomorrow.'
                    end
               else case when d.reminder_kind = 'appointment_reminder_1h'
                         then 'Votre rendez-vous est dans environ 1 heure.'
                         else 'Votre rendez-vous est prévu demain.'
                    end
             end,
             case when d.locale = 'en' then 'Service: ' else 'Service : ' end || d.service_name,
             case when d.locale = 'en' then 'Time (UTC): ' else 'Heure (UTC) : ' end
               || to_char(d.starts_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI'),
             case when d.locale = 'en' then 'Purpose: ' else 'Motif : ' end || d.purpose,
             case when nullif(btrim(coalesce(d.address, '')), '') is not null
               then (case when d.locale = 'en' then 'Location: ' else 'Adresse : ' end) || d.address end,
             case when nullif(btrim(coalesce(d.phone, '')), '') is not null
               then (case when d.locale = 'en' then 'Phone: ' else 'Téléphone : ' end) || d.phone end,
             case when cardinality(coalesce(d.required_documents, '{}')) > 0
               then (case when d.locale = 'en' then 'Bring: ' else 'À apporter : ' end)
                    || array_to_string(d.required_documents, ', ')
               else (case when d.locale = 'en' then 'No required documents listed.' else 'Aucun document obligatoire indiqué.' end)
             end,
             case when d.locale = 'en'
               then 'Please arrive a few minutes early and bring your appointment confirmation.'
               else 'Merci d’arriver quelques minutes en avance et de présenter la confirmation du rendez-vous.'
             end
           ), 1000),
           '/services/' || d.service_slug,
           d.reminder_kind,
           d.id
    from due_appointments d
    on conflict (user_id, entity_type, entity_id)
      where entity_type in ('appointment_reminder_24h', 'appointment_reminder_1h')
      do nothing
    returning 1
  )
  select count(*) into v_count from inserted;
  return v_count;
end;
$$;

revoke all on function public.send_appointment_reminders() from public, anon, authenticated;
grant execute on function public.send_appointment_reminders() to service_role;

create or replace function public.after_report_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_locale text;
  v_status_changed boolean := new.status is distinct from old.status;
  v_instructions_changed boolean := (
    new.next_steps,
    new.required_documents
  ) is distinct from (
    old.next_steps,
    old.required_documents
  ) and new.postponement_reason is not distinct from old.postponement_reason;
  v_assignment_changed boolean := new.assigned_agent_id is distinct from old.assigned_agent_id;
  v_publication_changed boolean := new.is_public is distinct from old.is_public;
begin
  if v_status_changed then
    insert into public.report_status_history (report_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, (select auth.uid()));
  end if;

  if v_status_changed or v_instructions_changed or v_assignment_changed or v_publication_changed then
    select c.profile_id, p.locale
      into v_user_id, v_locale
    from public.citizens c
    join public.profiles p on p.id = c.profile_id and p.account_status = 'active'
    where c.id = new.reporter_citizen_id and c.deleted_at is null;

    if v_user_id is not null then
      insert into public.notifications (user_id, type, title, body, href, entity_type, entity_id)
      values (
        v_user_id,
        'report_update',
        case when v_locale = 'en' then 'Your report has been updated' else 'Votre signalement a été mis à jour' end,
        left(
          case when v_status_changed then
            case when v_locale = 'en' then
              'Report ' || new.report_number || ': status changed to ' ||
              case new.status
                when 'received' then 'received'
                when 'to_verify' then 'awaiting review'
                when 'validated' then 'validated'
                when 'rejected' then 'rejected'
                when 'assigned' then 'assigned'
                when 'in_progress' then 'in progress'
                when 'resolved' then 'resolved'
                when 'archived' then 'archived'
                else 'draft'
              end
            else
              'Signalement ' || new.report_number || ' : statut « ' ||
              case new.status
                when 'received' then 'reçu'
                when 'to_verify' then 'à vérifier'
                when 'validated' then 'validé'
                when 'rejected' then 'refusé'
                when 'assigned' then 'attribué'
                when 'in_progress' then 'en cours'
                when 'resolved' then 'résolu'
                when 'archived' then 'archivé'
                else 'brouillon'
              end || ' ».'
            end
          when v_instructions_changed then
            case when v_locale = 'en'
              then 'New follow-up instructions are available for report ' || new.report_number || '.'
              else 'De nouvelles consignes sont disponibles pour le signalement ' || new.report_number || '.'
            end
          else
            case when v_locale = 'en'
              then 'Report ' || new.report_number || ' has new follow-up information.'
              else 'De nouvelles informations de suivi sont disponibles pour le signalement ' || new.report_number || '.'
            end
          end,
          500
        ),
        '/app/reports/' || new.id::text,
        'report',
        new.id
      );
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.after_report_status_change() from public, anon, authenticated;
drop trigger if exists after_report_status_change on public.reports;
create trigger after_report_status_change
  after update on public.reports
  for each row execute function public.after_report_status_change();

drop policy if exists "requests_insert_own" on public.requests;
create policy "requests_insert_own" on public.requests for insert to authenticated with check (
  requester_id = (select auth.uid())
  and (select public.is_active_user())
  and status = 'new' and assigned_agent_id is null and closed_at is null
  and resolution_note is null and satisfaction is null
  and exists (
    select 1 from public.services s
    where s.id = requests.service_id and s.published_at is not null and s.status <> 'hidden'
      and (case
        when s.scheduled_at is not null and s.scheduled_at <= now() then s.scheduled_status
        else s.status
      end) = 'open'
      and (s.reopens_at is null or s.reopens_at <= now())
  )
);
