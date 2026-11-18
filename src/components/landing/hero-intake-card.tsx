"use client";
import Link from "next/link";
import { motion, type MotionValue, useReducedMotion, useTransform } from "framer-motion";
import { ArrowRight, CalendarDays, Sparkles } from "lucide-react";
import { useLocale } from "@/i18n/client";
import type { HeroPromoSettings } from "@/lib/settings";

const ease = [0.22, 1, 0.36, 1] as const;

function copy(promo: HeroPromoSettings, locale: string) {
  const si = locale === "si";
  return {
    badge: (si ? promo.badgeSi : promo.badgeEn) || promo.badgeEn || promo.badgeSi,
    title: (si ? promo.titleSi : promo.titleEn) || promo.titleEn || promo.titleSi,
    subtitle: (si ? promo.subtitleSi : promo.subtitleEn) || promo.subtitleEn || promo.subtitleSi,
    cta: (si ? promo.ctaSi : promo.ctaEn) || promo.ctaEn || promo.ctaSi,
  };
}

/**
 * Interactive Hero Intake / New Batch spotlight card.
 * Replaces the left desktop student silhouette on lg+ screens with scroll parallax,
 * and shows as a compact clickable card on smaller screens.
 */
export function HeroIntakeCard({
  promo,
  progress,
}: {
  promo: HeroPromoSettings;
  progress: MotionValue<number>;
}) {
  const locale = useLocale();
  const reduce = useReducedMotion();
  const text = copy(promo, locale);

  const y = useTransform(progress, [0, 1], [0, -44]);
  const x = useTransform(progress, [0, 1], [0, -56]);
  const opacity = useTransform(progress, [0, 0.82], [1, 0.1]);

  if (!promo.enabled) return null;

  return (
    <>
      {/* Desktop (lg+): Sits in the left spotlight zone where the student silhouette stood */}
      <motion.div
        style={reduce ? undefined : { x, y, opacity }}
        initial={reduce ? undefined : { opacity: 0, x: -32, y: 20 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.95, delay: 0.2, ease }}
        className="pointer-events-auto hidden lg:block absolute bottom-16 left-[3%] z-20 w-[248px] xl:bottom-20 xl:left-[5.5%] xl:w-[276px]"
      >
        <Link
          href={promo.href || "/timetable"}
          className="group relative block overflow-hidden rounded-[1.75rem] border border-white/20 bg-black/45 p-5 text-left text-white shadow-[0_24px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-xl ring-1 ring-brand-400/25 transition duration-300 hover:-translate-y-1.5 hover:border-brand-300/60 hover:bg-black/55 hover:shadow-[0_28px_70px_-12px_hsl(var(--brand-500)/0.45)]"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-brand-500/30 blur-2xl transition duration-500 group-hover:scale-125 group-hover:bg-brand-400/40"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition duration-700 group-hover:translate-x-full"
          />

          <div className="relative flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-300/40 bg-brand-500/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-100">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-300" />
              {text.badge}
            </span>
            <CalendarDays className="h-4 w-4 text-brand-200/80 transition group-hover:text-white" />
          </div>

          <div className="relative mt-3.5 flex items-baseline gap-2">
            <span className="bg-gradient-to-br from-white via-brand-100 to-brand-300 bg-clip-text font-display text-4xl font-black leading-none tracking-tight text-transparent xl:text-[2.65rem]">
              {promo.year}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-brand-200">
              <Sparkles className="h-3.5 w-3.5" /> A/L
            </span>
          </div>

          <h2 className="relative mt-2 font-display text-base font-extrabold leading-snug text-white xl:text-[1.06rem]">
            {text.title}
          </h2>
          {text.subtitle ? (
            <p className="relative mt-1.5 line-clamp-3 text-xs leading-relaxed text-white/75">
              {text.subtitle}
            </p>
          ) : null}

          <div className="relative mt-4 inline-flex w-full items-center justify-between gap-2 rounded-2xl bg-brand-500 px-3.5 py-2.5 text-xs font-bold text-white shadow-md shadow-black/30 transition group-hover:bg-brand-400">
            <span className="truncate">{text.cta}</span>
            <ArrowRight className="h-4 w-4 shrink-0 transition group-hover:translate-x-1" />
          </div>
        </Link>
      </motion.div>
    </>
  );
}

/** Compact mobile/tablet clickable intake promo bar shown inside the centered hero stack (< lg). */
export function HeroIntakeMobileBar({ promo }: { promo: HeroPromoSettings }) {
  const locale = useLocale();
  if (!promo.enabled) return null;
  const text = copy(promo, locale);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.65, ease }}
      className="mt-5 w-full max-w-md lg:hidden"
    >
      <Link
        href={promo.href || "/timetable"}
        className="group flex items-center gap-3.5 rounded-2xl border border-brand-300/35 bg-black/45 p-3.5 text-left text-white shadow-lg shadow-black/30 backdrop-blur-xl transition hover:border-brand-300/60 hover:bg-black/55"
      >
        <div className="flex h-12 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-500 text-white shadow-inner">
          <span className="font-display text-base font-black leading-none">{promo.year}</span>
          <span className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-white/90">A/L</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-300" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-200">{text.badge}</span>
          </div>
          <p className="mt-0.5 truncate font-display text-sm font-bold text-white">{text.title}</p>
          <p className="truncate text-[11px] text-white/75">{text.cta}</p>
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white transition group-hover:bg-brand-500">
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </span>
      </Link>
    </motion.div>
  );
}
