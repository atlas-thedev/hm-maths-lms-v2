-- ════════════════════════════════════════════════════════════════════════════
-- HM Maths LMS · 0013 — Recovery e-mail, password-reset codes, attendance (PLAN.md Part 10). Safe to re-run.
--  1. profiles.recovery_email — optional; a Forgot-password code can be sent there (besides SMS).
--  2. password_resets — one-time 6-digit codes (stored hashed). Server-only: no student or admin access
--     through the API; the app reads and writes it with its own server connection.
--  3. attendance — one check-in per student per day (QR scan or manual), written by admins.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles add column if not exists recovery_email text;
alter table public.profiles drop constraint if exists profiles_recovery_email;
alter table public.profiles add  constraint profiles_recovery_email
  check (recovery_email is null or (char_length(recovery_email) <= 254 and recovery_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'));

create table if not exists public.password_resets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  code_hash  text not null,
  channels   text[] not null default '{}',
  expires_at timestamptz not null,
  attempts   int not null default 0,
  used_at    timestamptz,
  ip         text,
  created_at timestamptz not null default now()
);
create index if not exists password_resets_user_idx on public.password_resets (user_id, created_at desc);
alter table public.password_resets enable row level security;
revoke all on public.password_resets from anon, authenticated;

create table if not exists public.attendance (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  day        date not null default ((now() at time zone 'Asia/Colombo')::date),
  scanned_at timestamptz not null default now(),
  scanned_by uuid references public.profiles (id) on delete set null,
  class_id   uuid references public.classes (id) on delete set null,
  method     text not null default 'qr' check (method in ('qr', 'manual')),
  unique (student_id, day)
);
create index if not exists attendance_day_idx on public.attendance (day desc, scanned_at desc);
alter table public.attendance enable row level security;

drop policy if exists "attendance read own or admin" on public.attendance;
create policy "attendance read own or admin" on public.attendance for select to authenticated
  using (student_id = auth.uid() or public.is_admin());
drop policy if exists "attendance admin write" on public.attendance;
create policy "attendance admin write" on public.attendance for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.attendance to authenticated;
