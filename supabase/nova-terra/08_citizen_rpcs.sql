-- ============================================================================
-- NOVA TERRA — 08 : RPC de la phase 1 (identité citoyenne, CIN fictif, parrainage)
-- Source de vérité : docs/PLAN.md §9 (tâche 1.5). Relançable. À exécuter après 01 → 07c.
-- Les gardes de colonnes (guard_*_update) acceptent le drapeau transactionnel
-- app.bypass_guard posé UNIQUEMENT par ces fonctions SECURITY DEFINER.
-- ============================================================================

create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and pg_trigger_depth() = 1
     and coalesce(current_setting('app.bypass_guard', true), '') <> '1'
     and not public.is_admin() then
    if (new.role, new.account_status, new.primary_service_id, new.allowed_sector_ids, new.requires_2fa, new.deleted_at)
       is distinct from
       (old.role, old.account_status, old.primary_service_id, old.allowed_sector_ids, old.requires_2fa, old.deleted_at) then
      raise exception 'Role, status and attachment can only be changed by an administrator' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.guard_citizen_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and pg_trigger_depth() = 1
     and coalesce(current_setting('app.bypass_guard', true), '') <> '1'
     and not public.is_admin() then
    if (new.kyc_status, new.reputation_base, new.reputation_points, new.deleted_at, new.profile_id)
       is distinct from
       (old.kyc_status, old.reputation_base, old.reputation_points, old.deleted_at, old.profile_id) then
      raise exception 'Verification and reputation are managed by the platform' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

-- Format du CIN fictif de Nova Terra : NT-CIN- suivi de 6 chiffres (modèle de référence de la vérification)
create or replace function public.cin_matches_model(p_cin text)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(p_cin ~ '^NT-CIN-[0-9]{6}$', false);
$$;

-- Crée la fiche citoyenne de l'utilisateur connecté (majeur : directe ; mineur : parrain obligatoire).
create or replace function public.complete_citizen_profile(p_birth_date date, p_sector_id uuid, p_sponsor_cin text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid     uuid := (select auth.uid());
  v_existing uuid;
  v_sponsor uuid;
  v_minor   boolean := p_birth_date > (current_date - interval '18 years')::date;
  v_id      uuid;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_birth_date is null or p_birth_date > current_date then
    raise exception 'Invalid birth date' using errcode = '22023';
  end if;
  select c.id into v_existing from public.citizens c where c.profile_id = v_uid;
  if v_existing is not null then return v_existing; end if;

  if v_minor then
    select c.id into v_sponsor from public.citizens c
    where c.cin_number = p_sponsor_cin and not c.is_minor and c.kyc_status = 'verified' and c.deleted_at is null;
    if v_sponsor is null then
      raise exception 'A minor needs a verified adult sponsor (valid CIN)' using errcode = '23514';
    end if;
  end if;

  insert into public.citizens (profile_id, sector_id, birth_date, sponsor_citizen_id, kyc_status, consent_terms_at, consent_data_at)
  values (v_uid, p_sector_id, p_birth_date, v_sponsor, case when v_minor then 'verified' else 'none' end::public.kyc_status, now(), now())
  returning id into v_id;
  return v_id;
end;
$$;

-- Soumet le CIN : le « modèle » (format NT-CIN-######) décide ; un administrateur peut corriger la décision.
create or replace function public.submit_cin_verification(p_cin text, p_image_path text default null)
returns public.validation_status language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_citizen public.citizens%rowtype;
  v_ok boolean := public.cin_matches_model(p_cin);
begin
  if v_uid is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into v_citizen from public.citizens where profile_id = v_uid and deleted_at is null;
  if v_citizen.id is null then raise exception 'Complete your citizen profile first' using errcode = '23514'; end if;
  if v_citizen.is_minor then raise exception 'Minors are verified through their sponsor' using errcode = '23514'; end if;
  if v_citizen.kyc_status = 'verified' then raise exception 'Identity already verified' using errcode = '23514'; end if;
  if v_ok and exists (select 1 from public.citizens c where c.cin_number = p_cin and c.id <> v_citizen.id) then
    raise exception 'This CIN is already used' using errcode = '23505';
  end if;

  perform set_config('app.bypass_guard', '1', true);
  if v_ok then
    update public.citizens set cin_number = p_cin, kyc_status = 'verified' where id = v_citizen.id;
  else
    update public.citizens set kyc_status = 'rejected' where id = v_citizen.id;
  end if;
  perform set_config('app.bypass_guard', '', true);

  insert into public.citizen_verifications (citizen_id, cin_image_path, ai_model, ai_score, ai_extracted, status, rejection_reason, decided_at)
  values (v_citizen.id, p_image_path, 'cin-format-model-v1', case when v_ok then 0.92 else 0.20 end,
          jsonb_build_object('cin', p_cin, 'match', v_ok),
          case when v_ok then 'validated' else 'rejected' end::public.validation_status,
          case when v_ok then null else 'Le document ne correspond pas au modèle de CIN de Nova Terra.' end, now());
  return case when v_ok then 'validated' else 'rejected' end::public.validation_status;
end;
$$;

-- Décision manuelle d'un administrateur sur une vérification
create or replace function public.decide_cin_verification(p_verification_id uuid, p_approve boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_citizen uuid;
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  update public.citizen_verifications
  set status = case when p_approve then 'validated' else 'rejected' end::public.validation_status,
      reviewed_by = (select auth.uid()), rejection_reason = case when p_approve then null else p_reason end, decided_at = now()
  where id = p_verification_id returning citizen_id into v_citizen;
  if v_citizen is null then raise exception 'Verification not found' using errcode = 'P0002'; end if;
  perform set_config('app.bypass_guard', '1', true);
  update public.citizens set kyc_status = case when p_approve then 'verified' else 'rejected' end::public.kyc_status where id = v_citizen;
  perform set_config('app.bypass_guard', '', true);
end;
$$;

-- Le dernier accès est mis à jour par l'application après connexion
create or replace function public.touch_last_login()
returns void language sql security definer set search_path = '' as $$
  update public.profiles set last_login_at = now() where id = (select auth.uid());
$$;

revoke all on function
  public.complete_citizen_profile(date, uuid, text), public.submit_cin_verification(text, text),
  public.decide_cin_verification(uuid, boolean, text), public.touch_last_login()
from public, anon;
grant execute on function
  public.complete_citizen_profile(date, uuid, text), public.submit_cin_verification(text, text),
  public.decide_cin_verification(uuid, boolean, text), public.touch_last_login()
to authenticated;
grant execute on function public.cin_matches_model(text) to anon, authenticated;
