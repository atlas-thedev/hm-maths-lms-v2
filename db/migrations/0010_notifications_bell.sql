-- ════════════════════════════════════════════════════════════════════════════
-- HM Maths LMS · 0010 — Notifications bell (PLAN.md Part 5). Safe to re-run.
--  Notices (General / Urgent / Exam) are merged into the bell page. Notices have no per-student
--  read state, so profiles.notices_seen_at marks "everything before this was seen".
--  1. profiles.notices_seen_at
--  2. mark_notifications_read(): marking everything read also marks notices seen
--  3. unread_notification_count(): bell badge = unread notifications + unseen notices (RLS-filtered)
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles add column if not exists notices_seen_at timestamptz;

create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns int language plpgsql volatile security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  update public.notifications set read_at = now()
   where user_id = auth.uid() and read_at is null and (p_ids is null or id = any(p_ids));
  get diagnostics n = row_count;
  if p_ids is null then
    update public.profiles set notices_seen_at = now() where id = auth.uid();
  end if;
  return n;
end;
$$;

-- Runs as the caller, so RLS limits notices to the student's classes / batch.
-- Never-opened bell: notices from the last 7 days count as new.
create or replace function public.unread_notification_count()
returns int language sql stable security invoker set search_path = public as $$
  select (
    (select count(*) from public.notifications where user_id = auth.uid() and read_at is null)
    + (select count(*) from public.notices
        where created_at > coalesce((select notices_seen_at from public.profiles where id = auth.uid()), now() - interval '7 days'))
  )::int;
$$;

revoke all on function public.mark_notifications_read(uuid[]), public.unread_notification_count() from public, anon;
grant execute on function public.mark_notifications_read(uuid[]), public.unread_notification_count() to authenticated;
