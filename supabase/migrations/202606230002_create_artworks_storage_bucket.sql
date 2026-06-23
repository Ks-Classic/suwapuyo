insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'artworks',
  'artworks',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "event anon can read artwork images" on storage.objects;
create policy "event anon can read artwork images"
on storage.objects for select
to anon
using (bucket_id = 'artworks');

drop policy if exists "event anon can upload artwork images" on storage.objects;
create policy "event anon can upload artwork images"
on storage.objects for insert
to anon
with check (bucket_id = 'artworks');

drop policy if exists "event anon can update artwork images" on storage.objects;
create policy "event anon can update artwork images"
on storage.objects for update
to anon
using (bucket_id = 'artworks')
with check (bucket_id = 'artworks');
