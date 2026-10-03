-- ============================================================================
-- NOVA TERRA — 05 : buckets Storage + policies
-- Source de vérité : docs/PLAN.md §3.7. Chemins : <user_id>/... (dossier propriétaire).
-- request-attachments : <requester_id>/<request_id>/<fichier>
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('cin-documents',       'cin-documents',       false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf']),
  ('report-evidence',     'report-evidence',     false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf']),
  ('request-attachments', 'request-attachments', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf']),
  ('news-media',          'news-media',          true,  5242880, array['image/jpeg','image/png','image/webp']),
  ('avatars',             'avatars',             true,  2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Propriétaire : écriture/lecture dans son dossier (cin, preuves, pièces jointes)
do $$
declare b text;
begin
  foreach b in array array['cin-documents', 'report-evidence', 'request-attachments'] loop
    execute format('drop policy if exists "%s_owner_select" on storage.objects', b);
    execute format($p$create policy "%s_owner_select" on storage.objects for select to authenticated
      using (bucket_id = %L and (storage.foldername(name))[1] = (select auth.uid())::text)$p$, b, b);
    execute format('drop policy if exists "%s_owner_insert" on storage.objects', b);
    execute format($p$create policy "%s_owner_insert" on storage.objects for insert to authenticated
      with check (bucket_id = %L and (storage.foldername(name))[1] = (select auth.uid())::text)$p$, b, b);
    execute format('drop policy if exists "%s_admin_select" on storage.objects', b);
    execute format($p$create policy "%s_admin_select" on storage.objects for select to authenticated
      using (bucket_id = %L and (select public.is_admin()))$p$, b, b);
  end loop;
end
$$;

-- Agents : lisent les preuves (non caméra/satellite) et pièces de leur service
drop policy if exists "report-evidence_staff_select" on storage.objects;
create policy "report-evidence_staff_select" on storage.objects for select to authenticated
  using (
    bucket_id = 'report-evidence' and exists (
      select 1 from public.report_evidence e join public.reports r on r.id = e.report_id
      where e.file_path = name
        and ((e.source in ('citizen', 'agent', 'api') and (select public.is_service_member(r.service_id)))
          or (e.source in ('camera', 'satellite') and (select public.can_manage_service(r.service_id))))
    )
  );

drop policy if exists "request-attachments_staff_select" on storage.objects;
create policy "request-attachments_staff_select" on storage.objects for select to authenticated
  using (
    bucket_id = 'request-attachments' and exists (
      select 1 from public.requests r
      where r.id::text = (storage.foldername(name))[2] and (select public.is_service_member(r.service_id))
    )
  );

-- Médias publics : lecture libre ; actualités = admins ; avatars = propriétaire
drop policy if exists "news-media_public_read" on storage.objects;
create policy "news-media_public_read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'news-media');
drop policy if exists "news-media_admin_write" on storage.objects;
create policy "news-media_admin_write" on storage.objects for all to authenticated
  using (bucket_id = 'news-media' and (select public.is_admin()))
  with check (bucket_id = 'news-media' and (select public.is_admin()));

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatars');
drop policy if exists "avatars_owner_write" on storage.objects;
create policy "avatars_owner_write" on storage.objects for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
