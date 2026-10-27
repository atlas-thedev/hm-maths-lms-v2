"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useT } from "@/i18n/client";

export type GridPhoto = { id: string; url: string; caption: string | null };

/** Photo grid with a full-screen viewer: arrow keys, swipe, Esc, and the neighbours are preloaded. */
export function PhotoGrid({ photos, title }: { photos: GridPhoto[]; title: string }) {
  const t = useT("landing.galleryPage");
  const [open, setOpen] = useState<number | null>(null);
  const touch = useRef<number | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const n = photos.length;

  const go = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + n) % n)), [n]);
  const close = useCallback(() => { setOpen(null); opener.current?.focus(); }, []);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(); else if (e.key === "ArrowRight") go(1); else if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, go, close]);

  const cur = open === null ? null : photos[open];
  return (
    <>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
        {photos.map((p, i) => (
          <li key={p.id}>
            <button type="button" onClick={(e) => { opener.current = e.currentTarget; setOpen(i); }} aria-label={`${t("open")} ${i + 1} / ${n}`}
              className="group relative block aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-200 shadow-sm ring-1 ring-black/5 transition hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500">
              <Image src={p.url} alt={p.caption ?? title} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px" className="object-cover transition duration-500 group-hover:scale-105" />
            </button>
          </li>
        ))}
      </ul>

      {cur && open !== null && (
        <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[90] flex flex-col bg-black text-white"
          onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => { const s = touch.current; touch.current = null; if (s === null) return; const dx = e.changedTouches[0].clientX - s; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); }}>
          <div className="flex items-center justify-between gap-3 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
            <p className="min-w-0 truncate text-sm font-semibold text-white/90">{title}</p>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs tabular-nums text-white/80">{t("counter", { i: open + 1, n })}</span>
              <button type="button" onClick={close} aria-label={t("close")} autoFocus className="grid h-11 w-11 place-items-center rounded-full bg-white/10 transition hover:bg-white/20"><X className="h-5 w-5" /></button>
            </div>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16" onClick={close}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={cur.id} src={cur.url} alt={cur.caption ?? title} onClick={(e) => e.stopPropagation()} className="max-h-full max-w-full select-none rounded-lg object-contain" draggable={false} />
            {n > 1 && <>
              <button type="button" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label={t("prev")} className="absolute left-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 transition hover:bg-white/25 sm:grid"><ChevronLeft className="h-6 w-6" /></button>
              <button type="button" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label={t("next")} className="absolute right-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 transition hover:bg-white/25 sm:grid"><ChevronRight className="h-6 w-6" /></button>
            </>}
          </div>
          <p className="min-h-[3.25rem] px-6 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 text-center text-sm text-white/85">{cur.caption}</p>
          {/* warm the next and previous photo */}
          {n > 1 && <div hidden aria-hidden>{[photos[(open + 1) % n], photos[(open - 1 + n) % n]].map((p) => <link key={p.id} rel="prefetch" as="image" href={p.url} />)}</div>}
        </div>
      )}
    </>
  );
}
