-- =============================================================================
--  Hasitha Madusanka · Combined Maths LMS — database schema (v1)
--  Applied by deploy/update.sh (after deploy/00_bootstrap.sql).
--  Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS.
-- =============================================================================

-- gen_random_uuid() is built into PostgreSQL 13+ (no extension needed)

-- -----------------------------------------------------------------------------
-- 0. Admin allow-list (users signing up with these emails become admins)
-- -----------------------------------------------------------------------------
create table if not exists public.admin_emails (
  email text primary key
);
-- Seeded only on a fresh database (before profiles exists). Deploys re-run this file, and
-- re-seeding would undo an admin removing this address or demoting that account.
insert into public.admin_emails (email)
select 'admin@nativelaunch.xyz' where to_regclass('public.profiles') is null
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- 1. Tables
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null,
  mobile      text unique,
  nic         text unique,
  al_year     int check (al_year between 2020 and 2040),
  town        text not null default 'Online'
              check (town in ('Panadura','Horana','Mathugama','Kalutara','Online')),
  school      text,
  district    text,
  student_id  text unique,
  role        text not null default 'student' check (role in ('student','admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.classes (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  class_type  text not null default 'Theory'
              check (class_type in ('Theory','Revision','Paper Class','Extra Class','Free Seminar')),
  target_year int  check (target_year between 2020 and 2040),
  town        text check (town in ('Panadura','Horana','Mathugama','Kalutara','Online')),
  fee         numeric(10,2) not null default 0 check (fee >= 0),
  schedule    text,
  banner_url  text,
  is_active   boolean not null default true,
  is_free     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint free_has_no_fee check (not is_free or fee = 0)
);

create table if not exists public.lessons (
  id              uuid primary key default gen_random_uuid(),
  class_id        uuid not null references public.classes (id) on delete cascade,
  month           text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  week_number     int  not null default 1 check (week_number between 1 and 6),
  title           text not null,
  description     text,
  youtube_url     text,
  tute_pdf_url    text,          -- storage path inside the "tute-pdfs" bucket
  live_start_time timestamptz,
  live_url        text,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists lessons_class_month_idx on public.lessons (class_id, month, week_number);

create table if not exists public.enrollments (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles (id) on delete cascade,
  class_id    uuid not null references public.classes (id) on delete cascade,
  month       text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  slip_url    text,              -- storage path inside the "bank-slips" bucket
  amount      numeric(10,2),
  bank_ref    text,
  admin_note  text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (student_id, class_id, month)
);
create index if not exists enrollments_status_idx on public.enrollments (status, created_at desc);

create table if not exists public.notices (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  content     text not null,
  tag         text not null default 'General' check (tag in ('General','Urgent','Exam Notice')),
  is_pinned   boolean not null default false,
  class_id    uuid references public.classes (id) on delete cascade,   -- null = everyone
  target_year int,                                                      -- null = all batches
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.exams (
  id               uuid primary key default gen_random_uuid(),
  class_id         uuid not null references public.classes (id) on delete cascade,
  title            text not null,
  description      text,
  exam_type        text not null default 'mcq' check (exam_type in ('mcq','structured')),
  duration_minutes int  not null default 60 check (duration_minutes between 1 and 600),
  total_questions  int  not null default 0,
  paper_pdf_url    text,         -- storage path inside "tute-pdfs" (structured papers)
  opens_at         timestamptz,
  closes_at        timestamptz,
  is_published     boolean not null default false,
  created_at       timestamptz not null default now()
);

create table if not exists public.exam_questions (
  id             uuid primary key default gen_random_uuid(),
  exam_id        uuid not null references public.exams (id) on delete cascade,
  question_text  text not null,
  options_json   jsonb not null check (jsonb_typeof(options_json) = 'array' and jsonb_array_length(options_json) between 2 and 6),
  correct_answer int  not null check (correct_answer >= 0),
  marks          numeric(6,2) not null default 1,
  explanation    text,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now()
);

create table if not exists public.exam_submissions (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid not null references public.profiles (id) on delete cascade,
  exam_id           uuid not null references public.exams (id) on delete cascade,
  score             numeric(8,2),
  total_marks       numeric(8,2),
  answers_json      jsonb not null default '{}'::jsonb,
  answer_sheet_urls text[] not null default '{}',
  status            text not null default 'in_progress' check (status in ('in_progress','submitted','graded')),
  is_late           boolean not null default false,
  feedback          text,
  started_at        timestamptz not null default now(),
  submitted_at      timestamptz,
  graded_at         timestamptz,
  unique (student_id, exam_id)
);

create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  product_type text not null default 'tute_book' check (product_type in ('tute_book','other')),
  price        numeric(10,2) not null default 0 check (price >= 0),
  image_url    text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references public.profiles (id) on delete cascade,
  product_id       uuid not null references public.products (id) on delete restrict,
  quantity         int not null default 1 check (quantity between 1 and 20),
  amount           numeric(10,2),
  delivery_address text not null,
  status           text not null default 'pending' check (status in ('pending','approved','rejected','shipped')),
  slip_url         text,
  admin_note       text,
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2. Helper functions (SECURITY DEFINER → no RLS recursion)
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.my_al_year()
returns int language sql stable security definer set search_path = public as $$
  select al_year from public.profiles where id = auth.uid();
$$;

-- Does the current user have access to a class (optionally a specific month)?
create or replace function public.has_class_access(p_class uuid, p_month text default null)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    public.is_admin()
    or exists (select 1 from public.classes c where c.id = p_class and c.is_free and c.is_active)
    or exists (
      select 1 from public.enrollments e
      where e.student_id = auth.uid() and e.class_id = p_class and e.status = 'approved'
        and (p_month is null or e.month = p_month)
    )
  );
$$;

-- Storage path rule for tute-pdfs: "<class_id>/<YYYY-MM>/<file>" or "<class_id>/<anything>/<file>"
create or replace function public.can_read_class_file(p_name text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  parts   text[] := string_to_array(p_name, '/');
  v_class uuid;
begin
  if public.is_admin() then return true; end if;
  begin
    v_class := parts[1]::uuid;
  exception when others then
    return false;
  end;
  if coalesce(array_length(parts, 1), 0) >= 3 and parts[2] ~ '^\d{4}-(0[1-9]|1[0-2])$' then
    return public.has_class_access(v_class, parts[2]);
  end if;
  return public.has_class_access(v_class, null);
end;
$$;

-- Student ID generator: HM-MATHS-<YEAR>-<4 digits>
create or replace function public.generate_student_id(p_year int)
returns text language plpgsql volatile set search_path = public as $$
declare
  candidate text;
  attempts  int := 0;
begin
  loop
    candidate := 'HM-MATHS-' || coalesce(p_year, extract(year from now())::int)::text || '-'
                 || lpad((1000 + floor(float8mul(random(), 9000)))::int::text, 4, '0');
    exit when not exists (select 1 from public.profiles where student_id = candidate);
    attempts := attempts + 1;
    if attempts > 500 then raise exception 'Could not allocate a unique student id'; end if;
  end loop;
  return candidate;
end;
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

-- -----------------------------------------------------------------------------
-- 3. Triggers
-- -----------------------------------------------------------------------------
-- 3a. Create a profile automatically for every new auth user
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta     jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_admin  boolean := exists (select 1 from public.admin_emails a where lower(a.email) = lower(new.email));
  v_year   int := nullif(meta->>'al_year', '')::int;
begin
  insert into public.profiles (id, full_name, mobile, nic, al_year, town, school, district, role, student_id)
  values (
    new.id,
    coalesce(nullif(meta->>'full_name', ''), split_part(new.email, '@', 1)),
    nullif(meta->>'mobile', ''),
    nullif(upper(meta->>'nic'), ''),
    v_year,
    coalesce(nullif(meta->>'town', ''), 'Online'),
    nullif(meta->>'school', ''),
    nullif(meta->>'district', ''),
    case when v_admin then 'admin' else 'student' end,
    case when v_admin then null else public.generate_student_id(v_year) end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3b. Students may not change protected profile fields
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role       := old.role;
    new.student_id := old.student_id;
    new.mobile     := old.mobile;
    new.nic        := old.nic;
    new.al_year    := old.al_year;
    new.id         := old.id;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_fields();

drop trigger if exists classes_updated_at on public.classes;
create trigger classes_updated_at before update on public.classes
  for each row execute function public.set_updated_at();

-- 3c. Enrollment guard: students can only (re)submit; admins review
create or replace function public.guard_enrollment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null and not public.is_admin() then
      new.status := 'pending'; new.reviewed_by := null; new.reviewed_at := null; new.admin_note := null;
      select fee into new.amount from public.classes where id = new.class_id;
    end if;
    return new;
  end if;
  -- UPDATE
  if auth.uid() is not null and not public.is_admin() then
    new.student_id := old.student_id; new.class_id := old.class_id; new.month := old.month;
    new.amount := old.amount; new.status := 'pending';
    new.reviewed_by := null; new.reviewed_at := null; new.admin_note := null;
    new.created_at := now();
  elsif new.status is distinct from old.status then
    new.reviewed_at := now();
    new.reviewed_by := coalesce(auth.uid(), old.reviewed_by);
  end if;
  return new;
end;
$$;
drop trigger if exists enrollments_guard on public.enrollments;
create trigger enrollments_guard before insert or update on public.enrollments
  for each row execute function public.guard_enrollment();

create or replace function public.guard_order()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'UPDATE' then
      raise exception 'Orders can only be changed by an admin';
    end if;
    new.status := 'pending'; new.admin_note := null; new.reviewed_at := null;
    select numeric_mul(price, new.quantity::numeric) into new.amount from public.products where id = new.product_id;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    new.reviewed_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists orders_guard on public.orders;
create trigger orders_guard before insert or update on public.orders
  for each row execute function public.guard_order();

-- 3d. Keep exams.total_questions in sync
create or replace function public.sync_exam_question_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_exam uuid := coalesce(new.exam_id, old.exam_id);
begin
  update public.exams set total_questions = (select count(1) from public.exam_questions where exam_id = v_exam)
  where id = v_exam;
  return null;
end;
$$;
drop trigger if exists exam_questions_count on public.exam_questions;
create trigger exam_questions_count after insert or delete on public.exam_questions
  for each row execute function public.sync_exam_question_count();

-- -----------------------------------------------------------------------------
-- 4. Row Level Security
-- -----------------------------------------------------------------------------
alter table public.admin_emails     enable row level security;
alter table public.profiles         enable row level security;
alter table public.classes          enable row level security;
alter table public.lessons          enable row level security;
alter table public.enrollments      enable row level security;
alter table public.notices          enable row level security;
alter table public.exams            enable row level security;
alter table public.exam_questions   enable row level security;
alter table public.exam_submissions enable row level security;
alter table public.products         enable row level security;
alter table public.orders           enable row level security;

-- admin_emails: admins only
drop policy if exists "admin_emails admin" on public.admin_emails;
create policy "admin_emails admin" on public.admin_emails for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- profiles
drop policy if exists "profiles read own or admin" on public.profiles;
create policy "profiles read own or admin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles update own or admin" on public.profiles;
create policy "profiles update own or admin" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
drop policy if exists "profiles admin delete" on public.profiles;
create policy "profiles admin delete" on public.profiles for delete to authenticated
  using (public.is_admin());

-- classes: active classes are public (storefront); admins see/modify everything
drop policy if exists "classes public read" on public.classes;
create policy "classes public read" on public.classes for select to anon, authenticated
  using (is_active or public.is_admin());
drop policy if exists "classes admin write" on public.classes;
create policy "classes admin write" on public.classes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- lessons: only free classes or approved month (admins: all)
drop policy if exists "lessons read with access" on public.lessons;
create policy "lessons read with access" on public.lessons for select to authenticated
  using (public.has_class_access(class_id, month));
drop policy if exists "lessons admin write" on public.lessons;
create policy "lessons admin write" on public.lessons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- enrollments
drop policy if exists "enrollments read own or admin" on public.enrollments;
create policy "enrollments read own or admin" on public.enrollments for select to authenticated
  using (student_id = auth.uid() or public.is_admin());
drop policy if exists "enrollments student insert" on public.enrollments;
create policy "enrollments student insert" on public.enrollments for insert to authenticated
  with check (
    public.is_admin() or (
      student_id = auth.uid()
      and status = 'pending'
      and slip_url like auth.uid()::text || '/%'
      and exists (select 1 from public.classes c where c.id = class_id and c.is_active and not c.is_free)
    )
  );
drop policy if exists "enrollments student resubmit" on public.enrollments;
create policy "enrollments student resubmit" on public.enrollments for update to authenticated
  using (public.is_admin() or (student_id = auth.uid() and status in ('pending','rejected')))
  with check (public.is_admin() or (student_id = auth.uid() and slip_url like auth.uid()::text || '/%'));
drop policy if exists "enrollments admin delete" on public.enrollments;
create policy "enrollments admin delete" on public.enrollments for delete to authenticated
  using (public.is_admin());

-- notices: filtered by class access and batch
drop policy if exists "notices read" on public.notices;
create policy "notices read" on public.notices for select to authenticated
  using (
    public.is_admin() or (
      (class_id is null or public.has_class_access(class_id, null))
      and (target_year is null or target_year = public.my_al_year())
    )
  );
drop policy if exists "notices admin write" on public.notices;
create policy "notices admin write" on public.notices for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- exams
drop policy if exists "exams read" on public.exams;
create policy "exams read" on public.exams for select to authenticated
  using (public.is_admin() or (is_published and public.has_class_access(class_id, null)));
drop policy if exists "exams admin write" on public.exams;
create policy "exams admin write" on public.exams for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- exam_questions: admins only (students receive questions WITHOUT answers via RPC)
drop policy if exists "exam_questions admin" on public.exam_questions;
create policy "exam_questions admin" on public.exam_questions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- exam_submissions: read own; writes go through RPCs; admins grade
drop policy if exists "submissions read own or admin" on public.exam_submissions;
create policy "submissions read own or admin" on public.exam_submissions for select to authenticated
  using (student_id = auth.uid() or public.is_admin());
drop policy if exists "submissions admin write" on public.exam_submissions;
create policy "submissions admin write" on public.exam_submissions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- products & orders
drop policy if exists "products public read" on public.products;
create policy "products public read" on public.products for select to anon, authenticated
  using (is_active or public.is_admin());
drop policy if exists "products admin write" on public.products;
create policy "products admin write" on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "orders read own or admin" on public.orders;
create policy "orders read own or admin" on public.orders for select to authenticated
  using (student_id = auth.uid() or public.is_admin());
drop policy if exists "orders student insert" on public.orders;
create policy "orders student insert" on public.orders for insert to authenticated
  with check (public.is_admin() or (student_id = auth.uid() and slip_url like auth.uid()::text || '/%'));
drop policy if exists "orders admin update" on public.orders;
create policy "orders admin update" on public.orders for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "orders admin delete" on public.orders;
create policy "orders admin delete" on public.orders for delete to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- 5. Exam RPCs (server-side timing + scoring; answers never leave the DB early)
-- -----------------------------------------------------------------------------
create or replace function public.start_exam(p_exam uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_exam public.exams%rowtype;
  v_sub  public.exam_submissions%rowtype;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  v_exam := (select e from public.exams e where e.id = p_exam);
  if v_exam.id is null or not (v_exam.is_published or public.is_admin()) then raise exception 'Exam not found'; end if;
  if not public.has_class_access(v_exam.class_id, null) then raise exception 'You do not have access to this exam'; end if;

  v_sub := (select s from public.exam_submissions s where s.exam_id = p_exam and s.student_id = auth.uid());
  if v_sub.id is null then
    if v_exam.opens_at is not null and now() < v_exam.opens_at then raise exception 'This exam has not opened yet'; end if;
    if v_exam.closes_at is not null and now() > v_exam.closes_at then raise exception 'This exam is closed'; end if;
    insert into public.exam_submissions (student_id, exam_id, status, started_at)
    values (auth.uid(), p_exam, 'in_progress', now())
    returning id into v_sub.id;
    v_sub := (select s from public.exam_submissions s where s.id = v_sub.id);
  end if;

  return jsonb_build_object(
    'submission_id', v_sub.id,
    'status',        v_sub.status,
    'started_at',    v_sub.started_at,
    'deadline',      v_sub.started_at + make_interval(mins => v_exam.duration_minutes),
    'server_now',    now(),
    'answers',       v_sub.answers_json,
    'questions', case when v_exam.exam_type = 'mcq' and v_sub.status = 'in_progress' then coalesce((
      select jsonb_agg(jsonb_build_object('id', q.id, 'question_text', q.question_text,
                                          'options', q.options_json, 'marks', q.marks)
                       order by q.sort_order, q.created_at)
      from public.exam_questions q where q.exam_id = p_exam), '[]'::jsonb) else '[]'::jsonb end
  );
end;
$$;

-- p_answers: {"<question_id>": <option_index>, ...}
create or replace function public.submit_mcq(p_exam uuid, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_exam  public.exams%rowtype;
  v_sub   public.exam_submissions%rowtype;
  v_score numeric := 0;
  v_total numeric := 0;
  v_late  boolean;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  v_exam := (select e from public.exams e where e.id = p_exam and e.exam_type = 'mcq');
  if v_exam.id is null then raise exception 'Exam not found'; end if;
  v_sub := (select s from public.exam_submissions s
    where s.exam_id = p_exam and s.student_id = auth.uid() for update);
  if v_sub.id is null then raise exception 'Start the exam first'; end if;
  if v_sub.status <> 'in_progress' then
    return jsonb_build_object('score', v_sub.score, 'total', v_sub.total_marks, 'already_submitted', true);
  end if;

  select coalesce(sum(q.marks) filter (where (p_answers ->> q.id::text) ~ '^\d+$'
                                         and (p_answers ->> q.id::text)::int = q.correct_answer), 0),
         coalesce(sum(q.marks), 0)
    into v_score, v_total
  from public.exam_questions q where q.exam_id = p_exam;

  -- 2-minute grace window for network latency after the timer hits zero
  v_late := now() > v_sub.started_at + make_interval(mins => v_exam.duration_minutes) + interval '2 minutes';

  update public.exam_submissions
     set answers_json = coalesce(p_answers, '{}'::jsonb), score = v_score, total_marks = v_total,
         status = 'submitted', submitted_at = now(), is_late = v_late
   where id = v_sub.id;

  return jsonb_build_object('score', v_score, 'total', v_total, 'is_late', v_late);
end;
$$;

create or replace function public.submit_structured(p_exam uuid, p_paths text[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_exam public.exams%rowtype;
  p text;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  v_exam := (select e from public.exams e where e.id = p_exam and e.exam_type = 'structured');
  if v_exam.id is null or not v_exam.is_published then raise exception 'Exam not found'; end if;
  if not public.has_class_access(v_exam.class_id, null) then raise exception 'You do not have access to this exam'; end if;
  if v_exam.closes_at is not null and now() > v_exam.closes_at then raise exception 'Submissions are closed'; end if;
  if coalesce(array_length(p_paths, 1), 0) = 0 then raise exception 'Upload at least one answer sheet'; end if;
  foreach p in array p_paths loop
    if p not like auth.uid()::text || '/%' then raise exception 'Invalid file path'; end if;
  end loop;

  insert into public.exam_submissions (student_id, exam_id, answer_sheet_urls, status, submitted_at)
  values (auth.uid(), p_exam, p_paths, 'submitted', now())
  on conflict (student_id, exam_id) do update
     set answer_sheet_urls = excluded.answer_sheet_urls, submitted_at = now(), status = 'submitted'
   where public.exam_submissions.status <> 'graded';
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.get_exam_review(p_exam uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_sub public.exam_submissions%rowtype;
begin
  v_sub := (select s from public.exam_submissions s where s.exam_id = p_exam and s.student_id = auth.uid());
  if v_sub.id is null or v_sub.status = 'in_progress' then raise exception 'Submit the exam to see the review'; end if;
  return jsonb_build_object(
    'score', v_sub.score, 'total', v_sub.total_marks, 'submitted_at', v_sub.submitted_at,
    'is_late', v_sub.is_late, 'feedback', v_sub.feedback, 'status', v_sub.status,
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id, 'question_text', q.question_text, 'options', q.options_json, 'marks', q.marks,
        'correct_answer', q.correct_answer, 'explanation', q.explanation,
        'your_answer', case when (v_sub.answers_json ->> q.id::text) ~ '^\d+$'
                            then (v_sub.answers_json ->> q.id::text)::int end)
        order by q.sort_order, q.created_at)
      from public.exam_questions q where q.exam_id = p_exam), '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_leaderboard(p_exam uuid)
returns table (rank bigint, full_name text, student_id text, town text, score numeric, total_marks numeric, is_me boolean)
language plpgsql stable security definer set search_path = public as $$
declare v_class uuid;
begin
  select class_id into v_class from public.exams where id = p_exam;
  if v_class is null or not public.has_class_access(v_class, null) then raise exception 'No access'; end if;
  return query
    select dense_rank() over (order by s.score desc) as rank,
           p.full_name, p.student_id, p.town, s.score, s.total_marks, (s.student_id = auth.uid())
    from public.exam_submissions s
    join public.profiles p on p.id = s.student_id
    where s.exam_id = p_exam and s.status in ('submitted','graded') and s.score is not null
    order by s.score desc, s.submitted_at asc
    limit 200;
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. Grants (RLS still applies)
-- -----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on public.classes, public.products to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on function public.generate_student_id(int) from public, anon, authenticated;
grant execute on function public.is_admin(), public.my_al_year(), public.has_class_access(uuid, text),
  public.can_read_class_file(text) to anon, authenticated;
grant execute on function public.start_exam(uuid), public.submit_mcq(uuid, jsonb),
  public.submit_structured(uuid, text[]), public.get_exam_review(uuid), public.get_leaderboard(uuid)
  to authenticated;

-- -----------------------------------------------------------------------------
-- 7. Storage buckets + policies
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('bank-slips',    'bank-slips',    false, 5242880,  array['image/jpeg','image/png','image/webp','application/pdf']),
  ('tute-pdfs',     'tute-pdfs',     false, 52428800, array['application/pdf']),
  ('answer-sheets', 'answer-sheets', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf']),
  ('class-banners', 'class-banners', true,  3145728,  array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- bank-slips & answer-sheets: "<user_id>/<file>" — owner + admin
drop policy if exists "own uploads insert" on storage.objects;
create policy "own uploads insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('bank-slips','answer-sheets') and split_part(name, '/', 1) = auth.uid()::text);
drop policy if exists "own uploads read" on storage.objects;
create policy "own uploads read" on storage.objects for select to authenticated
  using (bucket_id in ('bank-slips','answer-sheets') and (split_part(name, '/', 1) = auth.uid()::text or public.is_admin()));
drop policy if exists "own uploads admin delete" on storage.objects;
create policy "own uploads admin delete" on storage.objects for delete to authenticated
  using (bucket_id in ('bank-slips','answer-sheets') and public.is_admin());

-- tute-pdfs: "<class_id>/<YYYY-MM>/<file>" — readable with class access, admin writes
drop policy if exists "tutes read with access" on storage.objects;
create policy "tutes read with access" on storage.objects for select to authenticated
  using (bucket_id = 'tute-pdfs' and public.can_read_class_file(name));

-- admin write for tute-pdfs and class-banners
drop policy if exists "admin content insert" on storage.objects;
create policy "admin content insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('tute-pdfs','class-banners') and public.is_admin());
drop policy if exists "admin content update" on storage.objects;
create policy "admin content update" on storage.objects for update to authenticated
  using (bucket_id in ('tute-pdfs','class-banners') and public.is_admin());
drop policy if exists "admin content delete" on storage.objects;
create policy "admin content delete" on storage.objects for delete to authenticated
  using (bucket_id in ('tute-pdfs','class-banners') and public.is_admin());
drop policy if exists "banners public read" on storage.objects;
create policy "banners public read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'class-banners');

-- -----------------------------------------------------------------------------
-- 8. (Notices reach the browser by polling every 30 s — see NoticesRealtime; nothing to set up here.)
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- 9. Backfill: profiles for users created before this script ran
-- -----------------------------------------------------------------------------
insert into public.profiles (id, full_name, role, student_id, mobile, nic, al_year, town)
select u.id,
       coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), split_part(u.email, '@', 1)),
       case when exists (select 1 from public.admin_emails a where lower(a.email) = lower(u.email)) then 'admin' else 'student' end,
       case when exists (select 1 from public.admin_emails a where lower(a.email) = lower(u.email)) then null
            else public.generate_student_id(nullif(u.raw_user_meta_data->>'al_year', '')::int) end,
       nullif(u.raw_user_meta_data->>'mobile', ''),
       nullif(upper(u.raw_user_meta_data->>'nic'), ''),
       nullif(u.raw_user_meta_data->>'al_year', '')::int,
       coalesce(nullif(u.raw_user_meta_data->>'town', ''), 'Online')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
-- (No blanket "promote everyone in admin_emails" here: it ran on every deploy and silently
--  re-promoted demoted admins. New users get their role from handle_new_user(); use
--  deploy/seed-admin.sql to create or promote an admin explicitly.)
