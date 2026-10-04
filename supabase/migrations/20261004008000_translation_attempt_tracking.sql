alter table public.news
  add column if not exists translation_attempted_at timestamptz;

alter table public.services
  add column if not exists translation_attempted_at timestamptz;

alter table public.city_projects
  add column if not exists translation_attempted_at timestamptz;

alter table public.dangers
  add column if not exists translation_attempted_at timestamptz;

alter table public.buildings
  add column if not exists translation_attempted_at timestamptz;

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
        new.translation_attempted_at := null;
      end if;
    when 'services' then
      if row(new.name, new.category, new.description, new.procedures, new.required_documents, new.fees)
        is distinct from row(old.name, old.category, old.description, old.procedures, old.required_documents, old.fees) then
        new.translation_source_hash := null;
        new.translation_attempted_at := null;
      end if;
    when 'city_projects' then
      if row(new.title, new.description)
        is distinct from row(old.title, old.description) then
        new.translation_source_hash := null;
        new.translation_attempted_at := null;
      end if;
    when 'dangers' then
      if row(new.title, new.summary, new.recommended_actions, new.forbidden_actions, new.protocol_steps)
        is distinct from row(old.title, old.summary, old.recommended_actions, old.forbidden_actions, old.protocol_steps) then
        new.translation_source_hash := null;
        new.translation_attempted_at := null;
      end if;
    when 'buildings' then
      if row(new.name, new.description, new.facility_type, new.capabilities, new.offerings, new.opening_hours, new.accessibility)
        is distinct from row(old.name, old.description, old.facility_type, old.capabilities, old.offerings, old.opening_hours, old.accessibility) then
        new.translation_source_hash := null;
        new.translation_attempted_at := null;
      end if;
  end case;
  return new;
end;
$$;
