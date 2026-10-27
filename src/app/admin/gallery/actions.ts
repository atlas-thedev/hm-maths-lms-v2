"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { MAX_PHOTOS_PER_UPLOAD, PHOTO_PATH_RE, isGalleryCategory } from "@/lib/gallery";
import { recordAuditLog } from "@/lib/settings";
import type { ActionState } from "@/lib/types";
import { getT } from "@/i18n/server";

/* Admins, owners and developers may all add and remove gallery photos (row-level security checks it again). */
const m = async (k: string, v?: Record<string, string | number>) => (await getT("errors.admin"))(k, v);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const fail = (e: { message: string } | null, fallback: string): ActionState => ({ error: e?.message ? `${fallback}: ${e.message}` : fallback });
const refresh = (albumId?: string) => {
  revalidatePath("/gallery"); revalidatePath("/"); revalidatePath("/admin/gallery");
  if (albumId) { revalidatePath(`/gallery/${albumId}`); revalidatePath(`/admin/gallery/${albumId}`); }
};

export async function saveAlbumAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db, user } = await requireAdmin();
  const id = str(fd, "id");
  const takenOn = str(fd, "taken_on");
  const row = {
    title: str(fd, "title"),
    category: str(fd, "category"),
    taken_on: /^\d{4}-\d{2}-\d{2}$/.test(takenOn) ? takenOn : null,
    description: str(fd, "description").slice(0, 1000) || null,
    is_published: fd.get("is_published") === "on",
  };
  if (row.title.length < 2 || row.title.length > 120) return { error: await m("galleryTitle") };
  if (!isGalleryCategory(row.category)) return { error: await m("galleryCategory") };
  if (id) {
    if (!UUID_RE.test(id)) return { error: await m("galleryNotFound") };
    const { error } = await db.from("gallery_albums").update(row).eq("id", id);
    if (error) return fail(error, await m("fail.gallery"));
    refresh(id);
    return { ok: true, message: await m("albumSaved") };
  }
  const { data, error } = await db.from("gallery_albums").insert({ ...row, created_by: user.id }).select("id").single();
  if (error) return fail(error, await m("fail.gallery"));
  refresh();
  redirect(`/admin/gallery/${data.id}`);
}

export async function deleteAlbumAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db, user, profile } = await requireAdmin();
  const id = str(fd, "id");
  if (!UUID_RE.test(id)) return { error: await m("galleryNotFound") };
  const { data: album } = await db.from("gallery_albums").select("title").eq("id", id).maybeSingle();
  const { data: photos } = await db.from("gallery_photos").select("path").eq("album_id", id);
  const paths = (photos ?? []).map((p) => p.path as string);
  if (paths.length) await db.storage.from("gallery").remove(paths);
  const { error } = await db.from("gallery_albums").delete().eq("id", id);
  if (error) return fail(error, await m("fail.gallery"));
  await recordAuditLog({ actorId: user.id, actorName: profile.full_name, actorRole: profile.role, category: "settings", action: "settings_changed",
    summary: `Deleted gallery album “${album?.title ?? id}” (${paths.length} photos)` });
  refresh(id);
  redirect("/admin/gallery");
}

/** The browser uploads the files straight to storage, then tells us which paths to add. */
export async function addPhotosAction(albumId: string, paths: string[]): Promise<ActionState> {
  const { db } = await requireAdmin();
  if (!UUID_RE.test(albumId)) return { error: await m("galleryNotFound") };
  const clean = [...new Set(paths)].filter((p) => PHOTO_PATH_RE.test(p) && p.startsWith(`${albumId}/`)).slice(0, MAX_PHOTOS_PER_UPLOAD);
  if (!clean.length) return { error: await m("galleryPaths") };
  const { data: album } = await db.from("gallery_albums").select("id").eq("id", albumId).maybeSingle();
  if (!album) return { error: await m("galleryNotFound") };
  const { data: last } = await db.from("gallery_photos").select("sort_order").eq("album_id", albumId).order("sort_order", { ascending: false }).limit(1);
  const start = ((last?.[0]?.sort_order as number | undefined) ?? 0) + 1;
  const { error } = await db.from("gallery_photos").insert(clean.map((path, i) => ({ album_id: albumId, path, sort_order: start + i })));
  if (error) return fail(error, await m("fail.gallery"));
  refresh(albumId);
  return { ok: true, message: await m("photosAdded", { n: clean.length }) };
}

export async function deletePhotoAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const id = str(fd, "id");
  if (!UUID_RE.test(id)) return { error: await m("galleryNotFound") };
  const { data: photo } = await db.from("gallery_photos").select("path, album_id").eq("id", id).maybeSingle();
  if (!photo) return { error: await m("galleryNotFound") };
  await db.storage.from("gallery").remove([photo.path as string]);
  const { error } = await db.from("gallery_photos").delete().eq("id", id);
  if (error) return fail(error, await m("fail.gallery"));
  refresh(photo.album_id as string);
  return { ok: true, message: await m("photoDeleted") };
}

export async function updateCaptionAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const id = str(fd, "id");
  if (!UUID_RE.test(id)) return { error: await m("galleryNotFound") };
  const { data, error } = await db.from("gallery_photos").update({ caption: str(fd, "caption").slice(0, 200) || null }).eq("id", id).select("album_id").maybeSingle();
  if (error) return fail(error, await m("fail.gallery"));
  if (data) refresh(data.album_id as string);
  return { ok: true, message: await m("captionSaved") };
}

/** The cover is simply the first photo — move this one to the front. */
export async function makeCoverAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const id = str(fd, "id");
  if (!UUID_RE.test(id)) return { error: await m("galleryNotFound") };
  const { data: photo } = await db.from("gallery_photos").select("album_id").eq("id", id).maybeSingle();
  if (!photo) return { error: await m("galleryNotFound") };
  const { data: first } = await db.from("gallery_photos").select("sort_order").eq("album_id", photo.album_id).order("sort_order").limit(1);
  const { error } = await db.from("gallery_photos").update({ sort_order: ((first?.[0]?.sort_order as number | undefined) ?? 0) - 1 }).eq("id", id);
  if (error) return fail(error, await m("fail.gallery"));
  refresh(photo.album_id as string);
  return { ok: true, message: await m("coverSet") };
}
