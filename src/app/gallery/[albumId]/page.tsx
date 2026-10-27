import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Images } from "lucide-react";
import { PhotoGrid } from "@/components/gallery/photo-grid";
import { getSession } from "@/lib/auth";
import { galleryUrl } from "@/lib/gallery";
import { getAlbum } from "@/lib/gallery-data";
import { getFormat, getT } from "@/i18n/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: { params: Promise<{ albumId: string }> }) {
  const { albumId } = await params;
  if (!UUID_RE.test(albumId)) return {};
  const { db } = await getSession();
  const found = await getAlbum(db, albumId);
  return found ? { title: found.album.title, description: found.album.description ?? undefined } : {};
}

export default async function AlbumPage({ params }: { params: Promise<{ albumId: string }> }) {
  const { albumId } = await params;
  if (!UUID_RE.test(albumId)) notFound();
  const { db } = await getSession();
  const [t, f, found] = await Promise.all([getT("landing"), getFormat(), getAlbum(db, albumId)]);
  if (!found || !found.album.is_published) notFound();
  const { album, photos } = found;
  return (
    <>
      <section className="bg-landing-hero pb-10 pt-28 text-white sm:pb-14 sm:pt-32">
        <div className="container">
          <Link href="/gallery" className="inline-flex items-center gap-1.5 text-sm font-medium text-white/75 transition hover:text-white"><ArrowLeft className="h-4 w-4" /> {t("galleryPage.back")}</Link>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{album.title}</h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-white/75">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">{t(`galleryPage.categories.${album.category}`)}</span>
            <span className="inline-flex items-center gap-1.5"><Images className="h-4 w-4" /> {t("galleryPage.photosN", { n: photos.length })}</span>
            {album.taken_on && <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> {f.date(album.taken_on)}</span>}
          </p>
          {album.description && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80">{album.description}</p>}
        </div>
      </section>
      <section className="container py-8 sm:py-12">
        {photos.length ? <PhotoGrid title={album.title} photos={photos.map((p) => ({ id: p.id, url: galleryUrl(p.path), caption: p.caption }))} />
          : <p className="py-16 text-center text-slate-500">{t("galleryPage.empty")}</p>}
      </section>
    </>
  );
}
