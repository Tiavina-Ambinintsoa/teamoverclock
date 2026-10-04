alter table public.news
  add column if not exists translation_source_hash text;

alter table public.services
  add column if not exists translations jsonb not null default '{}'::jsonb,
  add column if not exists translation_source_hash text;

alter table public.city_projects
  add column if not exists translations jsonb not null default '{}'::jsonb,
  add column if not exists translation_source_hash text;

alter table public.dangers
  add column if not exists translations jsonb not null default '{}'::jsonb,
  add column if not exists translation_source_hash text;

alter table public.buildings
  add column if not exists translations jsonb not null default '{}'::jsonb,
  add column if not exists translation_source_hash text;

create or replace function public.invalidate_public_content_translation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  case tg_table_name
    when 'news' then
      if row(new.title, new.summary, new.body, new.category)
        is distinct from row(old.title, old.summary, old.body, old.category) then
        new.translation_source_hash := null;
      end if;
    when 'services' then
      if row(new.name, new.category, new.description, new.procedures, new.required_documents, new.fees)
        is distinct from row(old.name, old.category, old.description, old.procedures, old.required_documents, old.fees) then
        new.translation_source_hash := null;
      end if;
    when 'city_projects' then
      if row(new.title, new.description)
        is distinct from row(old.title, old.description) then
        new.translation_source_hash := null;
      end if;
    when 'dangers' then
      if row(new.title, new.summary, new.recommended_actions, new.forbidden_actions, new.protocol_steps)
        is distinct from row(old.title, old.summary, old.recommended_actions, old.forbidden_actions, old.protocol_steps) then
        new.translation_source_hash := null;
      end if;
    when 'buildings' then
      if row(new.name, new.description, new.facility_type, new.capabilities, new.offerings, new.opening_hours, new.accessibility)
        is distinct from row(old.name, old.description, old.facility_type, old.capabilities, old.offerings, old.opening_hours, old.accessibility) then
        new.translation_source_hash := null;
      end if;
  end case;
  return new;
end;
$$;

create trigger news_invalidate_translation
before update on public.news
for each row execute function public.invalidate_public_content_translation();

create trigger services_invalidate_translation
before update on public.services
for each row execute function public.invalidate_public_content_translation();

create trigger city_projects_invalidate_translation
before update on public.city_projects
for each row execute function public.invalidate_public_content_translation();

create trigger dangers_invalidate_translation
before update on public.dangers
for each row execute function public.invalidate_public_content_translation();

create trigger buildings_invalidate_translation
before update on public.buildings
for each row execute function public.invalidate_public_content_translation();

select cron.unschedule(jobid)
from cron.job
where jobname = 'translate-public-content-hourly';

select cron.schedule(
  'translate-public-content-hourly',
  '0 * * * *',
  $job$
    select net.http_post(
      url := 'https://spjetbegarhzweqlnxdr.supabase.co/functions/v1/translate-content',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || secret.decrypted_secret,
        'apikey', secret.decrypted_secret
      ),
      body := '{"mode":"hourly"}'::jsonb,
      timeout_milliseconds := 60000
    )
    from vault.decrypted_secrets as secret
    where secret.name = 'nova_terra_service_role_key'
  $job$
);
