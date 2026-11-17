"use client";
import { HeroYearBadge } from "./hero-year-badge";
import { useSite } from "@/i18n/client";

const phone = (n: string) => {
  const d = n.replace(/\D/g, "");
  return d.length >= 9 ? `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}` : n;
};

/**
 * Centered crisp hero headline framed in front of the backlit student & teacher silhouettes.
 */
export function HeroBanner({ label, className }: { label: string; className?: string; photo?: string | null }) {
  const SITE = useSite();
  const wa = phone(SITE.contact.whatsapp);
  const voice = phone(SITE.contact.phone);
  const contact = `WhatsApp ${wa}  •  Voice ${voice}`;

  return (
    <div className={className}>
      <div className="mx-auto flex max-w-3xl flex-col items-center px-2 pt-2 text-center select-none sm:pt-4">
        <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-black/30 px-4 py-1.5 backdrop-blur-md shadow-sm">
          <HeroYearBadge label={label} inline />
          <span className="text-left font-display text-[11px] font-bold uppercase tracking-[0.2em] text-white/90 sm:text-xs">
            G.C.E. Advanced Level
            <span className="block text-[10px] font-medium tracking-[0.18em] text-brand-100/90">Examination</span>
          </span>
        </div>

        <p className="mt-5 font-display text-3xl font-black uppercase leading-[1.02] tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.65)] sm:text-5xl md:text-6xl">
          Combined{" "}
          <span className="block bg-gradient-to-b from-white to-white/75 bg-clip-text text-transparent sm:inline">
            Mathematics
          </span>
        </p>

        <span className="mt-4 h-1 w-24 rounded-full bg-white/85 shadow-[0_0_16px_rgba(255,255,255,0.45)]" />

        <p className="mt-4 font-sans text-3xl font-extrabold leading-tight tracking-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.65)] sm:text-5xl">
          <span className="text-white">හසිත</span>{" "}
          <span className="text-brand-100">මධුසංක</span>
          <span className="ml-2 align-baseline text-xs font-semibold uppercase tracking-widest text-white/80 sm:text-sm">
            B.Sc
          </span>
        </p>

        <p className="mt-4 inline-flex items-center rounded-full border border-white/15 bg-black/30 px-4 py-1.5 font-sans text-xs font-semibold text-white/90 backdrop-blur-sm sm:text-sm">
          {contact}
        </p>
      </div>
    </div>
  );
}
