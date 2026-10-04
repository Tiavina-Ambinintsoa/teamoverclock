alter table public.profiles
  drop constraint if exists profiles_locale_check,
  add constraint profiles_locale_check
    check (locale in ('fr', 'en', 'mg', 'mfe', 'rcf', 'x-nova'));

alter table public.guide_tour_steps
  drop constraint if exists guide_tour_steps_locale_check,
  add constraint guide_tour_steps_locale_check
    check (locale in ('fr', 'en', 'mg', 'mfe', 'rcf', 'x-nova'));

alter table public.voice_commands
  drop constraint if exists voice_commands_locale_check,
  add constraint voice_commands_locale_check
    check (locale in ('fr', 'en', 'mg', 'mfe', 'rcf', 'x-nova', 'any'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_birth date;
  v_sector uuid;
  v_locale text;
begin
  v_locale := new.raw_user_meta_data ->> 'locale';
  if v_locale is null or v_locale not in ('fr', 'en', 'mg', 'mfe', 'rcf', 'x-nova') then
    v_locale := 'fr';
  end if;

  insert into public.profiles (id, display_name, first_name, last_name, account_status, locale)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    case when new.email_confirmed_at is not null then 'active'::public.account_status else 'pending'::public.account_status end,
    v_locale
  )
  on conflict (id) do nothing;

  begin
    v_birth := (new.raw_user_meta_data ->> 'birth_date')::date;
    v_sector := nullif(new.raw_user_meta_data ->> 'sector_id', '')::uuid;
  exception when others then
    v_birth := null;
    v_sector := null;
  end;

  if v_birth is not null and v_birth <= (current_date - interval '18 years')::date then
    insert into public.citizens (profile_id, birth_date, sector_id, consent_terms_at, consent_data_at)
    values (new.id, v_birth, v_sector, now(), now())
    on conflict (profile_id) do nothing;
  end if;
  return new;
end;
$$;
