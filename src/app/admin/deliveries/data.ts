import "server-only";
import type { DbClient } from "@/lib/db/types";

export const DELIVERY_STATUSES = ["to_pack", "packed", "posted", "delivered", "returned", "skipped"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export type DeliveryRow = {
  id: string; kind: "class_tute" | "order"; status: DeliveryStatus; method: "post" | "class";
  class_id: string | null; month: string | null; order_id: string | null;
  address: string | null; phone: string | null; courier: string | null; tracking_no: string | null; note: string | null;
  posted_at: string | null; delivered_at: string | null; created_at: string;
  profiles: { full_name: string; student_id: string | null; mobile: string | null } | null;
  classes: { title: string } | null;
  orders: { quantity: number; products: { title: string } | null } | null;
};

/** ?status (a status or "all"), ?month=YYYY-MM, ?class=<id>, ?kind=class_tute|order, ?method=post|class, ?q=…, ?ids=a,b */
export type DeliveryFilter = { status: DeliveryStatus | "all"; month: string; classId: string; kind: string; method: string; q: string; ids: string[] };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseDeliveryFilter(sp: Record<string, string | undefined>): DeliveryFilter {
  const status = (DELIVERY_STATUSES as readonly string[]).includes(sp.status ?? "") ? sp.status as DeliveryStatus : sp.status === "all" ? "all" : "to_pack";
  return {
    status,
    month: /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month ?? "") ? sp.month! : "",
    classId: UUID_RE.test(sp.class ?? "") ? sp.class! : "",
    kind: sp.kind === "class_tute" || sp.kind === "order" ? sp.kind : "",
    method: sp.method === "post" || sp.method === "class" ? sp.method : "",
    // Characters that are safe inside a PostgREST filter value only.
    q: (sp.q ?? "").replace(/[^\p{L}\p{N}\s@.+-]/gu, "").trim().slice(0, 40),
    ids: (sp.ids ?? "").split(",").filter((x) => UUID_RE.test(x)).slice(0, 500),
  };
}

const SELECT = "id, kind, status, method, class_id, month, order_id, address, phone, courier, tracking_no, note, posted_at, delivered_at, created_at, "
  + "profiles:profiles!deliveries_student_id_fkey(full_name, student_id, mobile), classes(title), orders(quantity, products(title))";

/** Parcels matching the filter (RLS: staff see all). Waiting parcels oldest first, the rest newest first. */
export async function getDeliveries(db: DbClient, f: DeliveryFilter, limit = 500): Promise<DeliveryRow[]> {
  let query = db.from("deliveries").select(SELECT);
  if (f.ids.length) query = query.in("id", f.ids);
  else {
    if (f.status !== "all") query = query.eq("status", f.status);
    if (f.month) {
      // Class tutes by their month; book orders by the month they were placed (Sri Lanka time).
      const [y, m] = f.month.split("-").map(Number);
      const start = new Date(`${f.month}-01T00:00:00+05:30`).toISOString();
      const end = new Date(`${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01T00:00:00+05:30`).toISOString();
      query = query.or(`month.eq.${f.month},and(kind.eq.order,created_at.gte."${start}",created_at.lt."${end}")`);
    }
    if (f.classId) query = query.eq("class_id", f.classId);
    if (f.kind) query = query.eq("kind", f.kind);
    if (f.method) query = query.eq("method", f.method);
    if (f.q) {
      const like = `*${f.q}*`;
      const { data: hits } = await db.from("profiles").select("id")
        .or(`full_name.ilike.${like},student_id.ilike.${like},mobile.ilike.${like},nic.ilike.${like}`).limit(300);
      const ids = (hits ?? []).map((h) => h.id as string);
      query = query.or(ids.length ? `student_id.in.(${ids.join(",")}),tracking_no.ilike.${like}` : `tracking_no.ilike.${like}`);
    }
  }
  const waiting = f.status === "to_pack" || f.status === "packed";
  const { data } = await query.order("created_at", { ascending: waiting }).limit(limit);
  return (data ?? []) as unknown as DeliveryRow[];
}

/** What is in the parcel, e.g. "2028 Theory · November 2026" or "Integration tute book × 2". */
export function itemLabel(r: DeliveryRow, fmtMonth: (m: string) => string): string {
  if (r.kind === "order") return `${r.orders?.products?.title ?? "Tute book"}${r.orders && r.orders.quantity > 1 ? ` × ${r.orders.quantity}` : ""}`;
  return [r.classes?.title, r.month ? fmtMonth(r.month) : null].filter(Boolean).join(" · ");
}
