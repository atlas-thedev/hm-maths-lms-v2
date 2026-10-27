import "server-only";
import type { DbClient } from "@/lib/db/types";
import { galleryUrl, isGalleryCategory, type AlbumCard, type AlbumRow, type GalleryCategory, type PhotoRow } from "@/lib/gallery";

const byOrder = (a: { sort_order: number; created_at: string }, b: { sort_order: number; created_at: string }) =>
  a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at);

/** Albums newest first, each with its cover (first photo) and photo count. Row-level security hides unpublished albums from visitors. */
export async function getAlbumCards(db: DbClient, category?: string | null): Promise<AlbumCard[]> {
  let q = db.from("gallery_albums").select("*, gallery_photos(path, sort_order, created_at)")
    .order("taken_on", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
  if (isGalleryCategory(category)) q = q.eq("category", category);
  const { data } = await q;
  type Row = AlbumRow & { gallery_photos: { path: string; sort_order: number; created_at: string }[] };
  return ((data ?? []) as Row[]).map(({ gallery_photos, ...a }) => {
    const photos = [...gallery_photos].sort(byOrder);
    return { ...a, cover: photos[0] ? galleryUrl(photos[0].path) : null, count: photos.length };
  });
}

export async function getAlbum(db: DbClient, id: string): Promise<{ album: AlbumRow; photos: PhotoRow[] } | null> {
  const { data: album } = await db.from("gallery_albums").select("*").eq("id", id).maybeSingle();
  if (!album) return null;
  const { data } = await db.from("gallery_photos").select("*").eq("album_id", id);
  return { album: album as AlbumRow, photos: ((data ?? []) as PhotoRow[]).sort(byOrder) };
}

/** Newest photos across published albums, for the home page strip. */
export async function getLatestPhotos(db: DbClient, limit = 9) {
  const { data } = await db.from("gallery_photos").select("id, path, caption, album_id, gallery_albums!inner(title, is_published)")
    .order("created_at", { ascending: false }).limit(limit);
  type Row = { id: string; path: string; caption: string | null; album_id: string; gallery_albums: { title: string; is_published: boolean } };
  return ((data ?? []) as unknown as Row[]).filter((r) => r.gallery_albums?.is_published).map((r) => ({ id: r.id, url: galleryUrl(r.path), alt: r.caption ?? r.gallery_albums.title, href: `/gallery/${r.album_id}` }));
}
export type { GalleryCategory };
