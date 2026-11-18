"use client";
import Link from "next/link";
import { motion, type MotionValue, useReducedMotion, useTransform } from "framer-motion";
import { ArrowRight, CalendarDays } from "lucide-react";
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
 * Architectural Hero Intake / New Batch callout pinned in the left studio spotlight
 * where the desktop student silhouette stood, visually echoing HeroYearBadge & HeroBanner.
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

  const y = useTransform(progress, [0, 1], [0, -36]);
  const x = useTransform(progress, [0, 1], [0, -48]);
  const opacity = useTransform(progress, [0, 0.85], [1, 0.12]);

  if (!promo.enabled) return null;

  return (
    <motion.div
      style={reduce ? undefined : { x, y, opacity }}
      initial={reduce ? undefined : { opacity: 0, x: -24, y: 12 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.85, delay: 0.18, ease }}
      className="pointer-events-auto hidden lg:block absolute left-5 top-[275px] z-20 w-[198px] xl:left-[max(2rem,calc(50%-600px))] xl:top-[285px] xl:w-[264px] 2xl:w-[272px]"
    >
      <Link
        href={promo.href || "/timetable"}
        className="group relative block overflow-hidden rounded-2xl border border-white/15 bg-[#081024]/85 p-4 text-left text-white shadow-[0_18px_42px_-12px_rgba(0,0,0,0.65)] backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-brand-400/55 hover:bg-[#0b1530]/95 xl:p-5"
      >
        <span aria-hidden className="absolute inset-y-4 left-0 w-[3px] rounded-r-full bg-brand-500 transition-all duration-300 group-hover:inset-y-2.5" />

        <div className="flex items-center justify-between gap-2 pl-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-300">
            {text.badge}
          </span>
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-white/45 transition-colors group-hover:text-brand-300" />
        </div>

        <div className="mt-2.5 flex items-baseline gap-2 pl-2">
          <span className="font-display text-[2.25rem] font-extrabold leading-none tracking-tight text-white tabular-nums xl:text-[3rem]">
            {promo.year}
          </span>
          <span className="rounded border border-white/20 bg-white/[0.06] px-1.5 py-0.5 font-display text-[10px] font-bold tracking-wider text-white/85">
            A/L
          </span>
        </div>

        <div className="ml-2 mt-2.5 h-[2px] w-9 rounded-full bg-brand-500/90 transition-all duration-300 group-hover:w-14" />

        <h2 className="mt-3 pl-2 font-display text-sm font-bold leading-snug text-white xl:text-[15px]">
          {text.title}
        </h2>
        {text.subtitle ? (
          <p className="mt-1.5 pl-2 text-[11px] leading-relaxed text-white/65 xl:text-xs">
            {text.subtitle}
          </p>
        ) : null}

        <div className="mt-4 ml-2 flex items-center justify-between border-t border-white/10 pt-3 text-xs font-semibold text-white/90 transition-colors group-hover:text-white">
          <span className="truncate">{text.cta}</span>
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-500 text-white transition-transform duration-300 group-hover:translate-x-0.5 group-hover:bg-brand-400">
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

/** Compact mobile/tablet clickable intake promo bar shown inside the centered hero stack (< lg). */
export function HeroIntakeMobileBar({ promo }: { promo: HeroPromoSettings }) {
  const locale = useLocale();
  if (!promo.enabled) return null;
  const text = copy(promo, locale);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.42, duration: 0.6, ease }}
      className="mt-5 w-full max-w-md lg:hidden"
    >
      <Link
        href={promo.href || "/timetable"}
        className="group flex items-center gap-3.5 rounded-2xl border border-white/15 bg-[#081024]/85 p-3 text-left text-white shadow-lg shadow-black/30 backdrop-blur-md transition hover:border-brand-400/50 hover:bg-[#0b1530]/95"
      >
        <div className="flex h-12 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-white/25 bg-[#101010] text-white">
          <span className="font-display text-base font-extrabold leading-none tabular-nums">{promo.year}</span>
          <span className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-brand-400">A/L</span>
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-brand-300">{text.badge}</span>
          <p className="mt-0.5 truncate font-display text-sm font-bold text-white">{text.title}</p>
          <p className="truncate text-[11px] text-white/65">{text.cta}</p>
        </div>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-500 text-white transition group-hover:bg-brand-400">
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </motion.div>
  );
}
