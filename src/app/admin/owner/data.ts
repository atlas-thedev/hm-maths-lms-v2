import "server-only";
import { asService } from "@/lib/db/pg";

export type StaffRow = {
  id: string; full_name: string; email: string; mobile: string | null; role: "admin" | "owner"; created_at: string;
  approved_count: number; rejected_count: number; cash_count: number; orders_count: number; approved_amount: number; last_active_at: string | null;
};

export type AuditRow = {
  id: string; actor_id: string | null; actor_name: string | null; actor_role: string | null;
  category: "receipt" | "order" | "staff" | "student" | "settings" | "attendance"; action: string; target_id: string | null;
  student_id: string | null; student_name: string | null; student_code: string | null; summary: string;
  details: {
    class_title?: string; product_title?: string; month?: string; amount?: number | null; bank_ref?: string | null; slip_url?: string | null;
    admin_note?: string | null; prev_status?: string | null; new_status?: string | null; student_mobile?: string | null; email?: string; role?: string;
  };
  created_at: string;
};

export const AUDIT_CATEGORIES = ["receipt", "order", "staff", "settings", "student"] as const;

/** Owners and admins with their receipt activity (developer accounts are managed in the Developer panel). */
export async function getStaffRows(): Promise<StaffRow[]> {
  return asService(async (c) => (await c.query(
    `select p.id, p.full_name, u.email, p.mobile, p.role, p.created_at,
            count(l.id) filter (where l.action = 'receipt_approved')::int as approved_count,
            count(l.id) filter (where l.action = 'receipt_rejected')::int as rejected_count,
            count(l.id) filter (where l.action = 'cash_grant')::int as cash_count,
            count(l.id) filter (where l.category = 'order')::int as orders_count,
            coalesce(sum((l.details->>'amount')::numeric) filter (where l.action in ('receipt_approved', 'cash_grant')), 0)::numeric as approved_amount,
            max(l.created_at) as last_active_at
       from public.profiles p
       join auth.users u on u.id = p.id
       left join public.admin_audit_logs l on l.actor_id = p.id
      where p.role in ('owner', 'admin')
      group by p.id, p.full_name, u.email, p.mobile, p.role, p.created_at
      order by case when p.role = 'owner' then 0 else 1 end, p.created_at asc`,
  )).rows as StaffRow[]);
}

export async function getAuditRows({ category = "", actor = "", search = "", limit = 150 }: { category?: string; actor?: string; search?: string; limit?: number }): Promise<AuditRow[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (category) { params.push(category); clauses.push(`category = $${params.length}`); }
  if (actor && /^[0-9a-f-]{36}$/i.test(actor)) { params.push(actor); clauses.push(`actor_id = $${params.length}::uuid`); }
  if (search) {
    params.push(`%${search}%`);
    const p = `$${params.length}`;
    clauses.push(`(coalesce(student_name, '') ilike ${p} or coalesce(student_code, '') ilike ${p} or coalesce(actor_name, '') ilike ${p} or summary ilike ${p} or coalesce(details->>'bank_ref', '') ilike ${p})`);
  }
  params.push(limit);
  return asService(async (c) => (await c.query(
    `select id, actor_id, actor_name, actor_role, category, action, target_id, student_id, student_name, student_code, summary, details, created_at
       from public.admin_audit_logs ${clauses.length ? `where ${clauses.join(" and ")}` : ""}
      order by created_at desc limit $${params.length}`,
    params,
  )).rows as AuditRow[]);
}

export type OwnerDashboard = {
  /** Approved class fees per month (Sri Lanka time, by approval date), oldest first; months with nothing are absent. */
  revenue: { m: string; total: number; n: number }[];
  students: number; newStudents: number; active: number; expiring: number;
  pending: number; oldestPending: string | null; pendingOrders: number;
  topClasses: { id: string; title: string; total: number; n: number }[];
  noSessions: { id: string; title: string }[];
  noLink: { id: string; title: string; live_start_time: string; class_id: string; class_title: string }[];
  noRecording: { id: string; title: string; n: number }[];
};

/**
 * Owner Console overview numbers in one round trip: money this month and the last 6, who has access, and the
 * things that will hurt students soon (slips waiting, sessions without links, missing recordings, classes
 * with nothing scheduled).
 */
export async function getOwnerDashboard(): Promise<OwnerDashboard> {
  return asService(async (c) => {
    // month_start: the 1st of this month 00:00 in Sri Lanka, as a real timestamp.
    const ctx = `with ctx as (
      select (date_trunc('month', now() at time zone 'Asia/Colombo')) at time zone 'Asia/Colombo' as month_start,
             to_char(now() at time zone 'Asia/Colombo', 'YYYY-MM') as cur_month)`;
    const [rev, kpi, top, noSessions, noLink, noRec] = await Promise.all([
      c.query(`select to_char(date_trunc('month', e.reviewed_at at time zone 'Asia/Colombo'), 'YYYY-MM') as m,
                      coalesce(sum(e.amount), 0)::float8 as total, count(*)::int as n
                 from public.enrollments e
                where e.status = 'approved'
                  and e.reviewed_at >= (date_trunc('month', now() at time zone 'Asia/Colombo') - interval '5 months') at time zone 'Asia/Colombo'
                group by 1 order by 1`),
      c.query(`${ctx}
        select (select count(*) from public.profiles where role = 'student')::int as students,
               (select count(*) from public.profiles, ctx where role = 'student' and created_at >= ctx.month_start)::int as new_students,
               (select count(distinct student_id) from public.enrollments, ctx where status = 'approved'
                  and (access_until > now() or (access_until is null and month >= ctx.cur_month)))::int as active,
               (select count(distinct student_id) from public.enrollments where status = 'approved'
                  and access_until > now() and access_until < now() + interval '7 days')::int as expiring,
               (select count(*) from public.enrollments where status = 'pending')::int as pending,
               (select min(created_at) from public.enrollments where status = 'pending') as oldest_pending,
               (select count(*) from public.orders where status = 'pending')::int as pending_orders`),
      c.query(`${ctx}
        select cl.id, cl.title, coalesce(sum(e.amount), 0)::float8 as total, count(*)::int as n
          from public.enrollments e join public.classes cl on cl.id = e.class_id, ctx
         where e.status = 'approved' and e.reviewed_at >= ctx.month_start
         group by cl.id, cl.title having coalesce(sum(e.amount), 0) > 0
         order by total desc limit 6`),
      c.query(`select cl.id, cl.title from public.classes cl
                where cl.is_active and not cl.is_free and cl.class_type <> 'Combo'
                  and not exists (select 1 from public.lessons l where l.class_id = cl.id and l.live_start_time > now() and not l.is_cancelled)
                order by cl.title`),
      c.query(`select l.id, l.title, l.live_start_time, cl.id as class_id, cl.title as class_title
                 from public.lessons l join public.classes cl on cl.id = l.class_id
                where l.live_start_time between now() and now() + interval '48 hours' and not l.is_cancelled
                  and not exists (select 1 from public.lesson_live_links k where k.lesson_id = l.id)
                order by l.live_start_time limit 10`),
      c.query(`select cl.id, cl.title, count(*)::int as n
                 from public.lessons l join public.classes cl on cl.id = l.class_id
                where l.live_start_time between now() - interval '14 days' and now() - interval '6 hours'
                  and not l.is_cancelled and l.youtube_url is null
                group by cl.id, cl.title order by n desc limit 6`),
    ]);
    const k = kpi.rows[0];
    return {
      revenue: rev.rows as OwnerDashboard["revenue"],
      students: k.students, newStudents: k.new_students, active: k.active, expiring: k.expiring,
      pending: k.pending, oldestPending: k.oldest_pending ? new Date(k.oldest_pending).toISOString() : null, pendingOrders: k.pending_orders,
      topClasses: top.rows as OwnerDashboard["topClasses"],
      noSessions: noSessions.rows as OwnerDashboard["noSessions"],
      noLink: (noLink.rows as (Omit<OwnerDashboard["noLink"][number], "live_start_time"> & { live_start_time: Date })[])
        .map((r) => ({ ...r, live_start_time: new Date(r.live_start_time).toISOString() })),
      noRecording: noRec.rows as OwnerDashboard["noRecording"],
    };
  });
}

export function actionVariant(action: string): "success" | "destructive" | "warning" | "secondary" {
  if (["receipt_approved", "cash_grant", "order_approved", "order_shipped"].includes(action)) return "success";
  if (["receipt_rejected", "order_rejected", "admin_demoted", "user_deleted", "video_tamper", "video_limit"].includes(action)) return "destructive";
  if (["admin_created", "admin_promoted"].includes(action)) return "warning";
  return "secondary";
}
