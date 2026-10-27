-- ════════════════════════════════════════════════════════════════════════════
-- HM Maths LMS · 0008 — Exam integrity + leaderboard privacy. Safe to re-run.
--  1. get_exam_review: the correct answers, explanations and per-question right/wrong stay hidden until the exam closes
--     (closes_at), so a student who submits early cannot pass the key to friends still writing.
--     Exams without a close time reveal them right after submitting (as before).
--  2. get_leaderboard: late MCQ submissions (after the timer + 2 min grace) are not ranked.
--  3. Leaderboards no longer show other students' Student ID or school (own row + admins only).
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.get_exam_review(p_exam uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_sub  public.exam_submissions%rowtype;
  v_exam public.exams%rowtype;
  v_open boolean;
begin
  v_sub := (select s from public.exam_submissions s where s.exam_id = p_exam and s.student_id = auth.uid());
  if v_sub.id is null or v_sub.status = 'in_progress' then raise exception 'Submit the exam to see the review'; end if;
  v_exam := (select e from public.exams e where e.id = p_exam);
  v_open := public.is_admin() or v_exam.closes_at is null or now() >= v_exam.closes_at;
  return jsonb_build_object(
    'score', v_sub.score, 'total', v_sub.total_marks, 'submitted_at', v_sub.submitted_at,
    'is_late', v_sub.is_late, 'feedback', v_sub.feedback, 'status', v_sub.status,
    'answers_open', v_open, 'answers_from', v_exam.closes_at,
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id, 'question_text', q.question_text, 'options', q.options_json, 'marks', q.marks,
        'correct_answer', case when v_open then q.correct_answer end,
        'explanation', case when v_open then q.explanation end,
        'is_correct', case when v_open then coalesce((v_sub.answers_json ->> q.id::text) ~ '^\d+$'
                                     and (v_sub.answers_json ->> q.id::text)::int = q.correct_answer, false) end,
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
declare v_class uuid; v_admin boolean := public.is_admin();
begin
  select class_id into v_class from public.exams where id = p_exam;
  if v_class is null or not public.has_class_access(v_class, null) then raise exception 'No access'; end if;
  return query
    select dense_rank() over (order by s.score desc) as rank,
           p.full_name, case when v_admin or s.student_id = auth.uid() then p.student_id end,
           p.town, s.score, s.total_marks, (s.student_id = auth.uid())
    from public.exam_submissions s
    join public.profiles p on p.id = s.student_id
    where s.exam_id = p_exam and s.status in ('submitted','graded') and s.score is not null and not s.is_late
    order by s.score desc, s.submitted_at asc
    limit 200;
end;
$$;

create or replace function public.get_paper_leaderboard(p_paper uuid, p_town text default null, p_limit int default 100)
returns table (rank bigint, student_code text, full_name text, town text, school text,
               marks numeric, total_marks numeric, pct numeric, is_me boolean, entrants bigint)
language sql stable security definer set search_path = public as $$
  with p as (
    select id, total_marks from public.papers
    where id = p_paper and (is_published or public.is_admin()) and auth.uid() is not null
  ), r as (
    select m.student_id as uid, pr.student_id as code, pr.full_name, pr.town, pr.school, m.marks, p.total_marks,
           round(m.marks / (p.total_marks / 100.0), 1) as pct,
           rank() over (order by m.marks desc) as rk,
           count(1) over () as n
    from public.paper_marks m
    join p on p.id = m.paper_id
    join public.profiles pr on pr.id = m.student_id
    where p_town is null or pr.town = p_town
  )
  select rk, case when uid = auth.uid() or public.is_admin() then code end, full_name, town,
         case when uid = auth.uid() or public.is_admin() then school end,
         marks, total_marks, pct, uid = auth.uid(), n
  from r
  where rk <= greatest(1, least(coalesce(p_limit, 100), 500)) or uid = auth.uid()
  order by rk, full_name;
$$;

create or replace function public.get_overall_leaderboard(
  p_town text default null, p_year int default null, p_type text default null,
  p_from date default null, p_to date default null, p_limit int default 100)
returns table (rank bigint, student_code text, full_name text, town text, school text,
               points numeric, papers bigint, avg_pct numeric, best_pct numeric, is_me boolean, entrants bigint)
language sql stable security definer set search_path = public as $$
  with s as (
    select m.student_id as uid,
           sum(m.marks / (p.total_marks / 100.0)) as pts,
           count(1) as n_papers,
           avg(m.marks / (p.total_marks / 100.0)) as avgp,
           max(m.marks / (p.total_marks / 100.0)) as bestp
    from public.paper_marks m
    join public.papers p on p.id = m.paper_id
    join public.profiles pr on pr.id = m.student_id
    where auth.uid() is not null
      and (p.is_published or public.is_admin())
      and (p_town is null or pr.town = p_town)
      and (p_year is null or pr.al_year = p_year)
      and (p_type is null or p.paper_type = p_type)
      and (p_from is null or p.paper_date >= p_from)
      and (p_to   is null or p.paper_date <= p_to)
    group by m.student_id
  ), r as (
    select s.uid, s.pts, s.n_papers, s.avgp, s.bestp, rank() over (order by s.pts desc, s.avgp desc) as rk, count(1) over () as n from s
  )
  select r.rk, case when r.uid = auth.uid() or public.is_admin() then pr.student_id end, pr.full_name, pr.town,
         case when r.uid = auth.uid() or public.is_admin() then pr.school end,
         round(r.pts, 1), r.n_papers, round(r.avgp, 1), round(r.bestp, 1), r.uid = auth.uid(), r.n
  from r join public.profiles pr on pr.id = r.uid
  where r.rk <= greatest(1, least(coalesce(p_limit, 100), 500)) or r.uid = auth.uid()
  order by r.rk, pr.full_name;
$$;

revoke all on function public.get_exam_review(uuid), public.get_leaderboard(uuid),
  public.get_paper_leaderboard(uuid, text, int), public.get_overall_leaderboard(text, int, text, date, date, int) from public, anon;
grant execute on function public.get_exam_review(uuid), public.get_leaderboard(uuid),
  public.get_paper_leaderboard(uuid, text, int), public.get_overall_leaderboard(text, int, text, date, date, int) to authenticated;
