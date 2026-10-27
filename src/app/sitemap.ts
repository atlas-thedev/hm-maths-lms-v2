import type { MetadataRoute } from "next";
import { asService } from "@/lib/db/pg";
import { getBrand, getBrandSettings, getCenters } from "@/lib/settings";
import { absolute, centerSlug, ONLINE_SLUG } from "@/lib/seo";
import { galleryUrl } from "@/lib/gallery";

export const dynamic = "force-dynamic";

/** Everything public, with images, so search engines find the home page, every center page and every published album. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [brand, brandSettings, centers] = await Promise.all([getBrand(), getBrandSettings(), getCenters()]);
  const now = new Date();
  let albums: { id: string; created_at: Date; updated: Date | null; photos: string[] }[] = [];
  let classesChanged: Date | null = null;
  try {
    albums = await asService(async (c) => (await c.query(
      `select a.id, a.created_at, max(p.created_at) as updated,
              coalesce(array_agg(p.path order by p.sort_order, p.created_at) filter (where p.path is not null), '{}') as photos
         from public.gallery_albums a left join public.gallery_photos p on p.album_id = a.id
        where a.is_published group by a.id order by a.created_at desc limit 200`)).rows);
    classesChanged = (await asService(async (c) => (await c.query(`select max(created_at) as m from public.classes where is_active`)).rows[0]?.m)) ?? null;
  } catch { /* the sitemap still lists the static pages */ }

  const logo = absolute(brand.logo.image ?? "/icon-512.png");
  const homeImages = [absolute("/opengraph-image.jpg"), logo, ...(brandSettings.heroPhoto ? [absolute(brandSettings.heroPhoto)] : [absolute("/images/hasitha-hero.webp")]), ...(brandSettings.groupPhoto ? [absolute(brandSettings.groupPhoto)] : [])];

  return [
    { url: absolute("/"), lastModified: classesChanged ?? now, changeFrequency: "weekly", priority: 1, images: homeImages },
    { url: absolute("/combined-maths-classes"), lastModified: classesChanged ?? now, changeFrequency: "weekly", priority: 0.9 },
    ...centers.map((c) => ({ url: absolute(`/combined-maths-classes/${centerSlug(c)}`), lastModified: classesChanged ?? now, changeFrequency: "weekly" as const, priority: 0.85 })),
    { url: absolute(`/combined-maths-classes/${ONLINE_SLUG}`), lastModified: classesChanged ?? now, changeFrequency: "weekly", priority: 0.85 },
    { url: absolute("/store"), lastModified: classesChanged ?? now, changeFrequency: "weekly", priority: 0.8 },
    { url: absolute("/gallery"), lastModified: albums[0]?.updated ?? albums[0]?.created_at ?? now, changeFrequency: "weekly", priority: 0.6 },
    ...albums.map((a) => ({
      url: absolute(`/gallery/${a.id}`), lastModified: a.updated ?? a.created_at, changeFrequency: "monthly" as const, priority: 0.5,
      images: a.photos.slice(0, 20).map((p) => absolute(galleryUrl(p))),
    })),
    { url: absolute("/register"), lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: absolute("/login"), lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
