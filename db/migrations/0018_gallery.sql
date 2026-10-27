-- ════════════════════════════════════════════════════════════════════════════
-- HM Maths LMS · 0018 — photo gallery. Safe to re-run.
--  Albums (class / function / group photo / trip / other) with photos in the public 'gallery' bucket.
--  Anyone can look at published albums; admins, owners and developers add and remove.
-- ════════════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('gallery', 'gallery', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "gallery public read" on storage.objects;
create policy "gallery public read" on storage.objects for select to anon, authenticated using (bucket_id = 'gallery');
drop policy if exists "gallery staff insert" on storage.objects;
create policy "gallery staff insert" on storage.objects for insert to authenticated with check (bucket_id = 'gallery' and public.is_admin());
drop policy if exists "gallery staff update" on storage.objects;
create policy "gallery staff update" on storage.objects for update to authenticated using (bucket_id = 'gallery' and public.is_admin());
drop policy if exists "gallery staff delete" on storage.objects;
create policy "gallery staff delete" on storage.objects for delete to authenticated using (bucket_id = 'gallery' and public.is_admin());

create table if not exists public.gallery_albums (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 2 and 120),
  category     text not null default 'class' check (category in ('class', 'function', 'group', 'trip', 'other')),
  taken_on     date,
  description  text,
  is_published boolean not null default true,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);
create table if not exists public.gallery_photos (
  id         uuid primary key default gen_random_uuid(),
  album_id   uuid not null references public.gallery_albums (id) on delete cascade,
  path       text not null,
  caption    text,
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists gallery_albums_list   on public.gallery_albums (is_published, taken_on desc nulls last, created_at desc);
create index if not exists gallery_photos_album  on public.gallery_photos (album_id, sort_order, created_at);

alter table public.gallery_albums enable row level security;
alter table public.gallery_photos enable row level security;

drop policy if exists "gallery albums read" on public.gallery_albums;
create policy "gallery albums read" on public.gallery_albums for select to anon, authenticated using (is_published or public.is_admin());
drop policy if exists "gallery albums staff write" on public.gallery_albums;
create policy "gallery albums staff write" on public.gallery_albums for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "gallery photos read" on public.gallery_photos;
create policy "gallery photos read" on public.gallery_photos for select to anon, authenticated
  using (public.is_admin() or exists (select 1 from public.gallery_albums a where a.id = album_id and a.is_published));
drop policy if exists "gallery photos staff write" on public.gallery_photos;
create policy "gallery photos staff write" on public.gallery_photos for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.gallery_albums, public.gallery_photos to anon, authenticated;
grant insert, update, delete on public.gallery_albums, public.gallery_photos to authenticated;
