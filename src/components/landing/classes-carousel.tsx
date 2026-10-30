"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ClassBanner, type BannerClass } from "@/components/class-banner";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { SectionTitle } from "./section-title";

export type CarouselClass = {
  id: string | null; title: string; type: string; year: number | null; town: string | null;
  schedule: string | null; fee: number; isFree: boolean; lines: string[]; banner: string | null;
  /** Everything the banner template needs (set for real classes). */
  bannerClass?: BannerClass;
};

export function ClassesCarousel({ classes }: { classes: CarouselClass[] }) {
  const t = useT("landing.classes");
  const tc = useT("common");
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const onScroll = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const w = card ? card.offsetWidth + 20 : 1;
    setActive(Math.min(classes.length - 1, Math.round(el.scrollLeft / w)));
  }, [classes.length]);

  useEffect(() => { onScroll(); }, [onScroll]);
  const go = (idx: number) => {
    const el = track.current;
    const card = el?.children[idx] as HTMLElement | undefined;
    if (el && card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: "smooth" });
  };

  return (
    <section id="classes" className="relative scroll-mt-24 py-14 sm:py-24">
      <SectionTitle label={t("label")} title={t("title")} subtitle={t("subtitle")} />
      <div className="container mt-12">
        <div ref={track} onScroll={onScroll} className="scrollbar-none -mx-4 -mb-8 -mt-4 flex snap-x snap-mandatory scroll-px-4 gap-5 overflow-x-auto px-4 pb-10 pt-5">
          {classes.map((c, i) => {
            const href = c.id ? (c.isFree ? "/dashboard/free-zone" : `/dashboard/store/class/${c.id}`) : "/register";
            return (
              <motion.div key={(c.id ?? "p") + i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: Math.min(i, 4) * 0.08, duration: 0.6 }}
                className="w-[82%] shrink-0 snap-start sm:w-[46%] lg:w-[31.5%]">
                <Link href={href} className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-teal-100 bg-white shadow-soft transition duration-300 hover:-translate-y-1.5 hover:border-teal-300 hover:shadow-lift dark:border-white/10 dark:bg-slate-900">
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
                      <span className="rounded-full bg-teal-50 px-2.5 py-1 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">{tc(`classTypes.${c.type}`)}</span>
                      {c.year ? <span className="rounded-full bg-brand-50 px-2.5 py-1 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">{tc("alBatch", { year: c.year })}</span> : null}
                    </div>
                    <h3 className="mt-3.5 font-display text-base sm:text-lg font-bold text-ink group-hover:text-teal-600 dark:text-white line-clamp-2 h-[3.25rem] flex items-start">
                      {c.title}
                    </h3>
                    {c.lines.length ? (
                      <div className="mt-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t("thisMonth")}</p>
                        <ul className="mt-1.5 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                          {c.lines.map((l, k) => (
                            <li key={k} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-teal-500 to-brand-400" />{l}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <div className="mt-auto border-t border-slate-100 pt-3 dark:border-white/5 flex items-center justify-between gap-2">
                      <span className="whitespace-nowrap font-display text-base sm:text-lg font-bold text-ink dark:text-white">
                        {!c.id ? null : c.isFree ? t("free") : (
                          <>
                            LKR {c.fee.toLocaleString("en-LK")}
                            <span className="ml-1 text-[11px] font-normal text-slate-500">/මසකට</span>
                          </>
                        )}
                      </span>
                      <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs sm:text-sm font-semibold text-teal-700 transition group-hover:translate-x-0.5">
                        {t("enroll")} →
                      </span>
                    </div>
                  </div>
                  <ClassBanner cls={c.bannerClass ?? { banner_url: c.banner, class_type: c.type, title: c.title }} className="aspect-[16/9]" />
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="flex gap-1.5">
            {classes.map((_, i) => (
              <button key={i} type="button" onClick={() => go(i)} aria-label={t("goTo", { n: i + 1 })}
                className={cn("h-2 rounded-full transition-all", i === active ? "w-7 bg-gradient-to-r from-teal-700 to-teal-600" : "w-2 bg-teal-200 hover:bg-teal-300")} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/store" className="mr-2 hidden text-sm font-semibold text-teal-700 hover:underline sm:block">{t("viewAll")}</Link>
            <button type="button" onClick={() => go(Math.max(0, active - 1))} aria-label={t("previous")}
              className="grid h-11 w-11 place-items-center rounded-full border border-teal-200 bg-white text-teal-700 shadow-sm transition hover:border-teal-400 dark:bg-white/5 dark:text-white"><ArrowLeft className="h-5 w-5" /></button>
            <button type="button" onClick={() => go(Math.min(classes.length - 1, active + 1))} aria-label={t("next")}
              className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-r from-teal-700 to-teal-600 text-white shadow-md shadow-teal-600/30 transition hover:-translate-y-px"><ArrowRight className="h-5 w-5" /></button>
          </div>
        </div>
      </div>
    </section>
  );
}
