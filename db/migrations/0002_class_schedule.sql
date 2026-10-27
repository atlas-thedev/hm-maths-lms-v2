-- ════════════════════════════════════════════════════════════════════════════
-- HM Maths LMS · 0002 — Class schedules, extra classes & private live links
--
-- Applied after 0001_init.sql by deploy/update.sh.
-- Safe to re-run.
--
-- What it does
--   1. classes  + weekly timetable: schedule_days (0=Sun … 6=Sat), start_time, duration_minutes
--   2. lessons  + session_type ('regular' | 'extra'), duration_minutes, is_cancelled
--   3. NEW class_live_defaults  – the class's usual live link (YouTube Live / Zoom / Meet), admin-only
--   4. NEW lesson_live_links    – each session's live link. Students can read it ONLY while the
--                                 join window is open (20 min before start → end + 30 min) and
--                                 only if they have access to that class month. Existing
--                                 lessons.live_url values are moved here and the column is dropped,
--                                 so the link can no longer be read early through the API.
--   5. generate_class_sessions(class, month, title) – creates every weekly session of a month
--                                 from the timetable (skips days that already have a session).
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Weekly timetable on classes ─────────────────────────────────────────
alter table public.classes add column if not exists schedule_days    smallint[] not null default '{}';
alter table public.classes add column if not exists start_time       time;
alter table public.classes add column if not exists duration_minutes int not null default 120;

alter table public.classes drop constraint if exists classes_schedule_days_check;
alter table public.classes add  constraint classes_schedule_days_check
  check (schedule_days <@ array[0,1,2,3,4,5,6]::smallint[]);
alter table public.classes drop constraint if exists classes_duration_check;
alter table public.classes add  constraint classes_duration_check
  check (duration_minutes between 15 and 600);

-- ─── 2. Session details on lessons ──────────────────────────────────────────
alter table public.lessons add column if not exists session_type     text not null default 'regular';
alter table public.lessons add column if not exists duration_minutes int;
alter table public.lessons add column if not exists is_cancelled     boolean not null default false;

alter table public.lessons drop constraint if exists lessons_session_type_check;
alter table public.lessons add  constraint lessons_session_type_check
  check (session_type in ('regular', 'extra'));
alter table public.lessons drop constraint if exists lessons_duration_check;
alter table public.lessons add  constraint lessons_duration_check
  check (duration_minutes is null or duration_minutes between 15 and 600);

create index if not exists lessons_class_live_idx on public.lessons (class_id, live_start_time);

-- ─── 3. Default live link per class (admin only) ────────────────────────────
create table if not exists public.class_live_defaults (
  class_id   uuid primary key references public.classes (id) on delete cascade,
  live_url   text not null check (live_url ~ '^https://'),
  updated_at timestamptz not null default now()
);
alter table public.class_live_defaults enable row level security;
drop policy if exists "class_live_defaults admin" on public.class_live_defaults;
create policy "class_live_defaults admin" on public.class_live_defaults for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ─── 4. Private live link per session ───────────────────────────────────────
create table if not exists public.lesson_live_links (
  lesson_id  uuid primary key references public.lessons (id) on delete cascade,
  live_url   text not null check (live_url ~ '^https://'),
  updated_at timestamptz not null default now()
);
alter table public.lesson_live_links enable row level security;

-- Is the join window of this session open for the current user right now?
create or replace function public.live_window_open(p_lesson uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.lessons l
    join public.classes c on c.id = l.class_id
    where l.id = p_lesson
      and not l.is_cancelled
      and l.live_start_time is not null
      and now() >= l.live_start_time - interval '20 minutes'
      and now() <  l.live_start_time
                   + make_interval(mins => coalesce(l.duration_minutes, c.duration_minutes, 120) + 30)
      and public.has_class_access(l.class_id, l.month)
  );
$$;

drop policy if exists "lesson_live_links admin" on public.lesson_live_links;
create policy "lesson_live_links admin" on public.lesson_live_links for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "lesson_live_links read when open" on public.lesson_live_links;
create policy "lesson_live_links read when open" on public.lesson_live_links for select to authenticated
  using (public.live_window_open(lesson_id));

-- Move existing links out of lessons, then drop the readable column.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'lessons' and column_name = 'live_url') then
    insert into public.lesson_live_links (lesson_id, live_url)
    select id, live_url from public.lessons where live_url ~ '^https://'
    on conflict (lesson_id) do nothing;
    alter table public.lessons drop column live_url;
  end if;
end $$;

-- ─── 5. Generate a month of weekly sessions from the timetable ──────────────
create or replace function public.generate_class_sessions(p_class uuid, p_month text, p_title text default null)
returns int language plpgsql security definer set search_path = public as $$
declare
  c       public.classes%rowtype;
  v_link  text;
  v_first date;
  d       date;
  v_start timestamptz;
  v_id    uuid;
  v_count int := 0;
begin
  if not public.is_admin() then raise exception 'Only admins can generate sessions'; end if;
  if p_month !~ '^\d{4}-(0[1-9]|1[0-2])$' then raise exception 'Invalid month'; end if;
  c := (select cl from public.classes cl where cl.id = p_class);
  if c.id is null then raise exception 'Class not found'; end if;
  if coalesce(array_length(c.schedule_days, 1), 0) = 0 or c.start_time is null then
    raise exception 'Set the class days and start time first';
  end if;
  select live_url into v_link from public.class_live_defaults where class_id = p_class;

  v_first := to_date(p_month || '-01', 'YYYY-MM-DD');
  for d in select gs::date from generate_series(v_first, (v_first + interval '1 month - 1 day')::date, interval '1 day') gs loop
    continue when not (extract(dow from d)::smallint = any (c.schedule_days));
    -- Sri Lanka is UTC+05:30 all year (no DST)
    v_start := ((d + c.start_time) - interval '5 hours 30 minutes') at time zone 'UTC';
    continue when exists (
      select 1 from public.lessons l
      where l.class_id = p_class and l.live_start_time is not null
        and ((l.live_start_time at time zone 'UTC') + interval '5 hours 30 minutes')::date = d
    );
    insert into public.lessons (class_id, month, week_number, title, live_start_time, session_type, sort_order)
    values (p_class, p_month, least(6, ceil(extract(day from d) / 7.0)::int),
            coalesce(nullif(trim(p_title), ''), 'Live class') || ' · ' || to_char(d, 'Dy DD Mon'),
            v_start, 'regular', extract(day from d)::int)
    returning id into v_id;
    if v_link is not null then
      insert into public.lesson_live_links (lesson_id, live_url) values (v_id, v_link);
    end if;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ─── Grants ─────────────────────────────────────────────────────────────────
grant select, insert, update, delete on public.class_live_defaults, public.lesson_live_links to authenticated;
revoke all on function public.generate_class_sessions(uuid, text, text) from public, anon;
grant execute on function public.generate_class_sessions(uuid, text, text) to authenticated;
grant execute on function public.live_window_open(uuid) to authenticated;
