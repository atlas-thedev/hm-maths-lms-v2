"use client";
import { useSite } from "@/i18n/client";
import { HeroYearBadge } from "./hero-year-badge";

/*
 * The channel banner typography laid out on the original 1000 × 351 grid (x / 10 and y / 3.51 give percentages)
 * and sized in container-width units (cqw), while Sir's silhouette and comma frame the right side behind the hero.
 */
const pct = (x: number, y: number) => ({ left: `${x / 10}%`, top: `${y / 3.51}%` });
const phone = (n: string) => { const d = n.replace(/\D/g, ""); return d.length >= 9 ? `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}` : n; };

export function HeroBanner({ label, className }: { label: string; className?: string; photo?: string | null }) {
  const SITE = useSite();
  const wa = phone(SITE.contact.whatsapp), voice = phone(SITE.contact.phone);
  const contact = `WhatsApp ${wa}  •  Voice ${voice}`;
  return (
    <div className={className}>
      <div aria-hidden className="relative w-full max-w-[1000px] select-none overflow-hidden text-white [container-type:inline-size] [text-rendering:geometricPrecision]" style={{ aspectRatio: "1000 / 351" }}>
        <HeroYearBadge label={label} />

        <p className="absolute whitespace-nowrap font-display font-bold uppercase text-white/90 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] max-[520px]:hidden" style={{ ...pct(175, 68), fontSize: "1cqw", letterSpacing: "0.21em", lineHeight: 1.2 }}>G.C.E Advanced Level Examination</p>
        <p className="absolute whitespace-nowrap font-display font-extrabold uppercase text-white drop-shadow-[0_3px_14px_rgba(0,0,0,0.55)]" style={{ ...pct(172, 84), fontSize: "4cqw", lineHeight: 1, letterSpacing: "-0.01em" }}>Combined</p>
        <p className="absolute whitespace-nowrap font-display font-extrabold uppercase text-white/85 drop-shadow-[0_3px_14px_rgba(0,0,0,0.55)]" style={{ ...pct(172, 121), fontSize: "4cqw", lineHeight: 1, letterSpacing: "-0.01em" }}>Mathematics</p>
        <span className="absolute rounded-full bg-white/90 shadow-sm" style={{ ...pct(173, 165), width: "23.8%", height: "1.1%", minHeight: 2 }} />

        <p className="absolute whitespace-nowrap font-sans font-extrabold drop-shadow-[0_4px_18px_rgba(0,0,0,0.6)]" style={{ ...pct(172, 196), fontSize: "5.4cqw", lineHeight: 1.15 }}>
          <span className="text-white">හසිත</span>{" "}<span className="text-brand-100">මධුසංක</span>
          <span className="ml-[0.7cqw] align-baseline font-semibold text-white/85 max-[520px]:hidden" style={{ fontSize: "0.95cqw" }}>B.Sc</span>
        </p>
        <p className="absolute whitespace-nowrap font-sans font-semibold text-white/95 drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)] max-[520px]:hidden" style={{ ...pct(176, 268), fontSize: "1.15cqw", lineHeight: 1.2 }}>{contact}</p>
      </div>
      {/* Too small to read inside the picture on phones, so the numbers sit under it */}
      <p className="mt-2 text-center text-xs font-semibold text-white/90 min-[521px]:hidden">{contact}</p>
    </div>
  );
}
