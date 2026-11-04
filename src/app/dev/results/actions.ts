"use server";
import { revalidatePath } from "next/cache";
import { requireDeveloper } from "@/lib/auth";
import { recordAuditLog } from "@/lib/settings";
import type { ActionState } from "@/lib/types";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const uuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const photo = (s: string, folder: string) => new RegExp(`^/api/storage/public/public-results/${folder}/[A-Za-z0-9_.%-]+$`).test(s) && !s.includes("..");
const refresh = () => { revalidatePath("/"); revalidatePath("/results"); revalidatePath("/dev/results"); };

// Remove replaced/deleted files only after their row is saved and only if no other row uses them.
async function removeUnusedPhoto(db: Awaited<ReturnType<typeof requireDeveloper>>["db"], url: string) {
  if (!photo(url, "students") && !photo(url, "teacher")) return;
  const [results, portraits] = await Promise.all([
    db.from("student_results").select("id").eq("photo_url", url).limit(1),
    db.from("teacher_portraits").select("id").eq("photo_url", url).limit(1),
  ]);
  if (results.error || portraits.error || results.data?.length || portraits.data?.length) return;
  const path = url.slice("/api/storage/public/public-results/".length);
  const { error } = await db.storage.from("public-results").remove([path]);
  if (error) console.error("Could not remove unused public photo", error);
}

export async function saveResultAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { db, user, profile } = await requireDeveloper();
  const id = text(fd, "id"), name = text(fd, "name"), year = text(fd, "exam_year"), examNumber = text(fd, "exam_number"), grades = text(fd, "grades"), distinction = text(fd, "distinction");
  const photoUrl = text(fd, "remove_photo") === "on" ? "" : text(fd, "photo_url");
  if (id && !uuid(id)) return { error: "Invalid result ID." };
  if (!name || name.length > 120 || examNumber.length > 40 || !grades || grades.length > 80 || distinction.length > 120) return { error: "Enter a name and grades within the field limits; the optional index number must be at most 40 characters." };
  if (!/^\d{4}$/.test(year) || Number(year) < 1900 || Number(year) > 2100) return { error: "Enter a valid four-digit exam year." };
  if (photoUrl && !photo(photoUrl, "students") && !/^\/images\/results-2025\/(district-02|district-04|district-12|maths-ict)\.webp$/.test(photoUrl)) return { error: "Please upload a valid student photo." };
  const old = id ? await db.from("student_results").select("photo_url").eq("id", id).maybeSingle() : null;
  if (old?.error) return { error: old.error.message };
  const row = { name, exam_year: Number(year), exam_number: examNumber, grades, distinction, photo_url: photoUrl, is_published: fd.get("is_published") === "on" };
  const { data, error } = id ? await db.from("student_results").update(row).eq("id", id).select("id").maybeSingle() : await db.from("student_results").insert(row).select("id").single();
  if (error || !data) return { error: error?.message || "Result not found." };
  if (old?.data?.photo_url && old.data.photo_url !== photoUrl) await removeUnusedPhoto(db, old.data.photo_url);
  await recordAuditLog({ actorId: user.id, actorName: profile.full_name, actorRole: profile.role, category: "settings", action: "settings_changed", summary: `${id ? "Updated" : "Added"} public result: ${name}`, details: { resultId: data.id } });
  refresh(); return { ok: true, message: "Result saved." };
}
export async function deleteResultAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { db, user, profile } = await requireDeveloper();
  const id = text(fd, "id"); if (!uuid(id)) return { error: "Invalid result ID." };
  const { data, error } = await db.from("student_results").delete().eq("id", id).select("id, photo_url").maybeSingle();
  if (error || !data) return { error: error?.message || "Result not found." };
  if (data.photo_url) await removeUnusedPhoto(db, data.photo_url);
  await recordAuditLog({ actorId: user.id, actorName: profile.full_name, actorRole: profile.role, category: "settings", action: "settings_changed", summary: "Deleted public result", details: { resultId: id } });
  refresh(); return { ok: true, message: "Result deleted." };
}
export async function addPortraitAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { db, user, profile } = await requireDeveloper();
  const url = text(fd, "photo_url"); if (!photo(url, "teacher")) return { error: "Upload a teacher photo first." };
  const { error } = await db.from("teacher_portraits").insert({ photo_url: url });
  if (error) return { error: error.message };
  await recordAuditLog({ actorId: user.id, actorName: profile.full_name, actorRole: profile.role, category: "settings", action: "settings_changed", summary: "Added teacher portrait" });
  refresh(); return { ok: true, message: "Photo added." };
}
export async function deletePortraitAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { db, user, profile } = await requireDeveloper();
  const id = text(fd, "id"); if (!uuid(id)) return { error: "Invalid photo ID." };
  const { data, error } = await db.from("teacher_portraits").delete().eq("id", id).select("id, photo_url").maybeSingle();
  if (error || !data) return { error: error?.message || "Photo not found." };
  if (data.photo_url) await removeUnusedPhoto(db, data.photo_url);
  await recordAuditLog({ actorId: user.id, actorName: profile.full_name, actorRole: profile.role, category: "settings", action: "settings_changed", summary: "Removed teacher portrait" });
  refresh(); return { ok: true, message: "Photo removed." };
}
