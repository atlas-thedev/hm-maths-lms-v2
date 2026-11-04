-- Publish the 0028 import once, without touching unrelated drafts or overwriting later edits.
-- 0028 records a unique timestamp in system_settings and assigns each inserted row an
-- offset of 1..57 seconds from it; this identifies its rows even if their text was edited.
with imported as (
  select updated_at from public.system_settings where key = 'seed_results_2025_posters_v1'
), published as (
  insert into public.system_settings (key, value)
  select 'publish_results_2025_posters_v1', '{"published":true}'::jsonb from imported
  on conflict (key) do nothing
  returning key
)
update public.student_results r
   set is_published = true
  from imported i, published p
 where r.exam_year = 2025
   and r.created_at in (select i.updated_at - n * interval '1 second' from generate_series(1, 57) as n)
   and not r.is_published;
