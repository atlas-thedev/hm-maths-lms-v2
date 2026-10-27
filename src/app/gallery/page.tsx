import Link from "next/link";
import Image from "next/image";
import { Images } from "lucide-react";
import { getSession } from "@/lib/auth";
import { GALLERY_CATEGORIES, isGalleryCategory } from "@/lib/gallery";
import { getAlbumCards } from "@/lib/gallery-data";
import { cn } from "@/lib/utils";
import { getFormat, getT } from "@/i18n/server";
import { getBrand } from "@/lib/settings";

export async function generateMetadata() {
  const t = await getT("landing");
  return { title: t("galleryPage.title"), description: t("galleryPage.subtitle"), alternates: { canonical: "/gallery" } };
}

export default async function GalleryPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const category = isGalleryCategory(c) ? c : null;
  const { db } = await getSession();
  const [t, f, albums, brand] = await Promise.all([getT("landing"), getFormat(), getAlbumCards(db, category), getBrand()]);
  const chip = (active: boolean) => cn("rounded-full border px-4 py-2 text-sm font-semibold transition", active ? "border-brand-500 bg-brand-500 text-white" : "border-white/20 bg-white/5 text-white/90 hover:bg-white/15");
  return (
    <>
      <section className="bg-landing-hero pb-12 pt-28 text-white sm:pb-16 sm:pt-32">
        <div className="container">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-300"><Images className="h-4 w-4" /> {brand.name}</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{t("galleryPage.title")}</h1>
          <p className="mt-3 max-w-2xl text-base text-white/75">{t("galleryPage.subtitle")}</p>
          <nav aria-label={t("galleryPage.title")} className="mt-7 flex flex-wrap gap-2">
            <Link href="/gallery" className={chip(!category)} aria-current={!category ? "page" : undefined}>{t("galleryPage.all")}</Link>
            {GALLERY_CATEGORIES.map((k) => <Link key={k} href={`/gallery?c=${k}`} className={chip(category === k)} aria-current={category === k ? "page" : undefined}>{t(`galleryPage.categories.${k}`)}</Link>)}
          </nav>
        </div>
      </section>
      <section className="container py-10 sm:py-14">
        {!albums.length ? (
          <div className="mx-auto max-w-md rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-14 text-center">
            <Images className="mx-auto h-10 w-10 text-slate-400" />
            <h2 className="mt-3 font-display text-lg font-bold">{t("galleryPage.empty")}</h2>
            <p className="mt-1 text-sm text-slate-500">{t("galleryPage.emptyText")}</p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((a) => (
              <li key={a.id}>
                <Link href={`/gallery/${a.id}`} className="group relative block aspect-[4/3] overflow-hidden rounded-3xl bg-slate-200 shadow-soft ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-xl">
                  {a.cover ? <Image src={a.cover} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px" className="object-cover transition duration-700 group-hover:scale-105" />
                    : <span className="absolute inset-0 grid place-items-center bg-gradient-brand text-white/80"><Images className="h-12 w-12" /></span>}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700 shadow">{t(`galleryPage.categories.${a.category}`)}</span>
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <h2 className="line-clamp-2 font-display text-lg font-bold leading-snug drop-shadow">{a.title}</h2>
                    <p className="mt-0.5 text-xs text-white/85">{t("galleryPage.photosN", { n: a.count })}{a.taken_on ? ` · ${f.date(a.taken_on)}` : ""}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
