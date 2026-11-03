-- Migration 0025: one cheap "pulse" call instead of two for the portal's background check.
-- Safe to re-run.
--
-- Every open portal tab used to send TWO requests every 6 seconds (unread count + latest enrollments / pending
-- slips + latest audit row). With ~2,000 students online that was ~670 requests a second. The tab now makes ONE
-- call every ~30 seconds. Both functions are SECURITY INVOKER, so row-level security answers exactly as before.

-- Students: unread bell count + a fingerprint of their 5 newest enrollments (a status change refreshes the page).
create or replace function public.portal_pulse()
returns jsonb language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'unread', public.unread_notification_count(),
    'fp', coalesce((
      select string_agg(x.id::text || ':' || x.status, ',' order by x.created_at desc, x.id)
        from (select id, status, created_at from public.enrollments order by created_at desc limit 5) x), ''));
$$;

-- Staff: slips waiting + the newest audit-log id (owners only; empty for other staff, as before).
create or replace function public.admin_pulse()
returns jsonb language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'pending', (select count(*) from public.enrollments where status = 'pending'),
    'audit', coalesce((select id::text from public.admin_audit_logs order by created_at desc limit 1), ''));
$$;

revoke all on function public.portal_pulse(), public.admin_pulse() from public, anon;
grant execute on function public.portal_pulse(), public.admin_pulse() to authenticated;
