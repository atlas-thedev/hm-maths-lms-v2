-- ════════════════════════════════════════════════════════════════════════════
-- HM Maths LMS · 0011 — "Payment approved" notification for cash grants. Safe to re-run.
--  An admin granting access for a cash payment (Payments → "Grant access manually") creates the
--  enrollment already approved, so the update-only trigger from 0009 never fired and the student got
--  no notification. Now an enrollment that is INSERTED as approved (only admins can do that — the
--  enrollment guard forces student inserts to "pending") notifies too.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.notify_enrollment_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('approved','rejected')
     and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    insert into public.notifications (user_id, kind, link, data)
    select new.student_id, 'payment_' || new.status, '/dashboard/payments',
           jsonb_build_object('enrollment_id', new.id, 'class_id', new.class_id, 'class', c.title,
                              'month', new.month, 'note', new.admin_note)
      from public.classes c where c.id = new.class_id;
  end if;
  return null;
end;
$$;

drop trigger if exists enrollments_notify on public.enrollments;
create trigger enrollments_notify after insert or update on public.enrollments
  for each row execute function public.notify_enrollment_review();

revoke all on function public.notify_enrollment_review() from public, anon, authenticated;
