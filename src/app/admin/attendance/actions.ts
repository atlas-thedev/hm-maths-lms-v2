"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { asService } from "@/lib/db/pg";
import { verifyQrToken } from "@/lib/qr";
import { getT } from "@/i18n/server";
import { normalizeMobile, toStudentId } from "@/lib/utils";

export type ScanPaper = { id: string; title: string; date: string; total: number; marks: number | null; remark: string | null };
export type ScanStudent = {
  id: string; name: string; studentId: string | null; photo: string | null;
  mobile: string | null; whatsapp: string | null; guardian: string | null;
  alYear: number | null; attempt: number; town: string; school: string | null; district: string | null; city: string | null;
};
export type ScanResult =
  | { ok: false; error: string }
  | { ok: true; already: boolean; at: string; student: ScanStudent; papers: ScanPaper[]; recentDays: string[] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Finds the student from a scanned QR, or (typed in) an 8-digit Student ID / mobile number. */
async function findStudentId(input: string, method: "qr" | "manual"): Promise<string | null> {
  const fromQr = verifyQrToken(input);
  if (fromQr || method === "qr") return fromQr;
  const sid = toStudentId(input);
  const mobile = /^\d{8}$/.test(sid) ? null : normalizeMobile(input);
  if (!/^\d{8}$/.test(sid) && !mobile) return null;
  const rows = await asService(async (c) => (await c.query(
    "select id from public.profiles where role = 'student' and (student_id = $1 or mobile = $2) limit 1", [sid, mobile])).rows);
  return rows[0]?.id ?? null;
}

/**
 * Admin scanner: checks the student in for today (once per day per class — a second scan just shows the details)
 * and returns their details, recent papers (marks or missed) and recent attendance.
 */
export async function scanAction(input: string, method: "qr" | "manual" = "qr", classId?: string | null): Promise<ScanResult> {
  const { db, user } = await requireAdmin();
  const t = await getT("admin.attendance");
  const raw = String(input ?? "").trim().slice(0, 200);
  if (!raw) return { ok: false, error: t("errors.empty") };
  const id = await findStudentId(raw, method === "manual" ? "manual" : "qr");
  if (!id || !UUID.test(id)) return { ok: false, error: method === "qr" ? t("errors.badQr") : t("errors.notFound") };

  const targetClassId = classId && UUID.test(classId) ? classId : null;

  const data = await asService(async (c) => {
    const p = (await c.query(
      `select id, full_name, student_id, avatar_path, mobile, whatsapp, guardian_mobile, al_year, attempt, town, school, district, city, role
         from public.profiles where id = $1`, [id])).rows[0];
    if (!p || p.role !== "student") return null;
    const ins = (await c.query(
      `insert into public.attendance (student_id, scanned_by, method, class_id) values ($1, $2, $3, $4)
       on conflict (student_id, day, (coalesce(class_id, '00000000-0000-0000-0000-000000000000'::uuid))) do nothing returning scanned_at`, [id, user.id, method, targetClassId])).rows[0];
    const at = ins?.scanned_at ?? (await c.query(
      `select scanned_at from public.attendance
       where student_id = $1 and day = (now() at time zone 'Asia/Colombo')::date
         and (coalesce(class_id, '00000000-0000-0000-0000-000000000000'::uuid)) = coalesce($2::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
       limit 1`, [id, targetClassId])).rows[0]?.scanned_at;
    const papers = (await c.query(
      `select pa.id, pa.title, pa.paper_date::text as date, pa.total_marks::float8 as total, m.marks::float8 as marks, m.remark
         from public.papers pa
         left join public.paper_marks m on m.paper_id = pa.id and m.student_id = $1
        where pa.is_published and pa.paper_date <= (now() at time zone 'Asia/Colombo')::date
          and (pa.al_year is null or pa.al_year = $2)
        order by pa.paper_date desc, pa.created_at desc limit 6`, [id, p.al_year])).rows;
    const days = (await c.query(
      "select day::text from public.attendance where student_id = $1 order by day desc limit 8", [id])).rows.map((r) => r.day as string);
    return { p, already: !ins, at: new Date(at ?? Date.now()).toISOString(), papers, days };
  });
  if (!data) return { ok: false, error: t("errors.notFound") };

  const { p } = data;
  const photo = p.avatar_path ? (await db.storage.from("avatars").createSignedUrl(p.avatar_path, 600)).data?.signedUrl ?? null : null;
  if (!data.already) revalidatePath("/admin/attendance");
  return {
    ok: true, already: data.already, at: data.at, recentDays: data.days,
    student: {
      id: p.id, name: p.full_name, studentId: p.student_id, photo, mobile: p.mobile, whatsapp: p.whatsapp, guardian: p.guardian_mobile,
      alYear: p.al_year, attempt: p.attempt ?? 1, town: p.town, school: p.school, district: p.district, city: p.city,
    },
    papers: data.papers.map((r) => ({ id: r.id, title: r.title, date: r.date, total: Number(r.total), marks: r.marks === null ? null : Number(r.marks), remark: r.remark })),
  };
}

/** Undo a check-in (wrong student scanned). */
export async function removeAttendanceAction(studentId: string, day: string, classId?: string | null): Promise<boolean> {
  await requireAdmin();
  if (!UUID.test(studentId) || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  await asService((c) => {
    if (classId && UUID.test(classId)) {
      return c.query("delete from public.attendance where student_id = $1 and day = $2 and class_id = $3", [studentId, day, classId]);
    }
    return c.query("delete from public.attendance where student_id = $1 and day = $2 and class_id is null", [studentId, day]);
  });
  revalidatePath("/admin/attendance");
  return true;
}
