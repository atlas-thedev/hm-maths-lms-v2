-- ════════════════════════════════════════════════════════════════════════════
-- HM Maths LMS · 0019 — class centers are editable. Safe to re-run.
--  profiles.town and classes.town used to allow only five fixed names; the list now lives in
--  system_settings ('centers', Developer panel → Centers) and is checked by the app, so the
--  fixed check constraints go and a simple length check stays.
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare r record;
begin
  for r in
    select c.conrelid::regclass as tbl, c.conname
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
     where c.contype = 'c' and c.conrelid in ('public.profiles'::regclass, 'public.classes'::regclass)
       and a.attname = 'town' and pg_get_constraintdef(c.oid) ilike '%Panadura%'
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  end loop;
end $$;

alter table public.profiles drop constraint if exists profiles_town_length;
alter table public.profiles add  constraint profiles_town_length check (town is null or char_length(town) between 2 and 40);
alter table public.classes  drop constraint if exists classes_town_length;
alter table public.classes  add  constraint classes_town_length  check (town is null or char_length(town) between 2 and 40);
