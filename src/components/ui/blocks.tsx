import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, ChevronRight } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { IconTile } from "./icon-tile";
import { toneText, asTone, type Tone } from "./tone";

/* ───────────────────────────── StatCard ───────────────────────────── */

/** A number with a label and icon (dashboards, admin overview). */
export function StatCard({ label, value, icon, hint, tone = "brand", className }: {
  label: string; value: React.ReactNode; icon: LucideIcon; hint?: React.ReactNode; tone?: Tone | string; className?: string;
}) {
  const tn = asTone(tone);
  return (
    <div className={cn("h-full rounded-2xl border border-border/80 bg-card p-4 shadow-soft sm:p-5 dark:border-white/10", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-[13px] font-medium leading-snug text-muted-foreground sm:text-sm">{label}</p>
        <IconTile icon={icon} tone={tn} variant="solid" size="sm" />
      </div>
      <p className="mt-2 break-words font-display text-[clamp(1.25rem,6vw,1.625rem)] font-bold leading-tight tracking-tight">{value}</p>
      {hint ? <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/* ───────────────────────────── MetricTile ───────────────────────────── */

/** Compact row tile: coloured icon square + small label + big value (ranks, "you beat 20%"). Link when `href` is set. */
export function MetricTile({ icon, tone = "brand", label, value, sub, href, className }: {
  icon: LucideIcon; tone?: Tone | string; label: React.ReactNode; value: React.ReactNode; sub?: React.ReactNode; href?: string; className?: string;
}) {
  const body = (
    <div className={cn("flex h-full items-center gap-3 rounded-2xl border border-border/80 bg-card p-3.5 dark:border-white/10", href && "transition hover:border-primary/30 hover:bg-accent/40 active:scale-[0.99]", className)}>
      <IconTile icon={icon} tone={asTone(tone)} variant="solid" size="lg" />
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        <p className="font-display text-xl font-bold leading-tight">{value}</p>
        {sub ? <p className="text-[11px] text-muted-foreground">{sub}</p> : null}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block h-full">{body}</Link> : body;
}

/* ───────────────────────────── ActionCard ───────────────────────────── */

/**
 * A tappable shortcut card: icon/sticker, title, one line of detail.
 *   layout="tile" – icon on top (2-up grids on phones)
 *   layout="row"  – icon left, arrow right (lists, quick actions)
 */
export function ActionCard({ href, title, description, icon, sticker, tone = "brand", layout = "tile", badge, className }: {
  href: string; title: React.ReactNode; description?: React.ReactNode; icon?: LucideIcon; sticker?: string; tone?: Tone;
  layout?: "tile" | "row" | "icon"; badge?: React.ReactNode; className?: string;
}) {
  if (layout === "icon") {
    // App-launcher style: icon on top, short label underneath (4 across on phones).
    return (
      <Link href={href} className={cn("group flex h-full min-w-0 flex-col items-center gap-1.5 rounded-2xl p-2 text-center transition hover:bg-accent/60 active:scale-95", className)}>
        <span className="relative">
          <IconTile icon={icon} sticker={sticker} tone={tone} variant="solid" size="lg" className="transition group-hover:-translate-y-0.5" />
          {badge ? <span className="absolute -right-1.5 -top-1.5">{badge}</span> : null}
        </span>
        <span className="line-clamp-2 text-xs font-semibold leading-tight">{title}</span>
      </Link>
    );
  }
  if (layout === "row") {
    return (
      <Link href={href} className={cn("group flex h-full min-h-[64px] items-center gap-3 rounded-2xl border border-border/80 bg-card p-3 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift active:scale-[0.98] dark:border-white/10", className)}>
        <IconTile icon={icon} sticker={sticker} tone={tone} variant="solid" />
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm font-semibold leading-snug">{title}</span>
          {description ? <span className="block truncate text-xs text-muted-foreground">{description}</span> : null}
        </span>
        {badge}
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
      </Link>
    );
  }
  return (
    <Link href={href} className={cn("group relative flex h-full min-w-0 flex-col gap-3 rounded-2xl border border-border/80 bg-card p-3.5 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift active:scale-[0.98] sm:p-4 dark:border-white/10", className)}>
      <span className="flex items-start justify-between gap-2">
        <IconTile icon={icon} sticker={sticker} tone={tone} size="lg" />
        {badge ?? <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground/70 transition group-hover:translate-x-0.5 group-hover:text-primary" />}
      </span>
      <span className="min-w-0">
        <span className="block font-display text-[15px] font-semibold leading-snug group-hover:text-primary">{title}</span>
        {description ? <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">{description}</span> : null}
      </span>
    </Link>
  );
}

/* ───────────────────────────── ListRow ───────────────────────────── */

/** One row in a list: leading icon, title, subtitle, something on the right. Becomes a link when `href` is set. */
export function ListRow({ href, icon, sticker, tone = "neutral", leading, title, subtitle, trailing, className, chevron }: {
  href?: string; icon?: LucideIcon; sticker?: string; tone?: Tone; leading?: React.ReactNode;
  title: React.ReactNode; subtitle?: React.ReactNode; trailing?: React.ReactNode; className?: string; chevron?: boolean;
}) {
  const inner = (
    <>
      {leading ?? (icon || sticker ? <IconTile icon={icon} sticker={sticker} tone={tone} /> : null)}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{title}</span>
        {subtitle ? <span className="block text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{subtitle}</span> : null}
      </span>
      {trailing ? <span className="flex shrink-0 items-center gap-2">{trailing}</span> : null}
      {href && chevron ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
    </>
  );
  const cls = cn("flex items-center gap-3 rounded-2xl border border-border/70 p-3 dark:border-white/10", href && "transition hover:border-primary/40 hover:bg-accent/50 active:scale-[0.99]", className);
  return href ? <Link href={href} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>;
}

/* ───────────────────────────── Chips ───────────────────────────── */

const chipBase = "inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-xs font-semibold transition active:scale-[0.97]";
const chipOn = "border-transparent bg-primary text-primary-foreground shadow-md shadow-primary/20";
const chipOff = "border-border bg-card text-foreground/80 hover:border-primary/40 hover:text-foreground dark:border-white/10";

/** Filter / tab pill that navigates (store filters, payment tabs, leaderboard scopes). */
export function ChipLink({ active, className, children, ...p }: React.ComponentProps<typeof Link> & { active?: boolean }) {
  return <Link aria-current={active ? "page" : undefined} className={cn(chipBase, active ? chipOn : chipOff, className)} {...p}>{children}</Link>;
}
/** Same look as ChipLink, as a button (client-side filters). */
export function ChipButton({ active, className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return <button type="button" aria-pressed={active} className={cn(chipBase, active ? chipOn : chipOff, className)} {...p} />;
}
/** Horizontally scrollable row of chips on phones, wrapping on larger screens. */
export function ChipGroup({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0", className)}>{children}</div>;
}

/* ───────────────────────────── HeroCard ───────────────────────────── */

/** The big coloured card at the top of a page (dashboard welcome, admin overview). */
export function HeroCard({ tone = "brand", symbol, className, children }: { tone?: "brand" | "dark"; symbol?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("relative overflow-hidden rounded-3xl p-5 text-white shadow-lift sm:p-8", tone === "brand" ? "bg-gradient-brand" : "bg-gradient-dark", className)}>
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
      {symbol ? <span aria-hidden className="pointer-events-none absolute -right-2 -bottom-6 select-none font-display text-[9rem] font-black leading-none text-white/10">{symbol}</span> : null}
      <div className="relative">{children}</div>
    </section>
  );
}

/** Glassy panel for use inside a HeroCard. */
export function HeroPanel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-2xl bg-white/12 p-4 ring-1 ring-white/20 backdrop-blur-md", className)}>{children}</div>;
}

/** Translucent pill for use on a HeroCard ("Panadura", "2027 A/L"). */
export function HeroChip({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur", className)}>{children}</span>;
}

/* ───────────────────────────── Progress ───────────────────────────── */

const FILL: Record<Tone, string> = {
  brand: "bg-gradient-brand", success: "bg-success", warning: "bg-warning", danger: "bg-destructive",
  info: "bg-info", highlight: "bg-highlight", neutral: "bg-muted-foreground", dark: "bg-foreground",
};

export function ProgressBar({ value, max = 100, tone = "brand", className, label }: { value: number; max?: number; tone?: Tone; className?: string; label?: string }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label} className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className={cn("h-full rounded-full transition-[width] duration-700", FILL[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ───────────────────────────── Avatar ───────────────────────────── */

export function Avatar({ name, src, size = "md", className }: { name: string; src?: string | null; size?: "sm" | "md" | "lg"; className?: string }) {
  const s = { sm: "h-8 w-8 text-[11px]", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-base" }[size];
  // eslint-disable-next-line @next/next/no-img-element
  if (src) return <img src={src} alt="" className={cn("shrink-0 rounded-xl object-cover", s, className)} />;
  return <span className={cn("grid shrink-0 place-items-center rounded-xl bg-gradient-brand font-display font-bold text-white", s, className)}>{initials(name)}</span>;
}

/* ───────────────────────────── CountBadge ───────────────────────────── */

/** Small red number bubble (unread count, pending slips). Renders nothing for 0. */
export function CountBadge({ count, max = 99, className, ...p }: React.HTMLAttributes<HTMLSpanElement> & { count?: number | null; max?: number }) {
  if (!count) return null;
  return (
    <span className={cn("grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1.5 text-[10px] font-bold leading-none text-destructive-foreground", className)} {...p}>
      {count > max ? `${max}+` : count}
    </span>
  );
}

/* ───────────────────────────── Numbers ───────────────────────────── */

/** Big number + caption, e.g. "#6 · of 6 students". */
export function Metric({ value, label, tone = "dark", className }: { value: React.ReactNode; label?: React.ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={cn("block", className)}>
      <span className={cn("block font-display text-2xl font-bold leading-none", toneText[tone])}>{value}</span>
      {label ? <span className="mt-1 block text-xs text-muted-foreground">{label}</span> : null}
    </span>
  );
}
