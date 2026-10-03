insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hero-assets',
  'hero-assets',
  true,
  26214400,
  array['video/webm', 'video/mp4', 'image/webp', 'image/png', 'model/gltf-binary']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "hero-assets_public_read" on storage.objects;
create policy "hero-assets_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'hero-assets');
