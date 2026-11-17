"use client";
import { useSite } from "@/i18n/client";
import { HeroYearBadge } from "./hero-year-badge";

/*
 * Desktop/tablet uses the exact 1000 × 351 channel banner grid (x / 10 and y / 3.51 give percentages),
 * while mobile (< sm) switches to a clean centered stack so text never cramps into the left half.
 */
const pct = (x: number, y: number) => ({ left: `${x / 10}%`, top: `${y / 3.51}%` });
const phone = (n: string) => { const d = n.replace(/\D/g, ""); return d.length >= 9 ? `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}` : n; };

export function HeroBanner({ label, className }: { label: string; className?: string; photo?: string | null }) {
  const SITE = useSite();
  const wa = phone(SITE.contact.whatsapp), voice = phone(SITE.contact.phone);
  const contact = `WhatsApp ${wa}  •  Voice ${voice}`;
  return (
    <div className={className}>
      {/* Desktop / Tablet: exact 1000 × 351 banner layout */}
      <div aria-hidden className="relative hidden w-full max-w-[1000px] select-none overflow-hidden text-white [container-type:inline-size] [text-rendering:geometricPrecision] sm:block" style={{ aspectRatio: "1000 / 351" }}>
        <HeroYearBadge label={label} />

        <p className="absolute whitespace-nowrap font-display font-bold uppercase text-white/90 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]" style={{ ...pct(295, 68), fontSize: "1cqw", letterSpacing: "0.21em", lineHeight: 1.2 }}>G.C.E Advanced Level Examination</p>
        <p className="absolute whitespace-nowrap font-display font-extrabold uppercase text-white drop-shadow-[0_3px_14px_rgba(0,0,0,0.55)]" style={{ ...pct(292, 84), fontSize: "4cqw", lineHeight: 1, letterSpacing: "-0.01em" }}>Combined</p>
        <p className="absolute whitespace-nowrap font-display font-extrabold uppercase text-white/85 drop-shadow-[0_3px_14px_rgba(0,0,0,0.55)]" style={{ ...pct(292, 121), fontSize: "4cqw", lineHeight: 1, letterSpacing: "-0.01em" }}>Mathematics</p>
        <span className="absolute rounded-full bg-white/90 shadow-sm" style={{ ...pct(293, 165), width: "23.8%", height: "1.1%", minHeight: 2 }} />

        <p className="absolute whitespace-nowrap font-sans font-extrabold drop-shadow-[0_4px_18px_rgba(0,0,0,0.6)]" style={{ ...pct(292, 196), fontSize: "5.4cqw", lineHeight: 1.15 }}>
          <span className="text-white">හසිත</span>{" "}<span className="text-brand-100">මධුසංක</span>
          <span className="ml-[0.7cqw] align-baseline font-semibold text-white/85" style={{ fontSize: "0.95cqw" }}>B.Sc</span>
        </p>
        <p className="absolute whitespace-nowrap font-sans font-semibold text-white/95 drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]" style={{ ...pct(296, 268), fontSize: "1.15cqw", lineHeight: 1.2 }}>{contact}</p>
      </div>

      {/* Mobile (< sm): centered crisp layout without empty right gap */}
      <div className="flex flex-col items-center pt-1 text-center text-white select-none sm:hidden">
        <div className="inline-flex items-center gap-2.5 rounded-2xl border border-white/15 bg-black/30 px-3 py-1.5 backdrop-blur-md">
          <HeroYearBadge label={label} inline />
          <span className="text-left font-display text-[10px] font-bold uppercase tracking-[0.16em] text-white/90">
            G.C.E Advanced Level
            <span className="block font-medium text-brand-100/90">Examination</span>
          </span>
        </div>
        <p className="mt-4 font-display text-[2rem] font-black uppercase leading-[1.05] tracking-tight text-white drop-shadow-[0_3px_16px_rgba(0,0,0,0.6)]">
          Combined <span className="block text-white/85">Mathematics</span>
        </p>
        <span className="mt-2.5 h-1 w-20 rounded-full bg-white/85" />
        <p className="mt-3 font-sans text-3xl font-extrabold leading-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
          <span className="text-white">හසිත</span>{" "}<span className="text-brand-100">මධුසංක</span>
          <span className="ml-1.5 text-xs font-semibold text-white/80">B.Sc</span>
        </p>
        <p className="mt-3 inline-flex items-center rounded-full border border-white/15 bg-black/30 px-3.5 py-1 text-xs font-semibold text-white/90 backdrop-blur-sm">
          {contact}
        </p>
      </div>
    </div>
  );
}
