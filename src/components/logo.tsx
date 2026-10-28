"use client";
import { useId } from "react";
import Link from "next/link";
import { useBrand } from "@/i18n/client";
import { cn } from "@/lib/utils";

/**
 * The brand mark. Uses the logo uploaded in Developer panel → Brand when there is one, otherwise the built-in "HM"
 * monogram, whose colours come from the theme (--gradient-logo-from / --gradient-logo-to in src/theme/theme.css).
 * The mark is also available as a file: public/brand/logo.svg (badge) and public/brand/logo-mark.svg (mark only).
 *   tone="tile"    → mark on the dark rounded tile (header, sidebar)
 *   tone="brand"   → mark only, in brand colours
 *   tone="current" → mark only, in the current text colour (built-in mark only)
 * With an uploaded light and dark logo the right one shows for the current theme (the tile is always dark, so it uses the dark one).
 */
export function LogoMark({ className, tone = "brand", onDark = false }: { className?: string; tone?: "brand" | "current" | "tile"; onDark?: boolean }) {
  const id = `hm-logo-${useId().replace(/:/g, "")}`;
  const brand = useBrand();

  if (brand.logoUrl) {
    const light = brand.logoUrl, dark = brand.logoDarkUrl || brand.logoUrl;
    const sanitizedClass = className?.replace(/\bsm:grid\b/g, "sm:block");
    const cls = cn(tone === "tile" ? "h-10 w-10 shrink-0 object-contain rounded-full" : "h-9 w-9 shrink-0 object-contain rounded-full", sanitizedClass);
    /* eslint-disable @next/next/no-img-element */
    if (onDark || light === dark) return <img src={onDark ? dark : light} alt="" aria-hidden="true" className={cls} />;
    return (
      <>
        <img src={light} alt="" aria-hidden="true" className={cn(cls, "dark:hidden")} />
        <img src={dark} alt="" aria-hidden="true" className={cn(cls, "hidden dark:block")} />
      </>
    );
    /* eslint-enable @next/next/no-img-element */
  }

  if (tone === "tile") {
    return (
      <span
        className={cn(
          "relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl shadow-md transition-all active:scale-95",
          "bg-gradient-to-br from-[#16325c] via-[#102544] to-[#071426] ring-1 ring-amber-400/40 shadow-black/25",
          "dark:from-[#1a3866] dark:via-[#102544] dark:to-[#061020] dark:ring-amber-400/50 dark:shadow-[0_0_15px_rgba(232,184,74,0.25)]",
          className
        )}
        aria-hidden="true"
      >
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
        <LogoMark tone="brand" className="relative h-[65%] w-[65%] drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]" />
      </span>
    );
  }
  const stroke = tone === "current" ? "currentColor" : `url(#${id})`;
  return (
    <svg viewBox="0 0 44 44" focusable="false" className={cn("h-9 w-9", className)} aria-hidden="true">
      {tone !== "current" && (
        <defs>
          <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="5" y1="4" x2="41" y2="41">
            <stop offset="0" style={{ stopColor: "var(--gradient-logo-from)" }} />
            <stop offset="1" style={{ stopColor: "var(--gradient-logo-to)" }} />
          </linearGradient>
        </defs>
      )}
      <g fill="none" stroke={stroke} strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5.2 11.2v27" />
        <path d="M19.7 11.2v27" />
        <path d="M5.2 25.2h14.5" />
        <path d="M19.7 11.2l8.5 20.5 8.5-20.5" />
        <path d="M36.7 11.2v27" />
      </g>
      <circle cx="39" cy="5.6" r="2.4" style={{ fill: tone === "current" ? "currentColor" : `url(#${id})` }} />
    </svg>
  );
}

/** Logo mark + brand name, linking home. */
export function Logo({ href = "/", compact = false, tone = "auto", label, sub }: {
  href?: string; compact?: boolean; tone?: "auto" | "dark" | "light"; label?: string; sub?: string;
}) {
  const brand = useBrand();
  label ??= brand.name;
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label={label}>
      <LogoMark tone="tile" />
      {!compact && (
        <span className="leading-tight">
          <span className={cn("block font-display text-[15px] font-bold tracking-tight text-foreground dark:text-white", tone === "dark" && "!text-white")}>{label}</span>
          {sub ? <span className={cn("block text-[11px] font-medium text-muted-foreground dark:text-white/60", tone === "dark" && "!text-white/60")}>{sub}</span> : null}
        </span>
      )}
    </Link>
  );
}
