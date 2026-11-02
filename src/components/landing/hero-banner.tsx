"use client";
import Image from "next/image";
import { useSite } from "@/i18n/client";
import { HeroYearBadge } from "./hero-year-badge";

/*
 * The channel banner, rebuilt as live text around Sir's photo. Everything is laid out in the old banner's own
 * 1000 × 351 grid (x / 10 and y / 3.51 give the percentages) and sized in container-width units (cqw), so it scales as a
 * picture would but stays sharp — and the accent (name, underline, comma, year badge) follows the theme colour.
 * The photo is cut from the original banner (public/images/hasitha-hero.webp, bottom edge = banner bottom).
 */
const pct = (x: number, y: number) => ({ left: `${x / 10}%`, top: `${y / 3.51}%` });
const phone = (n: string) => { const d = n.replace(/\D/g, ""); return d.length >= 9 ? `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}` : n; };

export function HeroBanner({ label, className, photo }: { label: string; className?: string; photo?: string | null }) {
  const SITE = useSite();
  const wa = phone(SITE.contact.whatsapp), voice = phone(SITE.contact.phone);
  const contact = `WhatsApp ${wa}  •  Voice ${voice}`;
  return (
    <div className={className}>
      <div aria-hidden className="relative w-full max-w-[1000px] select-none overflow-hidden text-white [container-type:inline-size] [text-rendering:geometricPrecision]" style={{ aspectRatio: "1000 / 351" }}>
        {/* Sir's photo — its edges fade into the page so the cut-out never shows a box */}
        <Image src={photo || "/images/hasitha-hero.webp"} alt="" width={740} height={598} priority sizes="(min-width:1040px) 370px, 37vw"
          className="absolute bottom-0 h-auto w-[37%] [mask-image:linear-gradient(to_right,transparent,#000_14%,#000_86%,transparent)]" style={{ left: "57.5%" }} />
        <span className="absolute bg-brand-500" style={{ ...pct(912, 66), width: "5.5%", height: "33.5%", maskImage: "url(/images/hero-comma.png)", WebkitMaskImage: "url(/images/hero-comma.png)", maskSize: "100% 100%", WebkitMaskSize: "100% 100%" }} />

        <HeroYearBadge label={label} />

        <p className="absolute whitespace-nowrap font-display font-bold uppercase text-white/90 max-[520px]:hidden" style={{ ...pct(175, 68), fontSize: "1cqw", letterSpacing: "0.21em", lineHeight: 1.2 }}>G.C.E Advanced Level Examination</p>
        <p className="absolute whitespace-nowrap font-display font-extrabold uppercase text-white" style={{ ...pct(172, 84), fontSize: "4cqw", lineHeight: 1, letterSpacing: "-0.01em" }}>Combined</p>
        <p className="absolute whitespace-nowrap font-display font-extrabold uppercase" style={{ ...pct(172, 121), fontSize: "4cqw", lineHeight: 1, letterSpacing: "-0.01em", color: "#a8a8a8" }}>Mathematics</p>
        <span className="absolute rounded-full bg-brand-500" style={{ ...pct(173, 165), width: "23.8%", height: "1.1%", minHeight: 2 }} />

        <p className="absolute whitespace-nowrap font-sans font-extrabold" style={{ ...pct(172, 196), fontSize: "5.4cqw", lineHeight: 1.15 }}>
          <span className="text-brand-500">හසිත</span>{" "}<span style={{ color: "#b4b4b4" }}>මධුසංක</span>
          <span className="ml-[0.7cqw] align-baseline font-semibold text-white/80 max-[520px]:hidden" style={{ fontSize: "0.95cqw" }}>B.Sc</span>
        </p>
        <p className="absolute whitespace-nowrap font-sans font-semibold text-white/95 max-[520px]:hidden" style={{ ...pct(176, 268), fontSize: "1.15cqw", lineHeight: 1.2 }}>{contact}</p>
      </div>
      {/* Too small to read inside the picture on phones, so the numbers sit under it */}
      <p className="mt-2 text-center text-xs font-semibold text-white/80 min-[521px]:hidden">{contact}</p>
    </div>
  );
}
