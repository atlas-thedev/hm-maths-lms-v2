"use client";
import { useT } from "@/i18n/client";
import { VelocityMarquee } from "./motion-kit";

/** Two skewed, scroll-velocity-reactive marquees of A/L topics. */
export function MarqueeBand() {
  const t = useT("landing.marquee");
  const a = t.raw<string[]>("topics") ?? [];
  const b = t.raw<string[]>("perks") ?? [];
  return (
    <section aria-hidden className="relative -my-4 overflow-hidden py-14">
      <div className="-rotate-2 bg-gradient-to-r from-teal-800 via-teal-700 to-teal-700 py-4 shadow-lift">
        <VelocityMarquee baseVelocity={-1.6}>
          {a.map((w, i) => (
            <span key={i} className="flex items-center gap-6 pr-6 font-display text-2xl font-extrabold uppercase tracking-tight text-white sm:text-4xl">
              {w}<span aria-hidden className="inline-block h-2.5 w-2.5 rotate-45 rounded-[2px] bg-brand-200" />
            </span>
          ))}
        </VelocityMarquee>
      </div>
      <div className="mt-[-6px] rotate-1 border-y border-teal-100 bg-white/90 py-3 backdrop-blur dark:border-white/10 dark:bg-slate-900/80">
        <VelocityMarquee baseVelocity={1.2}>
          {b.map((w, i) => (
            <span key={i} className="flex items-center gap-5 pr-5 text-lg font-semibold text-slate-600 dark:text-slate-300 sm:text-xl">
              {w}<span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-teal-500 to-brand-400" />
            </span>
          ))}
        </VelocityMarquee>
      </div>
    </section>
  );
}
