"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type FilterSelect = { param: string; label: string; value: string; options: { value: string; label: string }[] };

/**
 * Admin list filters in one row: a search box (?q, applied after a short pause) and any number of dropdowns
 * (each its own URL param; the option with value "" clears it). Other URL params are kept, so tabs such as
 * ?status survive. Labels arrive translated from the server.
 */
export function FilterToolbar({ searchLabel, searchPlaceholder, clearLabel, selects = [], className, testId }: {
  searchLabel: string; searchPlaceholder: string; clearLabel: string; selects?: FilterSelect[]; className?: string; testId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const push = (patch: Record<string, string>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) { if (v) p.set(k, v); else p.delete(k); }
    const qs = p.toString();
    start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  const onSearch = (v: string) => {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => push({ q: v.trim() }), 350);
  };

  return (
    <div className={cn("flex flex-col gap-2 lg:flex-row lg:items-center", className)} data-testid={testId}>
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">{searchLabel}</span>
        {pending
          ? <Loader2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          : <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
        <input type="search" value={q} onChange={(e) => onSearch(e.target.value)} placeholder={searchPlaceholder}
          className="h-11 w-full rounded-xl border border-input bg-card pl-9 pr-9 text-base transition-colors placeholder:text-muted-foreground/80 hover:border-primary/40 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 sm:h-10 sm:text-sm [&::-webkit-search-cancel-button]:hidden" />
        {q && (
          <button type="button" onClick={() => onSearch("")} aria-label={clearLabel}
            className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </label>
      {selects.length > 0 && (
        <div className={cn("grid gap-2 sm:flex", selects.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
          {selects.map((s) => (
            <Select key={s.param} aria-label={s.label} value={s.value} onChange={(e) => push({ [s.param]: e.target.value })} className="min-w-0 sm:w-52">
              {s.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          ))}
        </div>
      )}
    </div>
  );
}
