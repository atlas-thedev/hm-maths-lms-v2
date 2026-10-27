-- 0005: students may withdraw (delete) their own PENDING slip, and only one pending slip
-- per class is allowed at a time. Safe to re-run; does not delete data.

drop policy if exists "enrollments student withdraw pending" on public.enrollments;
create policy "enrollments student withdraw pending" on public.enrollments for delete to authenticated
  using (student_id = auth.uid() and status = 'pending');

do $$ begin
  if not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'enrollments_one_pending_per_class')
     and not exists (select 1 from public.enrollments where status = 'pending'
                     group by student_id, class_id having count(student_id) > 1) then
    create unique index enrollments_one_pending_per_class on public.enrollments (student_id, class_id) where status = 'pending';
  end if;
end $$;
