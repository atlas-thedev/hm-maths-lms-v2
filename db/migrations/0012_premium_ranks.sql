-- ════════════════════════════════════════════════════════════════════════════
-- HM Maths LMS · 0012 — Premium Verified badge, per-paper ranks, richer leaderboards
-- (PLAN.md Part 9). Safe to re-run.
--
-- Premium Verified ✓ (automatic):
--   • counts the published papers the student sat for their own batch (paper al_year = theirs, or none)
--   • earned with ≥ 3 papers and an average of ≥ 75 %
--   • lost the moment one paper is below 70 %; comes back after 3 papers in a row at ≥ 70 %
--     (and the average back at ≥ 75 %)
-- Everyone can see who has the badge (is_premium); only the student and admins see the details.
--
-- New functions (instead of changing the old ones, which earlier migrations re-create on every deploy):
--   season_board / paper_board — like get_overall_leaderboard / get_paper_leaderboard + attempt, batch, premium
--   my_paper_ranks             — the caller's all-island and center rank on every paper they sat
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.premium_calc(p_student uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_year  int;
  r       record;
  v_n     int := 0;
  v_sum   numeric := 0;
  v_since int := 0;
  v_slip  boolean := false;
  v_avg   numeric;
begin
  select al_year into v_year from public.profiles where id = p_student;
  for r in
    select round(m.marks / (p.total_marks / 100.0), 1) as pct
      from public.paper_marks m join public.papers p on p.id = m.paper_id
     where m.student_id = p_student and p.is_published
       and (p.al_year is null or v_year is null or p.al_year = v_year)
     order by p.paper_date, p.created_at
  loop
    v_n := v_n + 1;
    v_sum := v_sum + r.pct;
    if r.pct < 70 then v_slip := true; v_since := 0; else v_since := v_since + 1; end if;
  end loop;
  v_avg := case when v_n > 0 then round(v_sum / v_n, 1) else 0 end;
  return jsonb_build_object(
    'premium', v_n >= 3 and v_avg >= 75 and (not v_slip or v_since >= 3),
    'papers', v_n, 'avg', v_avg, 'had_slip', v_slip, 'since_slip', v_since,
    'threshold', 75, 'floor', 70, 'min_papers', 3, 'recover', 3);
end;
$$;

create or replace function public.is_premium(p_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((public.premium_calc(p_student) ->> 'premium')::boolean, false);
$$;

-- Full details for the caller (admins may pass any student).
create or replace function public.my_premium_status(p_student uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := coalesce(p_student, auth.uid());
begin
  if v_uid is null or (v_uid <> auth.uid() and not public.is_admin()) then raise exception 'No access'; end if;
  return public.premium_calc(v_uid);
end;
$$;

-- Season leaderboard (same filters and privacy as get_overall_leaderboard) + attempt, batch, premium.
create or replace function public.season_board(
  p_town text default null, p_year int default null, p_type text default null,
  p_from date default null, p_to date default null, p_limit int default 100)
returns table (rank bigint, student_code text, full_name text, town text, school text,
               points numeric, papers bigint, avg_pct numeric, best_pct numeric, is_me boolean, entrants bigint,
               attempt int, al_year int, premium boolean)
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
         round(r.pts, 1), r.n_papers, round(r.avgp, 1), round(r.bestp, 1), r.uid = auth.uid(), r.n,
         pr.attempt::int, pr.al_year, public.is_premium(r.uid)
  from r join public.profiles pr on pr.id = r.uid
  where r.rk <= greatest(1, least(coalesce(p_limit, 100), 500)) or r.uid = auth.uid()
  order by r.rk, pr.full_name;
$$;

-- One paper's leaderboard (same as get_paper_leaderboard) + attempt, batch, premium.
create or replace function public.paper_board(p_paper uuid, p_town text default null, p_limit int default 100)
returns table (rank bigint, student_code text, full_name text, town text, school text,
               marks numeric, total_marks numeric, pct numeric, is_me boolean, entrants bigint,
               attempt int, al_year int, premium boolean)
language sql stable security definer set search_path = public as $$
  with p as (
    select id, total_marks from public.papers
    where id = p_paper and (is_published or public.is_admin()) and auth.uid() is not null
  ), r as (
    select m.student_id as uid, pr.student_id as code, pr.full_name, pr.town, pr.school, m.marks, p.total_marks,
           round(m.marks / (p.total_marks / 100.0), 1) as pct,
           rank() over (order by m.marks desc) as rk,
           count(1) over () as n, pr.attempt, pr.al_year
    from public.paper_marks m
    join p on p.id = m.paper_id
    join public.profiles pr on pr.id = m.student_id
    where p_town is null or pr.town = p_town
  )
  select rk, case when uid = auth.uid() or public.is_admin() then code end, full_name, town,
         case when uid = auth.uid() or public.is_admin() then school end,
         marks, total_marks, pct, uid = auth.uid(), n, attempt::int, al_year, public.is_premium(uid)
  from r
  where rk <= greatest(1, least(coalesce(p_limit, 100), 500)) or uid = auth.uid()
  order by rk, full_name;
$$;

-- The caller's rank on every published paper they sat: all-island and in their own center.
create or replace function public.my_paper_ranks()
returns table (paper_id uuid, marks numeric, rank_island bigint, entrants_island bigint, rank_town bigint, entrants_town bigint)
language sql stable security definer set search_path = public as $$
  with me as (select id, town from public.profiles where id = auth.uid())
  select m.paper_id, m.marks,
         (select count(1) + 1 from public.paper_marks o where o.paper_id = m.paper_id and o.marks > m.marks),
         (select count(1) from public.paper_marks o where o.paper_id = m.paper_id),
         (select count(1) + 1 from public.paper_marks o join public.profiles op on op.id = o.student_id
           where o.paper_id = m.paper_id and op.town = me.town and o.marks > m.marks),
         (select count(1) from public.paper_marks o join public.profiles op on op.id = o.student_id
           where o.paper_id = m.paper_id and op.town = me.town)
  from public.paper_marks m
  join me on me.id = m.student_id
  join public.papers p on p.id = m.paper_id and p.is_published;
$$;

revoke all on function public.premium_calc(uuid) from public, anon, authenticated;
revoke all on function public.is_premium(uuid), public.my_premium_status(uuid),
  public.season_board(text, int, text, date, date, int), public.paper_board(uuid, text, int), public.my_paper_ranks()
  from public, anon;
grant execute on function public.is_premium(uuid), public.my_premium_status(uuid),
  public.season_board(text, int, text, date, date, int), public.paper_board(uuid, text, int), public.my_paper_ranks()
  to authenticated;
