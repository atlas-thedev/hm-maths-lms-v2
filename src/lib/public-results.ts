import "server-only";
import type { DbClient } from "@/lib/db/types";

export type StudentResult = { id: string; name: string; exam_year: number; exam_number: string; grades: string; distinction: string; photo_url: string; is_published: boolean; created_at: string };
export type TeacherPortrait = { id: string; photo_url: string };

export async function getTeacherPortraits(db: DbClient): Promise<TeacherPortrait[]> {
  const { data, error } = await db.from("teacher_portraits").select("id, photo_url").order("created_at");
  if (error) { console.error("Could not load teacher portraits", error); return []; }
  return (data ?? []) as TeacherPortrait[];
}
export async function getStudentResults(db: DbClient, includeDrafts = false): Promise<StudentResult[]> {
  let query = db.from("student_results").select("*").order("exam_year", { ascending: false }).order("created_at", { ascending: false });
  if (!includeDrafts) query = query.eq("is_published", true);
  const { data, error } = await query;
  if (error) { console.error("Could not load student results", error); return []; }
  return (data ?? []) as StudentResult[];
}
