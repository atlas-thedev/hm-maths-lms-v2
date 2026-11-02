"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { Select } from "@/components/ui/input";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

/**
 * Store search + filters in one row (search, class type, exam year), like a shop toolbar. Every change
 * updates the URL (?q, ?type, ?year) so the server-rendered grid below follows; typing waits a moment first.
 */
export function StoreToolbar({ types, years, myYear, className }: {
  types: readonly string[]; years: number[]; myYear: number | null; className?: string;
}) {
  const t = useT("portal.store");
  const tc = useT("common");
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const year = sp.get("year") ?? (myYear ? String(myYear) : "all");
  const type = sp.get("type") ?? "all";

  const push = (patch: Record<string, string>) => {
    const p = new URLSearchParams(sp.toString());
    p.set("tab", "classes");
    p.delete("mode");
    for (const [k, v] of Object.entries(patch)) { if (v) p.set(k, v); else p.delete(k); }
    start(() => router.replace(`${pathname}?${p}`, { scroll: false }));
  };

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const onSearch = (v: string) => {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => push({ q: v.trim() }), 300);
  };

  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center", className)} data-testid="store-filters">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">{t("search")}</span>
        {pending
          ? <Loader2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          : <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
        <input type="search" value={q} onChange={(e) => onSearch(e.target.value)} placeholder={t("searchPlaceholder")} data-testid="store-search"
          className="h-11 w-full rounded-xl border border-input bg-card pl-9 pr-9 text-base shadow-[inset_0_1px_1px_rgba(20,14,10,.03)] transition-colors placeholder:text-muted-foreground/80 hover:border-primary/40 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 sm:h-10 sm:text-sm [&::-webkit-search-cancel-button]:hidden" />
        {q && (
          <button type="button" onClick={() => onSearch("")} aria-label={t("clearSearch")}
            className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </label>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Select aria-label={t("filters.type")} value={type} onChange={(e) => push({ type: e.target.value === "all" ? "" : e.target.value })} className="sm:w-44" data-testid="filter-type">
          {types.map((k) => <option key={k} value={k}>{k === "all" ? t("filters.allTypes") : t(`filters.${k}`)}</option>)}
        </Select>
        <Select aria-label={t("filters.year")} value={year} onChange={(e) => push({ year: e.target.value })} className="sm:w-40" data-testid="filter-year">
          <option value="all">{t("filters.allYears")}</option>
          {years.map((y) => <option key={y} value={y}>{tc("alBatch", { year: y })}{y === myYear ? ` · ${t("filters.yours")}` : ""}</option>)}
        </Select>
      </div>
    </div>
  );
}
