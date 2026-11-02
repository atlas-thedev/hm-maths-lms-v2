"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronDown } from "lucide-react";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

const chip = "inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-xs font-semibold transition active:scale-[0.97]";
const on = "border-transparent bg-primary text-primary-foreground shadow-md shadow-primary/20";
const off = "border-border bg-card text-foreground/80 hover:border-primary/40 hover:text-foreground dark:border-white/10";

/**
 * Month filter that stays one row however many months pile up: the newest `visible` months (plus the picked
 * one, if older) as chips, every other month in a "More months" dropdown grouped by year.
 * Months are "YYYY-MM"; `labels` has their display names (formatted on the server). Each choice links to
 * `hrefBase` with ?{param}=YYYY-MM; `allLabel` adds a first chip that clears the month.
 */
export function MonthSwitcher({ months, current, labels, hrefBase, param = "month", visible = 3, allLabel, counts, className }: {
  months: string[]; current: string | null; labels: Record<string, string>; hrefBase: string; param?: string; visible?: number;
  allLabel?: string;
  /** Optional small number after a month (e.g. recordings in it). */
  counts?: Record<string, number>;
  className?: string;
}) {
  const t = useT("common.monthSwitcher");
  const router = useRouter();
  const sorted = [...months].sort().reverse();
  const shown = sorted.slice(0, visible);
  if (current && !shown.includes(current) && sorted.includes(current)) shown.push(current);
  const rest = sorted.filter((m) => !shown.includes(m));
  const href = (m: string | null) => {
    if (!m) return hrefBase;
    return `${hrefBase}${hrefBase.includes("?") ? "&" : "?"}${param}=${m}`;
  };
  const years = [...new Set(rest.map((m) => m.slice(0, 4)))];

  return (
    <nav aria-label={t("label")} className={cn("-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0", className)}>
      {allLabel && <Link href={href(null)} scroll={false} aria-current={!current ? "page" : undefined} className={cn(chip, !current ? on : off)}>{allLabel}</Link>}
      {shown.map((m) => (
        <Link key={m} href={href(m)} scroll={false} aria-current={m === current ? "page" : undefined} className={cn(chip, m === current ? on : off)}>
          {labels[m] ?? m}
          {counts?.[m] !== undefined && <span className={cn("rounded-full px-1.5 text-[11px] font-bold tabular-nums", m === current ? "bg-white/25" : "bg-muted text-muted-foreground")}>{counts[m]}</span>}
        </Link>
      ))}
      {rest.length > 0 && (
        <label className={cn(chip, off, "relative cursor-pointer pr-8")}>
          <CalendarDays className="h-3.5 w-3.5" />
          {t("more", { n: rest.length })}
          <ChevronDown className="pointer-events-none absolute right-3 h-3.5 w-3.5" />
          <select aria-label={t("pick")} value="" onChange={(e) => e.target.value && router.push(href(e.target.value), { scroll: false })}
            className="absolute inset-0 cursor-pointer opacity-0">
            <option value="">{t("pick")}</option>
            {years.map((y) => (
              <optgroup key={y} label={y}>
                {rest.filter((m) => m.startsWith(y)).map((m) => <option key={m} value={m}>{labels[m] ?? m}{counts?.[m] !== undefined ? ` (${counts[m]})` : ""}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
      )}
    </nav>
  );
}
