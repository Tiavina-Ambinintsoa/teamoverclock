-- Décision admin sur une vérification CIN : renseigne aussi le numéro de CIN (extrait de la demande)
-- lors d'une validation manuelle d'une demande refusée par le modèle, et refuse les doublons.
create or replace function public.decide_cin_verification(p_verification_id uuid, p_approve boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_citizen uuid;
  v_cin text;
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  if not p_approve and (p_reason is null or char_length(btrim(p_reason)) = 0) then
    raise exception 'A reason is required to reject' using errcode = '23514';
  end if;

  select citizen_id, nullif(btrim(ai_extracted ->> 'cin'), '') into v_citizen, v_cin
  from public.citizen_verifications where id = p_verification_id;
  if v_citizen is null then raise exception 'Verification not found' using errcode = 'P0002'; end if;

  if p_approve and v_cin is not null and exists (
    select 1 from public.citizens c where c.cin_number = v_cin and c.id <> v_citizen
  ) then
    raise exception 'This CIN is already used' using errcode = '23505';
  end if;

  update public.citizen_verifications
  set status = case when p_approve then 'validated' else 'rejected' end::public.validation_status,
      reviewed_by = (select auth.uid()),
      rejection_reason = case when p_approve then null else p_reason end,
      decided_at = now()
  where id = p_verification_id;

  perform set_config('app.bypass_guard', '1', true);
  update public.citizens
  set kyc_status = case when p_approve then 'verified' else 'rejected' end::public.kyc_status,
      cin_number = case when p_approve then coalesce(cin_number, v_cin) else cin_number end
  where id = v_citizen;
  perform set_config('app.bypass_guard', '', true);
end;
$$;

revoke all on function public.decide_cin_verification(uuid, boolean, text) from public, anon;
grant execute on function public.decide_cin_verification(uuid, boolean, text) to authenticated;
