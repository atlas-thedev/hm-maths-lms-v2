"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AL_YEARS } from "@/lib/constants";

/**
 * The "2026 THEORY" tile that used to be baked into the channel banner. It is live now: it shows the
 * current A/L batch year and rolls through the upcoming ones (so it never goes out of date), and its
 * accent follows the brand colour. Geometry is in the banner image's own pixels (1000 × 351) so that
 * HomeHero can pin it to the exact spot the old badge occupied.
 */
export const BADGE_BOX = { x: 30, y: 48, w: 88, h: 90 } as const;

function batchYears(): number[] {
  const now = new Date().getFullYear();
  const upcoming = AL_YEARS.filter((y) => y >= now);
  return upcoming.length ? [...upcoming] : [now];
}

export function HeroYearBadge({ label }: { label: string }) {
  const reduce = useReducedMotion();
  const [years] = useState(batchYears);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce || years.length < 2) return;
    const id = setInterval(() => setI((v) => (v + 1) % years.length), 3200);
    return () => clearInterval(id);
  }, [reduce, years.length]);
  const year = String(years[i]);
  const { x, y, w, h } = BADGE_BOX;
  return (
    <svg viewBox={`${x} ${y} ${w} ${h}`} role="img" aria-label={`${year} ${label}`} data-testid="hero-year-badge" className="absolute [text-rendering:geometricPrecision]"
      style={{ left: `${x / 10}%`, top: `${y / 3.51}%`, width: `${w / 10}%` }}>
      <rect x="36" y="54.5" width="65" height="76" rx="11" fill="#101010" stroke="#fff" strokeWidth="2.6" />
      <path d="M96 82.2c0-1.6 1.7-2.5 3-1.7l9.4 6.6c1.3.9 1.3 2.8 0 3.7L99 97.4c-1.3.9-3 0-3-1.7z" fill="hsl(var(--brand-500))" />
      <AnimatePresence mode="wait" initial={false}>
        <motion.g key={year} initial={{ opacity: 0, y: reduce ? 0 : 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduce ? 0 : -7 }} transition={{ duration: 0.28 }}
          className="font-display" fill="#fff" fontWeight={800}>
          <text x="48" y="86" fontSize="30" textLength="37" lengthAdjust="spacingAndGlyphs">{year.slice(0, 2)}</text>
          <text x="48" y="113" fontSize="30" textLength="37" lengthAdjust="spacingAndGlyphs">{year.slice(2)}</text>
        </motion.g>
      </AnimatePresence>
      <text x="66.5" y="124.4" fontSize="9" fontWeight={700} fill="#fff" textAnchor="middle" letterSpacing="0.3" className="font-display">{label}</text>
    </svg>
  );
}
