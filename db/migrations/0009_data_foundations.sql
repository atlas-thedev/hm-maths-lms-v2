-- ════════════════════════════════════════════════════════════════════════════
-- HM Maths LMS · 0009 — Data foundations (PLAN.md Part 2). Safe to re-run.
--  1. Student ID → 8 digits "YYYY" + 4 digits (HM-MATHS-2027-1234 → 20271234); existing IDs converted.
--  2. profiles + attempt (1st / 2nd / 3rd), whatsapp, guardian_mobile, avatar_path.
--  3. Private "avatars" bucket: "<uid>/<file>.(jpg|jpeg|png|webp)", owner + admins.
--  4. NEW notifications (per student, read/unread) + automatic ones for payment review and tute delivery.
--  5. NEW events (admin-created; students see published ones for their class / batch).
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Student ID ──────────────────────────────────────────────────────────
create or replace function public.generate_student_id(p_year int)
returns text language plpgsql volatile set search_path = public as $$
declare
  candidate text;
  attempts  int := 0;
begin
  loop
    candidate := coalesce(p_year, extract(year from now())::int)::text
                 || lpad((1000 + floor(float8mul(random(), 9000)))::int::text, 4, '0');
    exit when not exists (select 1 from public.profiles where student_id = candidate);
    attempts := attempts + 1;
    if attempts > 500 then raise exception 'Could not allocate a unique student id'; end if;
  end loop;
  return candidate;
end;
$$;
revoke all on function public.generate_student_id(int) from public, anon, authenticated;

-- Keeps each student's year + 4 digits. Old IDs were unique, so the new ones are too.
update public.profiles
   set student_id = regexp_replace(student_id, '^HM-MATHS-(\d{4})-(\d{4})$', '\1\2')
 where student_id ~ '^HM-MATHS-\d{4}-\d{4}$';

-- ─── 2. Profile fields ──────────────────────────────────────────────────────
alter table public.profiles add column if not exists attempt         smallint not null default 1;
alter table public.profiles add column if not exists whatsapp        text;
alter table public.profiles add column if not exists guardian_mobile text;
alter table public.profiles add column if not exists avatar_path     text;
alter table public.profiles drop constraint if exists profiles_attempt_range;
alter table public.profiles add  constraint profiles_attempt_range check (attempt between 1 and 3);
alter table public.profiles drop constraint if exists profiles_extra_phones;
alter table public.profiles add  constraint profiles_extra_phones
  check ((whatsapp is null or whatsapp ~ '^07\d{8}$') and (guardian_mobile is null or guardian_mobile ~ '^07\d{8}$'));
alter table public.profiles drop constraint if exists profiles_avatar_path;
alter table public.profiles add  constraint profiles_avatar_path
  check (avatar_path is null or avatar_path ~ ('^' || id::text || '/[A-Za-z0-9_.-]{1,100}\.(jpg|jpeg|png|webp)$'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta      jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_admin   boolean := exists (select 1 from public.admin_emails a where lower(a.email) = lower(new.email));
  v_year    int := nullif(meta->>'al_year', '')::int;
  v_attempt int := case when meta->>'attempt' in ('1','2','3') then (meta->>'attempt')::int else 1 end;
begin
  insert into public.profiles (id, full_name, mobile, nic, al_year, attempt, whatsapp, guardian_mobile, town, school, district,
                               address, city, postal_code, role, student_id)
  values (
    new.id,
    coalesce(nullif(meta->>'full_name', ''), split_part(new.email, '@', 1)),
    nullif(meta->>'mobile', ''),
    nullif(upper(meta->>'nic'), ''),
    v_year,
    v_attempt,
    case when meta->>'whatsapp' ~ '^07\d{8}$' then meta->>'whatsapp' end,
    case when meta->>'guardian_mobile' ~ '^07\d{8}$' then meta->>'guardian_mobile' end,
    coalesce(nullif(meta->>'town', ''), 'Online'),
    nullif(meta->>'school', ''),
    nullif(meta->>'district', ''),
    nullif(left(meta->>'address', 300), ''),
    nullif(left(meta->>'city', 80), ''),
    nullif(left(meta->>'postal_code', 12), ''),
    case when v_admin then 'admin' else 'student' end,
    case when v_admin then null else public.generate_student_id(v_year) end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Students may edit whatsapp / guardian_mobile / avatar_path; attempt (like exam year) is admin-only.
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role       := old.role;
    new.student_id := old.student_id;
    new.mobile     := old.mobile;
    new.nic        := old.nic;
    new.al_year    := old.al_year;
    new.attempt    := old.attempt;
    new.id         := old.id;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- ─── 3. Profile photos ──────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', false, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars own insert" on storage.objects;
create policy "avatars own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and split_part(name, '/', 1) = auth.uid()::text
              and name ~ '^[0-9a-f-]{36}/[A-Za-z0-9_.-]{1,100}\.(jpg|jpeg|png|webp)$');
drop policy if exists "avatars own or admin read" on storage.objects;
create policy "avatars own or admin read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (split_part(name, '/', 1) = auth.uid()::text or public.is_admin()));
drop policy if exists "avatars own or admin delete" on storage.objects;
create policy "avatars own or admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (split_part(name, '/', 1) = auth.uid()::text or public.is_admin()));

-- ─── 4. Notifications ───────────────────────────────────────────────────────
-- kind: payment_approved / payment_rejected (class fee), order_approved / order_rejected / order_shipped
-- (tute books), update (site update from the admin). Text is built from `data` in the UI (both languages);
-- `title` / `body` are only used for admin-written updates.
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       text not null check (kind in ('payment_approved','payment_rejected','order_approved','order_rejected','order_shipped','update')),
  title      text check (char_length(coalesce(title, '')) <= 160),
  body       text check (char_length(coalesce(body, '')) <= 2000),
  link       text check (link is null or link ~ '^/[A-Za-z0-9/_?=&#.-]*$'),
  data       jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (user_id) where read_at is null;
alter table public.notifications enable row level security;

drop policy if exists "notifications read own or admin" on public.notifications;
create policy "notifications read own or admin" on public.notifications for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "notifications admin write" on public.notifications;
create policy "notifications admin write" on public.notifications for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Students mark their own notifications read (all when p_ids is null).
create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns int language plpgsql volatile security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  update public.notifications set read_at = now()
   where user_id = auth.uid() and read_at is null and (p_ids is null or id = any(p_ids));
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Site update for every student (optionally one batch).
create or replace function public.broadcast_update(p_title text, p_body text, p_link text default null, p_year int default null)
returns int language plpgsql volatile security definer set search_path = public as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  insert into public.notifications (user_id, kind, title, body, link)
  select id, 'update', p_title, p_body, p_link from public.profiles
   where role = 'student' and (p_year is null or al_year = p_year);
  get diagnostics n = row_count;
  return n;
end;
$$;

create or replace function public.notify_enrollment_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('approved','rejected') and new.status is distinct from old.status then
    insert into public.notifications (user_id, kind, link, data)
    select new.student_id, 'payment_' || new.status, '/dashboard/payments',
           jsonb_build_object('enrollment_id', new.id, 'class_id', new.class_id, 'class', c.title,
                              'month', new.month, 'note', new.admin_note)
      from public.classes c where c.id = new.class_id;
  end if;
  return null;
end;
$$;
drop trigger if exists enrollments_notify on public.enrollments;
create trigger enrollments_notify after update on public.enrollments
  for each row execute function public.notify_enrollment_review();

create or replace function public.notify_order_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('approved','rejected','shipped') and new.status is distinct from old.status then
    insert into public.notifications (user_id, kind, link, data)
    select new.student_id, 'order_' || new.status, '/dashboard/payments',
           jsonb_build_object('order_id', new.id, 'product', p.title, 'note', new.admin_note)
      from public.products p where p.id = new.product_id;
  end if;
  return null;
end;
$$;
drop trigger if exists orders_notify on public.orders;
create trigger orders_notify after update on public.orders
  for each row execute function public.notify_order_review();

-- ─── 5. Events ──────────────────────────────────────────────────────────────
-- Seminars, paper days, exam dates, parent meetings… Poster: "events/…" in the public "class-banners" bucket.
create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 2 and 160),
  description  text check (char_length(coalesce(description, '')) <= 4000),
  starts_at    timestamptz not null,
  ends_at      timestamptz,
  venue        text check (char_length(coalesce(venue, '')) <= 200),
  online_url   text check (online_url is null or online_url ~ '^https://\S+$'),
  poster_url   text,
  class_id     uuid references public.classes (id) on delete set null,
  target_year  int check (target_year between 2020 and 2040),
  is_published boolean not null default true,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint events_end_after_start check (ends_at is null or ends_at >= starts_at)
);
create index if not exists events_starts_idx on public.events (starts_at);
drop trigger if exists events_updated_at on public.events;
create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();
alter table public.events enable row level security;

drop policy if exists "events read" on public.events;
create policy "events read" on public.events for select to authenticated
  using (public.is_admin() or (
    is_published
    and (class_id is null or public.has_class_access(class_id, null))
    and (target_year is null or target_year = public.my_al_year())
  ));
drop policy if exists "events admin write" on public.events;
create policy "events admin write" on public.events for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ─── Grants ─────────────────────────────────────────────────────────────────
grant select, insert, update, delete on public.notifications, public.events to authenticated;
revoke all on function public.mark_notifications_read(uuid[]), public.broadcast_update(text, text, text, int) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]), public.broadcast_update(text, text, text, int) to authenticated;
revoke all on function public.notify_enrollment_review(), public.notify_order_review() from public, anon, authenticated;
