-- ════════════════════════════════════════════════════════════════════════════
-- HM Maths LMS · 0017 — video_events. Safe to re-run.
--  Who opened which recording (kind 'play'), and flags raised by the player:
--  'tamper' (watermark removed/hidden), 'devtools' (developer tools opened while watching),
--  'limit' (too many different recordings opened within an hour).
--  Written by the server only (service role); owners/developers may read.
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.video_events (
  id         bigint generated always as identity primary key,
  student_id uuid references public.profiles (id) on delete cascade,
  lesson_id  uuid references public.lessons (id) on delete set null,
  kind       text not null check (kind in ('play', 'tamper', 'devtools', 'limit')),
  ip         text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists video_events_student_time on public.video_events (student_id, created_at desc);
create index if not exists video_events_kind_time    on public.video_events (kind, created_at desc);

alter table public.video_events enable row level security;
drop policy if exists "video_events owner read" on public.video_events;
create policy "video_events owner read" on public.video_events for select to authenticated using (public.is_owner());
