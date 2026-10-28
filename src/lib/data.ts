import "server-only";
import type { DbClient } from "@/lib/db/types";
import type { ClassRow, Enrollment, Lesson, Notice } from "@/lib/types";
import { LIVE_DURATION_MINUTES, LIVE_GRACE_MINUTES, LIVE_UNLOCK_MINUTES } from "@/lib/constants";

export type EnrollmentWithClass = Enrollment & { classes: ClassRow | null };

export async function getMyEnrollments(db: DbClient, uid: string) {
  const { data } = await db.from("enrollments").select("*, classes(*)").eq("student_id", uid).order("month", { ascending: false });
  return (data ?? []) as EnrollmentWithClass[];
}

/** Class + the months this user may open (all lesson months for free classes / admins). */
export async function getClassAccess(db: DbClient, uid: string, classId: string, isAdmin: boolean) {
  const { data: cls } = await db.from("classes").select("*").eq("id", classId).maybeSingle();
  if (!cls) return null;
  const c = cls as ClassRow;
  let months: string[];
  if (c.is_free || isAdmin) {
    const { data } = await db.from("lessons").select("month").eq("class_id", classId);
    months = [...new Set((data ?? []).map((r) => r.month as string))];
  } else {
    const { data } = await db.from("enrollments").select("month").eq("student_id", uid).eq("class_id", classId).eq("status", "approved");
    months = (data ?? []).map((r) => r.month as string);
    // Also check if student has access via an approved parent combo pack
    const { data: comboLinks } = await db.from("combo_items").select("combo_id").eq("class_id", classId);
    if (comboLinks && comboLinks.length > 0) {
      const comboIds = comboLinks.map((x) => x.combo_id as string);
      const { data: comboEnrollments } = await db.from("enrollments").select("month").eq("student_id", uid).in("class_id", comboIds).eq("status", "approved");
      if (comboEnrollments && comboEnrollments.length > 0) {
        months = [...new Set([...months, ...comboEnrollments.map((r) => r.month as string)])];
      }
    }
  }
  months.sort().reverse();
  return { cls: c, months };
}

export async function getNotices(db: DbClient, limit = 50, tag?: string) {
  let q = db.from("notices").select("*").order("is_pinned", { ascending: false }).order("created_at", { ascending: false }).limit(limit);
  if (tag) q = q.eq("tag", tag);
  const { data } = await q;
  return (data ?? []) as Notice[];
}

/** Lessons with a live session that has not ended yet (RLS limits to accessible classes/months). */
export async function getUpcomingLive(db: DbClient, limit = 10) {
  // Longest possible session (10 h) + grace, then trim precisely with liveWindow().
  const since = new Date(Date.now() - (600 + LIVE_GRACE_MINUTES) * 60 * 1000).toISOString();
  const { data } = await db.from("lessons").select("*, classes(title, duration_minutes)").not("live_start_time", "is", null)
    .eq("is_cancelled", false).gte("live_start_time", since).order("live_start_time").limit(limit + 10);
  type Row = Lesson & { classes: { title: string; duration_minutes: number } | null };
  return ((data ?? []) as Row[]).filter((l) => !liveWindow(l, l.classes?.duration_minutes)?.ended).slice(0, limit);
}

/**
 * Live links the current user may open right now. RLS on lesson_live_links only returns rows whose
 * join window is open (20 min before start → end + grace) for classes/months the student paid for.
 */
export async function getLiveLinks(db: DbClient, lessonIds: string[]) {
  if (!lessonIds.length) return new Map<string, string>();
  const { data } = await db.from("lesson_live_links").select("lesson_id, live_url").in("lesson_id", lessonIds);
  return new Map((data ?? []).map((r) => [r.lesson_id as string, r.live_url as string]));
}

/** Session length: lesson override → class default → global default. */
export const sessionMinutes = (lesson: Pick<Lesson, "duration_minutes">, classMinutes?: number | null) =>
  lesson.duration_minutes ?? classMinutes ?? LIVE_DURATION_MINUTES;

/** Join window of a session. The link itself only arrives (via RLS) while `open` is true. */
export function liveWindow(lesson: Pick<Lesson, "live_start_time" | "duration_minutes" | "is_cancelled">, classMinutes?: number | null, now = Date.now()) {
  if (!lesson.live_start_time) return null;
  const minutes = sessionMinutes(lesson, classMinutes);
  const start = new Date(lesson.live_start_time).getTime();
  const unlock = start - LIVE_UNLOCK_MINUTES * 60 * 1000;
  const end = start + minutes * 60 * 1000;
  const close = end + LIVE_GRACE_MINUTES * 60 * 1000;
  const open = !lesson.is_cancelled && now >= unlock && now < close;
  return { startISO: new Date(start).toISOString(), endISO: new Date(end).toISOString(), closeISO: new Date(close).toISOString(), minutes, open, ended: now >= close, cancelled: lesson.is_cancelled };
}
