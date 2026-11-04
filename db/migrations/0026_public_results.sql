-- Public student results and the rotating teacher portraits. Safe to re-run.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('public-results', 'public-results', true, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public results images read" on storage.objects;
create policy "public results images read" on storage.objects for select to anon, authenticated using (bucket_id = 'public-results');
drop policy if exists "public results images insert" on storage.objects;
create policy "public results images insert" on storage.objects for insert to authenticated with check (bucket_id = 'public-results' and public.is_developer());
drop policy if exists "public results images update" on storage.objects;
create policy "public results images update" on storage.objects for update to authenticated using (bucket_id = 'public-results' and public.is_developer()) with check (bucket_id = 'public-results' and public.is_developer());
drop policy if exists "public results images delete" on storage.objects;
create policy "public results images delete" on storage.objects for delete to authenticated using (bucket_id = 'public-results' and public.is_developer());

create table if not exists public.teacher_portraits (
  id uuid primary key default gen_random_uuid(),
  photo_url text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.student_results (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  exam_year integer not null check (exam_year between 1900 and 2100),
  exam_number text not null check (char_length(exam_number) between 1 and 40),
  grades text not null check (char_length(grades) between 1 and 80),
  distinction text not null default '' check (char_length(distinction) <= 120),
  photo_url text not null default '',
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.teacher_portraits enable row level security;
alter table public.student_results enable row level security;
drop policy if exists "teacher portraits read" on public.teacher_portraits;
create policy "teacher portraits read" on public.teacher_portraits for select to anon, authenticated using (true);
drop policy if exists "teacher portraits developer write" on public.teacher_portraits;
create policy "teacher portraits developer write" on public.teacher_portraits for all to authenticated using (public.is_developer()) with check (public.is_developer());
drop policy if exists "student results read" on public.student_results;
create policy "student results read" on public.student_results for select to anon, authenticated using (is_published or public.is_developer());
drop policy if exists "student results developer write" on public.student_results;
create policy "student results developer write" on public.student_results for all to authenticated using (public.is_developer()) with check (public.is_developer());
grant select on public.teacher_portraits, public.student_results to anon, authenticated;
grant insert, update, delete on public.teacher_portraits, public.student_results to authenticated;
