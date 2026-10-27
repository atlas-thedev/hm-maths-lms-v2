"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isOwnerRole, requireAdmin } from "@/lib/auth";
import { PAPER_TYPES } from "@/lib/papers";
import type { ActionState } from "@/lib/types";
import { normalizeMobile, toStudentId } from "@/lib/utils";
import { getT } from "@/i18n/server";

const m = async (k: string, v?: Record<string, string | number>) => (await getT("errors.papers"))(k, v);
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const optStr = (fd: FormData, k: string) => str(fd, k) || null;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function savePaperAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const id = str(fd, "id");
  const isNew = fd.get("is_new") === "1";
  if (!UUID_RE.test(id)) return { error: await m("invalid") };
  const type = str(fd, "paper_type");
  const total = Number(str(fd, "total_marks"));
  const year = str(fd, "al_year");
  const row = {
    title: str(fd, "title"),
    description: optStr(fd, "description"),
    paper_type: (PAPER_TYPES as readonly string[]).includes(type) ? type : "weekly",
    class_id: UUID_RE.test(str(fd, "class_id")) ? str(fd, "class_id") : null,
    al_year: /^\d{4}$/.test(year) ? Number(year) : null,
    paper_date: str(fd, "paper_date"),
    total_marks: total,
    paper_path: optStr(fd, "paper_path"),
    answers_path: optStr(fd, "answers_path"),
    is_published: fd.get("is_published") === "on",
  };
  if (row.title.length < 2) return { error: await m("title") };
  if (!DATE_RE.test(row.paper_date)) return { error: await m("date") };
  if (!(total > 0 && total <= 1000)) return { error: await m("total") };
  for (const p of [row.paper_path, row.answers_path]) if (p && !p.startsWith(`${id}/`)) return { error: await m("invalid") };

  if (!isNew) {
    const { data: max } = await db.from("paper_marks").select("marks").eq("paper_id", id).order("marks", { ascending: false }).limit(1).maybeSingle();
    if (max && Number(max.marks) > total) return { error: await m("totalBelowMarks", { max: Number(max.marks) }) };
  }
  const { error } = isNew
    ? await db.from("papers").insert({ id, ...row })
    : await db.from("papers").update(row).eq("id", id);
  if (error) return { error: `${await m("saveFailed")}: ${error.message}` };
  revalidatePath("/admin/papers");
  revalidatePath("/dashboard", "layout");
  if (isNew) redirect(`/admin/papers/${id}`);
  return { ok: true, message: await m("saved") };
}

export async function deletePaperAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db, profile } = await requireAdmin();
  if (!isOwnerRole(profile.role)) return { error: await (await getT("errors.admin"))("ownerOnly") };
  const id = str(fd, "id");
  const { data: paper } = await db.from("papers").select("paper_path, answers_path").eq("id", id).maybeSingle();
  const { error } = await db.from("papers").delete().eq("id", id);
  if (error) return { error: `${await m("deleteFailed")}: ${error.message}` };
  const files = [paper?.paper_path, paper?.answers_path].filter(Boolean) as string[];
  if (files.length) await db.storage.from("papers").remove(files);
  revalidatePath("/admin/papers");
  redirect("/admin/papers");
}

export type StudentHit = {
  id: string; full_name: string; student_id: string | null; mobile: string | null; town: string;
  al_year: number | null; school: string | null; marks: number | null; remark: string | null;
};

/** Find students by name, mobile number, student ID (or its last digits) or NIC. */
export async function searchStudentsAction(paperId: string, q: string): Promise<StudentHit[]> {
  const { db } = await requireAdmin();
  const term = toStudentId(q).replace(/[%,()*\\]/g, "").slice(0, 60);
  if (term.length < 2) return [];
  const ors = [`full_name.ilike.%${term}%`, `student_id.ilike.%${term}%`, `nic.ilike.%${term}%`, `mobile.ilike.%${term.replace(/\s+/g, "")}%`];
  const mob = normalizeMobile(term);
  if (mob) ors.push(`mobile.eq.${mob}`);
  const { data } = await db.from("profiles")
    .select("id, full_name, student_id, mobile, town, al_year, school")
    .eq("role", "student").or(ors.join(",")).order("full_name").limit(12);
  const rows = data ?? [];
  if (!rows.length || !UUID_RE.test(paperId)) return rows.map((r) => ({ ...r, marks: null, remark: null })) as StudentHit[];
  const { data: marks } = await db.from("paper_marks").select("student_id, marks, remark").eq("paper_id", paperId).in("student_id", rows.map((r) => r.id));
  const byId = new Map((marks ?? []).map((x) => [x.student_id as string, x]));
  return rows.map((r) => ({ ...r, marks: byId.has(r.id) ? Number(byId.get(r.id)!.marks) : null, remark: (byId.get(r.id)?.remark as string | null) ?? null })) as StudentHit[];
}

export async function saveMarkAction(paperId: string, studentId: string, marks: number, remark: string | null): Promise<{ ok: boolean; error?: string }> {
  const { db } = await requireAdmin();
  if (!UUID_RE.test(paperId) || !UUID_RE.test(studentId)) return { ok: false, error: await m("invalid") };
  const { data: paper } = await db.from("papers").select("total_marks").eq("id", paperId).maybeSingle();
  if (!paper) return { ok: false, error: await m("invalid") };
  const total = Number(paper.total_marks);
  if (!Number.isFinite(marks) || marks < 0) return { ok: false, error: await m("marksInvalid") };
  if (marks > total) return { ok: false, error: await m("marksTooHigh", { total }) };
  const { error } = await db.from("paper_marks").upsert(
    { paper_id: paperId, student_id: studentId, marks: Math.round(marks * 100) / 100, remark: remark?.trim().slice(0, 200) || null },
    { onConflict: "paper_id,student_id" },
  );
  if (error) return { ok: false, error: `${await m("saveFailed")}: ${error.message}` };
  revalidatePath(`/admin/papers/${paperId}`);
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function deleteMarkAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const paperId = str(fd, "paper_id"), studentId = str(fd, "student_id");
  const { error } = await db.from("paper_marks").delete().eq("paper_id", paperId).eq("student_id", studentId);
  if (error) return { error: `${await m("deleteFailed")}: ${error.message}` };
  revalidatePath(`/admin/papers/${paperId}`);
  return { ok: true, message: await m("markRemoved") };
}
