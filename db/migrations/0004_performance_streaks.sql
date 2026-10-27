-- ════════════════════════════════════════════════════════════════════════════
-- HM Maths LMS · 0004 — Performance streaks (replaces the daily-login streak)
--
-- Applied after 0001 + 0002 + 0003 by deploy/update.sh. Safe to re-run.
-- Doesn't delete any data.
--
-- get_my_paper_stats() now also returns "streaks":
--   attend  – weekly papers sat in a row        pass50 – 50% or more in a row
--   score75 – 75% (A) or more in a row          top10  – all-island top 10 in a row
--   top3    – all-island top 3 in a row         improve – beat your previous paper score in a row
-- ════════════════════════════════════════════════════════════════════════════

-- Paper summary + performance streaks for one student (defaults to the caller; admins may pass anyone).
create or replace function public.get_my_paper_stats(p_student uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_uid   uuid := coalesce(p_student, auth.uid());
  v_year  int;
  v_town  text;
  v_first date;
  v_cur   int := 0;
  v_best  int := 0;
  v_run   int := 0;
  rec     record;
  v_last  jsonb;
  v_summary jsonb;
  -- performance streaks over the papers the student sat (oldest → newest)
  c50 int := 0; b50 int := 0; c75 int := 0; b75 int := 0;
  c10 int := 0; b10 int := 0; c3  int := 0; b3  int := 0;
  cim int := 0; bim int := 0; v_prev numeric;
begin
  if v_uid is null or (v_uid <> auth.uid() and not public.is_admin()) then raise exception 'No access'; end if;
  select al_year, town into v_year, v_town from public.profiles where id = v_uid;

  select jsonb_build_object(
           'papers', count(1),
           'avg_pct', round(coalesce(avg(m.marks / (p.total_marks / 100.0)), 0), 1),
           'best_pct', round(coalesce(max(m.marks / (p.total_marks / 100.0)), 0), 1),
           'points', round(coalesce(sum(m.marks / (p.total_marks / 100.0)), 0), 1),
           'full_marks', count(1) filter (where m.marks = p.total_marks)),
         min(p.paper_date)
    into v_summary, v_first
  from public.paper_marks m join public.papers p on p.id = m.paper_id
  where m.student_id = v_uid and p.is_published;

  -- Streak over the weekly papers of the student's batch that already have marks entered,
  -- starting from the first paper the student sat.
  if v_first is not null then
    for rec in
      select p.id, exists (select 1 from public.paper_marks x where x.paper_id = p.id and x.student_id = v_uid) as sat
      from public.papers p
      where p.is_published and p.paper_type = 'weekly' and p.paper_date >= v_first
        and (p.al_year is null or v_year is null or p.al_year = v_year
             or exists (select 1 from public.paper_marks z where z.paper_id = p.id and z.student_id = v_uid))
        and exists (select 1 from public.paper_marks y where y.paper_id = p.id)
      order by p.paper_date, p.created_at
    loop
      if rec.sat then v_run := v_run + 1; else v_run := 0; end if;
      v_best := greatest(v_best, v_run);
    end loop;
    v_cur := v_run;
  end if;

  -- 50+ / 75+ (% of the paper), all-island top 10 / top 3, and improving (beat the previous score).
  for rec in
    select round(m.marks / (p.total_marks / 100.0), 1) as pct,
           (select count(1) + 1 from public.paper_marks o where o.paper_id = p.id and o.marks > m.marks) as rk
    from public.paper_marks m join public.papers p on p.id = m.paper_id
    where m.student_id = v_uid and p.is_published
    order by p.paper_date, p.created_at
  loop
    c50 := case when rec.pct >= 50 then c50 + 1 else 0 end;  b50 := greatest(b50, c50);
    c75 := case when rec.pct >= 75 then c75 + 1 else 0 end;  b75 := greatest(b75, c75);
    c10 := case when rec.rk <= 10 then c10 + 1 else 0 end;   b10 := greatest(b10, c10);
    c3  := case when rec.rk <= 3  then c3 + 1  else 0 end;   b3  := greatest(b3, c3);
    cim := case when v_prev is not null and rec.pct > v_prev then cim + 1 else 0 end;  bim := greatest(bim, cim);
    v_prev := rec.pct;
  end loop;

  -- Most recent paper the student sat, with island + center rank.
  select jsonb_build_object(
           'paper_id', p.id, 'title', p.title, 'paper_date', p.paper_date, 'paper_type', p.paper_type,
           'marks', m.marks, 'total_marks', p.total_marks,
           'pct', round(m.marks / (p.total_marks / 100.0), 1),
           'rank_island', (select count(1) + 1 from public.paper_marks o where o.paper_id = p.id and o.marks > m.marks),
           'entrants_island', (select count(1) from public.paper_marks o where o.paper_id = p.id),
           'rank_town', (select count(1) + 1 from public.paper_marks o join public.profiles op on op.id = o.student_id
                         where o.paper_id = p.id and op.town = v_town and o.marks > m.marks),
           'entrants_town', (select count(1) from public.paper_marks o join public.profiles op on op.id = o.student_id
                             where o.paper_id = p.id and op.town = v_town))
    into v_last
  from public.paper_marks m join public.papers p on p.id = m.paper_id
  where m.student_id = v_uid and p.is_published
  order by p.paper_date desc, p.created_at desc
  limit 1;

  return coalesce(v_summary, '{}'::jsonb)
         || jsonb_build_object('streak', v_cur, 'best_streak', v_best, 'town', v_town, 'al_year', v_year, 'last', v_last,
              'streaks', jsonb_build_object(
                'attend',  jsonb_build_object('current', v_cur, 'best', v_best),
                'pass50',  jsonb_build_object('current', c50, 'best', b50),
                'score75', jsonb_build_object('current', c75, 'best', b75),
                'top10',   jsonb_build_object('current', c10, 'best', b10),
                'top3',    jsonb_build_object('current', c3,  'best', b3),
                'improve', jsonb_build_object('current', cim, 'best', bim)));
end;
$$;

grant execute on function public.get_my_paper_stats(uuid) to authenticated;
