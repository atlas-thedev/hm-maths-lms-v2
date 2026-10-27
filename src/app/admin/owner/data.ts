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

export function actionVariant(action: string): "success" | "destructive" | "warning" | "secondary" {
  if (["receipt_approved", "cash_grant", "order_approved", "order_shipped"].includes(action)) return "success";
  if (["receipt_rejected", "order_rejected", "admin_demoted", "user_deleted", "video_tamper", "video_limit"].includes(action)) return "destructive";
  if (["admin_created", "admin_promoted"].includes(action)) return "warning";
  return "secondary";
}
