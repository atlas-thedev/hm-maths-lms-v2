import "server-only";
import { asService } from "@/lib/db/pg";
import { mobileToEmail, normalizeMobile, toStudentId } from "@/lib/utils";

export type ResolvedAccount = { email: string; userId: string | null };

/**
 * Turns what a person types on the login / forgot-password form into their login e-mail:
 *  • admin e-mail → as is
 *  • mobile number (07…, 7…, 94…) → the internal student e-mail
 *  • 8-digit Student ID (or the old "HM-MATHS-2027-1234") → that student's mobile → internal e-mail
 * Returns null when the input is none of these. A Student ID that matches nobody also returns null.
 */
export async function resolveAccount(identifier: string): Promise<ResolvedAccount | null> {
  const raw = identifier.trim();
  if (!raw) return null;
  if (raw.includes("@")) return { email: raw.toLowerCase(), userId: null };
  const sid = toStudentId(raw);
  if (/^\d{8}$/.test(sid)) {
    const rows = await asService(async (c) => (await c.query(
      "select id, mobile from public.profiles where student_id = $1 and mobile is not null limit 1", [sid])).rows);
    return rows[0] ? { email: mobileToEmail(rows[0].mobile), userId: rows[0].id } : null;
  }
  const mobile = normalizeMobile(raw);
  return mobile ? { email: mobileToEmail(mobile), userId: null } : null;
}
