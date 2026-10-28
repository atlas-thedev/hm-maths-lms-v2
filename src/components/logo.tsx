"use client";
import { useId } from "react";
import Link from "next/link";
import { useBrand } from "@/i18n/client";
import { cn } from "@/lib/utils";

/**
 * The brand mark. Uses the logo uploaded in Developer panel → Brand when there is one, otherwise the built-in "hm" mark,
 * whose colours come from the theme (--gradient-logo-from / --gradient-logo-to in src/theme/theme.css).
 *   tone="tile"    → mark on the dark rounded tile (header, sidebar)
 *   tone="brand"   → mark only, in brand colours
 *   tone="current" → mark only, in the current text colour (built-in mark only)
 * With an uploaded light and dark logo the right one shows for the current theme (the tile is always dark, so it uses the dark one).
 */
export function LogoMark({ className, tone = "brand", onDark = false }: { className?: string; tone?: "brand" | "current" | "tile"; onDark?: boolean }) {
  const id = `hm-logo-${useId().replace(/:/g, "")}`;
  const brand = useBrand();

  if (brand.logoUrl) {
    const light = brand.logoUrl;
    const dark = brand.logoDarkUrl || brand.logoUrl;
    const tile = tone === "tile" && brand.logoOnTile;

    const containerCls = cn(
      "relative shrink-0 inline-grid place-items-center select-none",
      tile ? "rounded-xl bg-brand-500 shadow-md shadow-brand-500/25 ring-1 ring-black/10 overflow-hidden" : "rounded-full",
      tone === "tile" ? "h-10 w-10" : "h-9 w-9",
      className
    );
    const imgCls = cn(
      "shrink-0 object-contain",
      tile ? "h-[68%] w-[68%]" : "h-full w-full rounded-full"
    );

    /* eslint-disable @next/next/no-img-element */
    if (onDark || light === dark) {
      return (
        <span className={containerCls} aria-hidden="true">
          <img src={onDark ? dark : light} alt="" aria-hidden="true" className={cn(imgCls, "block")} />
        </span>
      );
    }
    return (
      <span className={containerCls} aria-hidden="true">
        <img src={light} alt="" aria-hidden="true" className={cn(imgCls, "block dark:hidden")} />
        <img src={dark} alt="" aria-hidden="true" className={cn(imgCls, "hidden dark:block")} />
      </span>
    );
    /* eslint-enable @next/next/no-img-element */
  }

  if (tone === "tile") {
    return (
      <span className={cn("grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-500 shadow-md shadow-brand-500/25 ring-1 ring-black/10", className)} aria-hidden="true">
        <LogoMark tone="current" className="h-[64%] w-[64%] text-brand-950" />
      </span>
    );
  }
  const stroke = tone === "current" ? "currentColor" : `url(#${id})`;
  return (
    <svg viewBox="0 0 48 48" focusable="false" className={cn("h-9 w-9", className)} aria-hidden="true">
      {tone !== "current" && (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: "var(--gradient-logo-from)" }} />
            <stop offset="1" style={{ stopColor: "var(--gradient-logo-to)" }} />
          </linearGradient>
        </defs>
      )}
      <path d="M8 6v36M8 26c0-6 3.6-9.5 8-9.5s8 3.5 8 9.5v16M24 26c0-6 3.6-9.5 8-9.5s8 3.5 8 9.5v16"
        fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="40" cy="7" r="3.5" style={{ fill: tone === "current" ? "currentColor" : "var(--gradient-logo-to)" }} />
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
