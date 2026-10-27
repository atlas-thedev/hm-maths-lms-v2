export const GALLERY_CATEGORIES = ["class", "function", "group", "trip", "other"] as const;
export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];
export const isGalleryCategory = (v: unknown): v is GalleryCategory => (GALLERY_CATEGORIES as readonly unknown[]).includes(v);

export interface AlbumRow {
  id: string; title: string; category: GalleryCategory; taken_on: string | null; description: string | null; is_published: boolean; created_at: string;
}
export interface PhotoRow { id: string; album_id: string; path: string; caption: string | null; sort_order: number; created_at: string }
export interface AlbumCard extends AlbumRow { cover: string | null; count: number }

/** Public URL of a photo in the 'gallery' bucket (same for server and browser). */
export const galleryUrl = (path: string) => `/api/storage/public/gallery/${path.split("/").map(encodeURIComponent).join("/")}`;

export const MAX_PHOTOS_PER_UPLOAD = 40;
export const PHOTO_PATH_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9_.-]{6,80}$/;
