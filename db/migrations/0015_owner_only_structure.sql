-- HM Maths LMS · 0015 — Owner-only structure & deletions. Safe to re-run (earlier migrations re-create the old
-- admin policies on every deploy, so this file drops them again each time).
--
--  Owner only : classes, lessons / sessions / live links, class files (tutes, banners), store products,
--               and deleting exams, papers, events, enrollments, orders.
--  Admins keep: approving slips & orders, granting access, marks & grading, attendance, notices,
--               creating / editing exams, papers and events, students (non-staff).

-- ─── Classes, lessons & live links: owner write, admin read ────────────────
drop policy if exists "classes admin write" on public.classes;
drop policy if exists "classes owner write" on public.classes;
create policy "classes owner write" on public.classes for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

drop policy if exists "lessons admin write" on public.lessons;
drop policy if exists "lessons owner write" on public.lessons;
create policy "lessons owner write" on public.lessons for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

drop policy if exists "class_live_defaults admin" on public.class_live_defaults;
drop policy if exists "class_live_defaults owner write" on public.class_live_defaults;
drop policy if exists "class_live_defaults admin read" on public.class_live_defaults;
create policy "class_live_defaults owner write" on public.class_live_defaults for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy "class_live_defaults admin read" on public.class_live_defaults for select to authenticated
  using (public.is_admin());

drop policy if exists "lesson_live_links admin" on public.lesson_live_links;
drop policy if exists "lesson_live_links owner write" on public.lesson_live_links;
drop policy if exists "lesson_live_links admin read" on public.lesson_live_links;
create policy "lesson_live_links owner write" on public.lesson_live_links for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy "lesson_live_links admin read" on public.lesson_live_links for select to authenticated
  using (public.is_admin());

-- Session generator is SECURITY DEFINER (bypasses RLS) → gate it on the owner too.
do $$
declare d text;
begin
  select pg_get_functiondef('public.generate_class_sessions(uuid,text,text)'::regprocedure) into d;
  d := replace(d,
    'if not public.is_admin() then raise exception ''Only admins can generate sessions''',
    'if not public.is_owner() then raise exception ''Only the owner can generate sessions''');
  execute d;
end $$;

-- Class files (tute PDFs, banners)
drop policy if exists "admin content insert" on storage.objects;
drop policy if exists "admin content update" on storage.objects;
drop policy if exists "admin content delete" on storage.objects;
drop policy if exists "owner content insert" on storage.objects;
drop policy if exists "owner content update" on storage.objects;
drop policy if exists "owner content delete" on storage.objects;
create policy "owner content insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('tute-pdfs','class-banners') and public.is_owner());
create policy "owner content update" on storage.objects for update to authenticated
  using (bucket_id in ('tute-pdfs','class-banners') and public.is_owner());
create policy "owner content delete" on storage.objects for delete to authenticated
  using (bucket_id in ('tute-pdfs','class-banners') and public.is_owner());

-- ─── Store catalog: owner write (admins still review orders) ───────────────
drop policy if exists "products admin write" on public.products;
drop policy if exists "products owner write" on public.products;
create policy "products owner write" on public.products for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- ─── Deletions: owner only. Admins can still create & edit. ────────────────
-- exams
drop policy if exists "exams admin write" on public.exams;
drop policy if exists "exams admin insert" on public.exams;
drop policy if exists "exams admin update" on public.exams;
drop policy if exists "exams owner delete" on public.exams;
create policy "exams admin insert" on public.exams for insert to authenticated with check (public.is_admin());
create policy "exams admin update" on public.exams for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "exams owner delete" on public.exams for delete to authenticated using (public.is_owner());

-- papers
drop policy if exists "papers admin write" on public.papers;
drop policy if exists "papers admin insert" on public.papers;
drop policy if exists "papers admin update" on public.papers;
drop policy if exists "papers owner delete" on public.papers;
create policy "papers admin insert" on public.papers for insert to authenticated with check (public.is_admin());
create policy "papers admin update" on public.papers for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "papers owner delete" on public.papers for delete to authenticated using (public.is_owner());

-- events
drop policy if exists "events admin write" on public.events;
drop policy if exists "events admin insert" on public.events;
drop policy if exists "events admin update" on public.events;
drop policy if exists "events owner delete" on public.events;
create policy "events admin insert" on public.events for insert to authenticated with check (public.is_admin());
create policy "events admin update" on public.events for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "events owner delete" on public.events for delete to authenticated using (public.is_owner());

-- enrollments & orders (admins review / update, never delete)
drop policy if exists "enrollments admin delete" on public.enrollments;
drop policy if exists "enrollments owner delete" on public.enrollments;
create policy "enrollments owner delete" on public.enrollments for delete to authenticated using (public.is_owner());

drop policy if exists "orders admin delete" on public.orders;
drop policy if exists "orders owner delete" on public.orders;
create policy "orders owner delete" on public.orders for delete to authenticated using (public.is_owner());
