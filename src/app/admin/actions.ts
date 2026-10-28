"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomInt } from "node:crypto";
import { canDeleteAccount, isOwnerRole, requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/db/admin";
import { AL_YEARS, CLASS_TYPES, NOTICE_TAGS } from "@/lib/constants";
import { townKeys } from "@/lib/centers";
import { normalizeBannerConfig } from "@/lib/banner";
import { getCenters } from "@/lib/settings";
import type { ActionState } from "@/lib/types";
import { colomboLocalToISO, currentMonth, normalizeMobile, toStudentId } from "@/lib/utils";
import { youtubeId } from "@/lib/youtube";
import { getT } from "@/i18n/server";

const m = async (k: string, v?: Record<string, string | number>) => (await getT("errors.admin"))(k, v);

/** Owner-only actions: admins get a clear message (the database policies enforce it too). */
const ownerOnly = async (role: string): Promise<ActionState | null> => (isOwnerRole(role) ? null : { error: await m("ownerOnly") });

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const optStr = (fd: FormData, k: string) => str(fd, k) || null;
const optInt = (fd: FormData, k: string) => { const v = str(fd, k); return v ? Number.parseInt(v, 10) : null; };
const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";
const fail = (e: { message: string } | null, fallback: string): ActionState => ({ error: e?.message ? `${fallback}: ${e.message}` : fallback });
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const minutesOrNull = (fd: FormData, k: string) => { const n = optInt(fd, k); return n === null || Number.isNaN(n) ? null : n; };
const isHttps = (u: string) => /^https:\/\/\S+$/.test(u);

// ───────────────────────────── Classes ─────────────────────────────
/** The banner template chosen in the class form (JSON), or null when the banner is an uploaded picture. */
function bannerConfigOf(raw: string | null) {
  if (!raw) return null;
  try { return normalizeBannerConfig(JSON.parse(raw)); } catch { return null; }
}

export async function saveClassAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db, profile } = await requireAdmin();
  const denied = await ownerOnly(profile.role);
  if (denied) return denied;
  const id = optStr(fd, "id");
  const class_type = str(fd, "class_type");
  const town = optStr(fd, "town");
  const is_free = bool(fd, "is_free") || class_type === "Free Seminar";
  const fee = is_free ? 0 : Number(str(fd, "fee") || 0);
  const row = {
    title: str(fd, "title"),
    description: optStr(fd, "description"),
    class_type,
    target_year: optInt(fd, "target_year"),
    town,
    fee,
    schedule: optStr(fd, "schedule"),
    schedule_days: [...new Set(fd.getAll("schedule_days").map((d) => Number(d)).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort(),
    start_time: optStr(fd, "start_time"),
    duration_minutes: minutesOrNull(fd, "duration_minutes") ?? 120,
    banner_url: optStr(fd, "banner_url"),
    banner_config: bannerConfigOf(optStr(fd, "banner_config")),
    is_active: bool(fd, "is_active"),
    is_free,
  };
  if (row.title.length < 3) return { error: await m("titleRequired") };
  if (!(CLASS_TYPES as readonly string[]).includes(class_type)) return { error: await m("classType") };
  if (town && !townKeys(await getCenters()).includes(town)) return { error: await m("invalidCenter") };
  if (!Number.isFinite(fee) || fee < 0) return { error: await m("fee") };
  if (row.start_time && !TIME_RE.test(row.start_time)) return { error: await m("time") };
  if (row.duration_minutes < 15 || row.duration_minutes > 600) return { error: await m("durationRange") };
  if (row.schedule_days.length && !row.start_time) return { error: await m("startTimeRequired") };
  const defaultLink = optStr(fd, "default_live_url");
  if (defaultLink && !isHttps(defaultLink)) return { error: await m("liveHttps") };
  const saveLink = async (classId: string) => defaultLink
    ? db.from("class_live_defaults").upsert({ class_id: classId, live_url: defaultLink, updated_at: new Date().toISOString() })
    : db.from("class_live_defaults").delete().eq("class_id", classId);

  if (id) {
    const { error } = await db.from("classes").update(row).eq("id", id);
    if (error) return fail(error, await m("fail.saveClass"));
    const { error: linkErr } = await saveLink(id);
    if (linkErr) return fail(linkErr, await m("fail.saveClass"));
    revalidatePath("/admin/classes", "layout");
    revalidatePath("/", "layout");
    return { ok: true, message: await m("classSaved") };
  }
  const { data, error } = await db.from("classes").insert(row).select("id").single();
  if (error) return fail(error, await m("fail.createClass"));
  await saveLink(data.id);
  revalidatePath("/", "layout");
  redirect(`/admin/classes/${data.id}`);
}

export async function deleteClassAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db, profile } = await requireAdmin();
  const denied = await ownerOnly(profile.role);
  if (denied) return denied;
  const { error } = await db.from("classes").delete().eq("id", str(fd, "id"));
  if (error) return fail(error, await m("fail.deleteClass"));
  revalidatePath("/", "layout");
  redirect("/admin/classes");
}

// ───────────────────────────── Lessons ─────────────────────────────
export async function saveLessonAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db, profile } = await requireAdmin();
  const denied = await ownerOnly(profile.role);
  if (denied) return denied;
  const id = optStr(fd, "id");
  const youtube_url = optStr(fd, "youtube_url");
  const live_url = optStr(fd, "live_url");
  const liveDate = optStr(fd, "live_date");
  const liveTime = optStr(fd, "live_time");
  const session_type = str(fd, "session_type") === "extra" ? "extra" : "regular";
  const classId = str(fd, "class_id");
  if ((liveDate && !DATE_RE.test(liveDate)) || (liveTime && !TIME_RE.test(liveTime))) return { error: await m("time") };
  if (!!liveDate !== !!liveTime) return { error: await m("dateAndTime") };
  const live_start_time = liveDate && liveTime ? colomboLocalToISO(`${liveDate}T${liveTime}`) : null;
  // A dated session belongs to the month it happens in (that is the month students pay for).
  const month = liveDate ? liveDate.slice(0, 7) : str(fd, "month") || currentMonth();
  const row = {
    class_id: classId,
    month,
    week_number: liveDate ? Math.min(6, Math.ceil(Number(liveDate.slice(8, 10)) / 7)) : Number(str(fd, "week_number") || 1),
    title: str(fd, "title"),
    description: optStr(fd, "description"),
    youtube_url,
    tute_pdf_url: optStr(fd, "tute_pdf_url"),
    live_start_time,
    session_type,
    duration_minutes: minutesOrNull(fd, "duration_minutes"),
    is_cancelled: bool(fd, "is_cancelled"),
    sort_order: liveDate ? Number(liveDate.slice(8, 10)) : Number(str(fd, "sort_order") || 0),
  };
  if (!row.title) return { error: await m("lessonTitle") };
  if (!MONTH_RE.test(row.month)) return { error: await m("month") };
  if (row.week_number < 1 || row.week_number > 6) return { error: await m("week") };
  if (row.duration_minutes !== null && (row.duration_minutes < 15 || row.duration_minutes > 600)) return { error: await m("durationRange") };
  if (youtube_url && !youtubeId(youtube_url)) return { error: await m("youtube") };
  if (live_url && !isHttps(live_url)) return { error: await m("liveHttps") };
  if (live_url && !live_start_time) return { error: await m("liveNeedsTime") };
  if (row.tute_pdf_url && !row.tute_pdf_url.startsWith(`${row.class_id}/`)) return { error: await m("tuteFile") };

  const res = id
    ? await db.from("lessons").update(row).eq("id", id).select("id").single()
    : await db.from("lessons").insert(row).select("id").single();
  if (res.error) return fail(res.error, await m("fail.saveLesson"));
  const lessonId = res.data.id as string;
  const { error: linkErr } = live_url
    ? await db.from("lesson_live_links").upsert({ lesson_id: lessonId, live_url, updated_at: new Date().toISOString() })
    : await db.from("lesson_live_links").delete().eq("lesson_id", lessonId);
  if (linkErr) return fail(linkErr, await m("fail.saveLesson"));
  revalidatePath(`/admin/classes/${row.class_id}`);
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: id ? await m("lessonUpdated") : session_type === "extra" ? await m("extraAdded") : await m("lessonAdded") };
}

/** Create every weekly session of a month from the class timetable (database function, skips existing days). */
export async function generateSessionsAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db, profile } = await requireAdmin();
  const denied = await ownerOnly(profile.role);
  if (denied) return denied;
  const classId = str(fd, "class_id");
  const month = str(fd, "month");
  if (!MONTH_RE.test(month)) return { error: await m("month") };
  const { data, error } = await db.rpc("generate_class_sessions", { p_class: classId, p_month: month, p_title: optStr(fd, "title") });
  if (error) return fail(error, await m("fail.generate"));
  revalidatePath(`/admin/classes/${classId}`);
  revalidatePath("/dashboard", "layout");
  const n = Number(data ?? 0);
  return { ok: true, message: n ? await m("generated", { n }) : await m("generatedNone") };
}

/** Cancel / restore a single session (students see "Cancelled" and the link stays hidden). */
export async function toggleCancelAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db, profile } = await requireAdmin();
  const denied = await ownerOnly(profile.role);
  if (denied) return denied;
  const cancel = str(fd, "cancel") === "1";
  const { data, error } = await db.from("lessons").update({ is_cancelled: cancel }).eq("id", str(fd, "id")).select("class_id").single();
  if (error) return fail(error, await m("fail.update"));
  revalidatePath(`/admin/classes/${data.class_id}`);
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: cancel ? await m("sessionCancelled") : await m("sessionRestored") };
}

export async function deleteLessonAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db, profile } = await requireAdmin();
  const denied = await ownerOnly(profile.role);
  if (denied) return denied;
  const { data } = await db.from("lessons").delete().eq("id", str(fd, "id")).select("class_id, tute_pdf_url").maybeSingle();
  if (data?.tute_pdf_url) await db.storage.from("tute-pdfs").remove([data.tute_pdf_url]);
  revalidatePath(`/admin/classes/${data?.class_id ?? ""}`);
  return { ok: true, message: await m("lessonDeleted") };
}

// ─────────────────────────── Enrollments ───────────────────────────
export async function reviewEnrollmentAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const decision = str(fd, "decision");
  if (decision !== "approved" && decision !== "rejected") return { error: await m("decision") };
  const explicitNote = optStr(fd, "admin_note");
  const updatePayload: { status: string; admin_note?: string | null } = { status: decision };
  if (explicitNote !== null) {
    updatePayload.admin_note = explicitNote;
  } else if (decision === "rejected") {
    updatePayload.admin_note = "Slip unclear or amount incorrect. Please re-upload.";
  }
  const { error } = await db.from("enrollments").update(updatePayload).eq("id", str(fd, "id"));
  if (error) return fail(error, await m("fail.update"));
  revalidatePath("/admin", "layout");
  return { ok: true, message: decision === "approved" ? await m("approved") : await m("rejected") };
}

/** Grant access without a slip (cash payments at physical centers). */
export async function grantAccessAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const who = toStudentId(str(fd, "student")).toUpperCase().replace(/[^A-Z0-9/-]/g, "").slice(0, 30);
  if (!who) return { error: await m("noStudent") };
  const classId = str(fd, "class_id");
  const month = str(fd, "month");
  if (!MONTH_RE.test(month)) return { error: await m("month") };
  const mobile = normalizeMobile(who);
  const { data: hits } = mobile
    ? await db.from("profiles").select("id, full_name").eq("mobile", mobile).limit(1)
    : await db.from("profiles").select("id, full_name").or(`student_id.eq.${who},nic.eq.${who}`).limit(1);
  const student = hits?.[0];
  if (!student) return { error: await m("noStudent") };
  const { data: cls } = await db.from("classes").select("fee").eq("id", classId).maybeSingle();
  const { error } = await db.from("enrollments").upsert(
    { student_id: student.id, class_id: classId, month, status: "approved", amount: cls?.fee ?? null, admin_note: "Paid at class (cash)" },
    { onConflict: "student_id,class_id,month" },
  );
  if (error) return fail(error, await m("fail.grant"));
  revalidatePath("/admin", "layout");
  return { ok: true, message: await m("granted", { name: student.full_name }) };
}

// ───────────────────────────── Notices ─────────────────────────────
export async function createNoticeAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db, user } = await requireAdmin();
  const tag = str(fd, "tag");
  const row = {
    title: str(fd, "title"), content: str(fd, "content"), tag,
    is_pinned: bool(fd, "is_pinned"), class_id: optStr(fd, "class_id"), target_year: optInt(fd, "target_year"), created_by: user.id,
  };
  if (!row.title || !row.content) return { error: await m("noticeRequired") };
  if (!(NOTICE_TAGS as readonly string[]).includes(tag)) return { error: await m("tag") };
  const { error } = await db.from("notices").insert(row);
  if (error) return fail(error, await m("fail.publish"));
  revalidatePath("/admin/notices");
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: await m("noticePublished") };
}

export async function updateNoticeAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const id = str(fd, "id");
  const op = str(fd, "op");
  const { error } = op === "delete"
    ? await db.from("notices").delete().eq("id", id)
    : await db.from("notices").update({ is_pinned: op === "pin" }).eq("id", id);
  if (error) return fail(error, await m("fail.updateNotice"));
  revalidatePath("/admin/notices");
  return { ok: true, message: op === "delete" ? await m("noticeDeleted") : op === "pin" ? await m("pinned") : await m("unpinned") };
}

// ────────────────────────────── Exams ──────────────────────────────
export async function saveExamAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const id = optStr(fd, "id");
  const exam_type = str(fd, "exam_type") === "structured" ? "structured" : "mcq";
  const row = {
    class_id: str(fd, "class_id"), title: str(fd, "title"), description: optStr(fd, "description"), exam_type,
    duration_minutes: Number(str(fd, "duration_minutes") || 60), paper_pdf_url: optStr(fd, "paper_pdf_url"),
    opens_at: colomboLocalToISO(optStr(fd, "opens_at")), closes_at: colomboLocalToISO(optStr(fd, "closes_at")),
    is_published: bool(fd, "is_published"),
  };
  if (!row.title || !row.class_id) return { error: await m("examRequired") };
  if (row.duration_minutes < 1 || row.duration_minutes > 600) return { error: await m("duration") };
  if (row.opens_at && row.closes_at && row.closes_at <= row.opens_at) return { error: await m("closeAfterOpen") };
  if (id) {
    const { error } = await db.from("exams").update(row).eq("id", id);
    if (error) return fail(error, await m("fail.saveExam"));
    revalidatePath(`/admin/exams/${id}`);
    return { ok: true, message: await m("examSaved") };
  }
  const { data, error } = await db.from("exams").insert(row).select("id").single();
  if (error) return fail(error, await m("fail.createExam"));
  redirect(`/admin/exams/${data.id}`);
}

export async function deleteExamAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db, profile } = await requireAdmin();
  const denied = await ownerOnly(profile.role);
  if (denied) return denied;
  const { error } = await db.from("exams").delete().eq("id", str(fd, "id"));
  if (error) return fail(error, await m("fail.deleteExam"));
  redirect("/admin/exams");
}

export async function addQuestionAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const exam_id = str(fd, "exam_id");
  const options = [1, 2, 3, 4, 5].map((i) => str(fd, `option_${i}`)).filter(Boolean);
  const correct = Number(str(fd, "correct_answer")) - 1;
  if (!str(fd, "question_text")) return { error: await m("questionText") };
  if (options.length < 2) return { error: await m("twoOptions") };
  if (!(correct >= 0 && correct < options.length)) return { error: await m("correctOption") };
  const { count } = await db.from("exam_questions").select("id", { count: "exact", head: true }).eq("exam_id", exam_id);
  const { error } = await db.from("exam_questions").insert({
    exam_id, question_text: str(fd, "question_text"), options_json: options, correct_answer: correct,
    marks: Number(str(fd, "marks") || 1), explanation: optStr(fd, "explanation"), sort_order: (count ?? 0) + 1,
  });
  if (error) return fail(error, await m("fail.addQuestion"));
  revalidatePath(`/admin/exams/${exam_id}`);
  return { ok: true, message: await m("questionAdded") };
}

export async function deleteQuestionAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const { data } = await db.from("exam_questions").delete().eq("id", str(fd, "id")).select("exam_id").maybeSingle();
  revalidatePath(`/admin/exams/${data?.exam_id ?? ""}`);
  return { ok: true, message: await m("questionDeleted") };
}

export async function gradeSubmissionAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const score = Number(str(fd, "score"));
  const total = Number(str(fd, "total_marks") || 100);
  if (!Number.isFinite(score) || score < 0 || score > total) return { error: await m("score") };
  const { data, error } = await db.from("exam_submissions")
    .update({ score, total_marks: total, feedback: optStr(fd, "feedback"), status: "graded", graded_at: new Date().toISOString() })
    .eq("id", str(fd, "id")).select("exam_id").single();
  if (error) return fail(error, await m("fail.saveMarks"));
  revalidatePath(`/admin/exams/${data.exam_id}`);
  return { ok: true, message: await m("marksSaved") };
}

// ───────────────────────────── Students ─────────────────────────────
export async function resetPasswordAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db, user, profile } = await requireAdmin();
  const id = str(fd, "id");
  if (id === user.id) return { error: await m("ownReset") };
  const { data: target } = await db.from("profiles").select("role, full_name, student_id").eq("id", id).maybeSingle();
  if (!target) return { error: await m("noStudent") };
  if (target.role !== "student" && !isOwnerRole(profile.role)) return { error: await m("adminReset") };
  if (target.role === "developer" && profile.role !== "developer") return { error: await m("adminReset") };
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const temp = Array.from({ length: 10 }, () => alphabet[randomInt(alphabet.length)]).join("");
  const { error } = await createAdminClient().auth.admin.updateUserById(id, { password: temp });
  if (error) return fail(error, await m("fail.resetPassword"));
  const { recordAuditLog } = await import("@/lib/settings");
  await recordAuditLog({
    actorId: user.id,
    actorName: profile.full_name,
    actorRole: profile.role,
    category: target.role === "student" ? "student" : "staff",
    action: "password_reset",
    targetId: id,
    studentId: target.role === "student" ? id : null,
    studentName: target.full_name,
    studentCode: target.student_id,
    summary: `Reset password for ${target.full_name}`,
  });
  return { ok: true, message: await m("tempPassword", { temp }) };
}

/** Delete an account and everything tied to it (enrolments, marks, attendance, notifications cascade in the database). */
export async function deleteUserAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db, user, profile } = await requireAdmin();
  const id = str(fd, "id");
  if (!UUID_RE.test(id)) return { error: await m("noStudent") };
  if (id === user.id) return { error: await m("ownDelete") };
  const { data: target } = await db.from("profiles").select("role, full_name, student_id, mobile").eq("id", id).maybeSingle();
  if (!target) return { error: await m("noStudent") };
  if (!canDeleteAccount(profile.role, target.role)) return { error: await m("deleteDenied") };
  const { error } = await createAdminClient().auth.admin.deleteUser(id);
  if (error) return fail(error, await m("fail.deleteUser"));
  const { recordAuditLog } = await import("@/lib/settings");
  await recordAuditLog({
    actorId: user.id,
    actorName: profile.full_name,
    actorRole: profile.role,
    category: target.role === "student" ? "student" : "staff",
    action: "user_deleted",
    // The account is gone, so it can't be linked any more — name and ID stay in the text columns.
    studentName: target.full_name,
    studentCode: target.student_id,
    summary: `Deleted ${target.role} account: ${target.full_name}`,
    details: { role: target.role, mobile: target.mobile ?? null },
  });
  revalidatePath("/admin/students");
  revalidatePath("/admin/owner");
  return { ok: true, message: await m("userDeleted", { name: target.full_name }) };
}

export async function setRoleAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db, user, profile } = await requireAdmin();
  if (!isOwnerRole(profile.role)) return { error: await m("ownerOnlyRole") };
  const id = str(fd, "id");
  const role = str(fd, "role") === "admin" ? "admin" : "student";
  if (id === user.id) return { error: await m("ownRole") };
  const { data: target } = await db.from("profiles").select("full_name, role, student_id").eq("id", id).maybeSingle();
  if (!target) return { error: await m("noStudent") };
  if (isOwnerRole(target.role)) return { error: await m("ownerOnlyRole") };
  const { error } = await db.from("profiles").update({ role }).eq("id", id);
  if (error) return fail(error, await m("fail.changeRole"));
  const { recordAuditLog } = await import("@/lib/settings");
  await recordAuditLog({
    actorId: user.id,
    actorName: profile.full_name,
    actorRole: profile.role,
    category: "staff",
    action: role === "admin" ? "admin_promoted" : "admin_demoted",
    targetId: id,
    studentId: id,
    studentName: target.full_name,
    studentCode: target.student_id,
    summary: `${target.full_name}: ${target.role} → ${role}`,
    details: { prev_role: target.role, new_role: role },
  });
  revalidatePath("/admin/students");
  revalidatePath("/admin/owner");
  return { ok: true, message: await m("roleSet", { role }) };
}

// ────────────────────────────── Store ──────────────────────────────
export async function saveProductAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db, profile } = await requireAdmin();
  const denied = await ownerOnly(profile.role);
  if (denied) return denied;
  const id = optStr(fd, "id");
  const row = {
    title: str(fd, "title"), description: optStr(fd, "description"), price: Number(str(fd, "price") || 0),
    image_url: optStr(fd, "image_url"), is_active: bool(fd, "is_active"), product_type: "tute_book",
  };
  if (!row.title) return { error: await m("titleRequired") };
  const { error } = id ? await db.from("products").update(row).eq("id", id) : await db.from("products").insert(row);
  if (error) return fail(error, await m("fail.saveProduct"));
  revalidatePath("/admin/store");
  revalidatePath("/store");
  return { ok: true, message: await m("productSaved") };
}

export async function deleteProductAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db, profile } = await requireAdmin();
  const denied = await ownerOnly(profile.role);
  if (denied) return denied;
  const { error } = await db.from("products").delete().eq("id", str(fd, "id"));
  if (error) return { error: await m("productHasOrders") };
  revalidatePath("/admin/store");
  return { ok: true, message: await m("productDeleted") };
}

export async function reviewOrderAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const status = str(fd, "decision");
  if (!["approved", "rejected", "shipped"].includes(status)) return { error: await m("invalidStatus") };
  const { error } = await db.from("orders").update({ status, admin_note: optStr(fd, "admin_note") }).eq("id", str(fd, "id"));
  if (error) return fail(error, await m("fail.updateOrder"));
  revalidatePath("/admin", "layout");
  return { ok: true, message: await m(`order.${status}`) };
}

// ────────────────────────────── Events ──────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Posters are uploaded to the public class-banners bucket under "events/". */
const POSTER_RE = /^\/api\/storage\/public\/class-banners\/events\/[A-Za-z0-9_.-]+$/;

export async function saveEventAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db, user } = await requireAdmin();
  const id = optStr(fd, "id");
  const date = str(fd, "date"), start = str(fd, "start_time"), end = optStr(fd, "end_time");
  if (!DATE_RE.test(date) || !TIME_RE.test(start) || (end && !TIME_RE.test(end))) return { error: await m("event.time") };
  const starts_at = colomboLocalToISO(`${date}T${start}`);
  const ends_at = end ? colomboLocalToISO(`${date}T${end}`) : null;
  if (!starts_at || (end && !ends_at)) return { error: await m("event.time") };
  if (ends_at && ends_at < starts_at) return { error: await m("event.endAfterStart") };
  const classId = optStr(fd, "class_id");
  const year = optInt(fd, "target_year");
  const row = {
    title: str(fd, "title"), description: optStr(fd, "description"), starts_at, ends_at,
    venue: optStr(fd, "venue"), online_url: optStr(fd, "online_url"), poster_url: optStr(fd, "poster_url"),
    class_id: classId, target_year: year, is_published: bool(fd, "is_published"),
  };
  if (row.title.length < 2 || row.title.length > 160) return { error: await m("event.title") };
  if ((row.description ?? "").length > 4000 || (row.venue ?? "").length > 200) return { error: await m("event.tooLong") };
  if (row.online_url && !isHttps(row.online_url)) return { error: await m("liveHttps") };
  if (row.poster_url && !POSTER_RE.test(row.poster_url)) return { error: await m("event.poster") };
  if (classId && !UUID_RE.test(classId)) return { error: await m("event.class") };
  if (year !== null && !(AL_YEARS as readonly number[]).includes(year)) return { error: await m("event.year") };
  const { error } = id
    ? await db.from("events").update(row).eq("id", id)
    : await db.from("events").insert({ ...row, created_by: user.id });
  if (error) return fail(error, await m("fail.saveEvent"));
  revalidatePath("/admin/events");
  revalidatePath("/dashboard/events");
  return { ok: true, message: await m(id ? "event.updated" : "event.created") };
}

export async function updateEventAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db, profile } = await requireAdmin();
  const id = str(fd, "id"), op = str(fd, "op");
  if (!UUID_RE.test(id) || !["publish", "hide", "delete"].includes(op)) return { error: await m("event.invalid") };
  if (op === "delete") {
    const denied = await ownerOnly(profile.role);
    if (denied) return denied;
  }
  const { error } = op === "delete"
    ? await db.from("events").delete().eq("id", id)
    : await db.from("events").update({ is_published: op === "publish" }).eq("id", id);
  if (error) return fail(error, await m("fail.saveEvent"));
  revalidatePath("/admin/events");
  revalidatePath("/dashboard/events");
  return { ok: true, message: await m(`event.${op === "delete" ? "deleted" : op === "publish" ? "published" : "hidden"}`) };
}
