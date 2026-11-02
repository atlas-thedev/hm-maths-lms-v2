import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { BookOpen, CheckCircle2, Clock, Package } from "lucide-react";
import type { ClassRow, Product } from "@/lib/types";
import { ClassCard } from "@/components/class-card";
import { StoreToolbar } from "@/components/store-toolbar";
import { EmptyState, buttonVariants, cardVariants } from "@/components/ui";
import { getT } from "@/i18n/server";
import { AL_YEARS } from "@/lib/constants";
import { cn, formatLKR } from "@/lib/utils";

/** Per-class state for the signed-in student: has access this month, or a slip waiting for review. */
export type ClassOwnership = Record<string, "owned" | "pending">;

export const CLASS_TYPES = ["all", "theory", "revision", "paper", "combo"] as const;
export type ClassTypeFilter = (typeof CLASS_TYPES)[number];
/** year = null → every exam year. q = search text ("" = none). */
export type StoreFilter = { tab: "classes" | "books"; year: number | null; type: ClassTypeFilter; q: string };

/** Reads ?tab, ?year (a year or "all"), ?type/?mode and ?q from the URL; the year defaults to the student's batch. */
export function parseStoreFilter(sp: { tab?: string; year?: string; type?: string; mode?: string; q?: string }, defaultYear: number | null): StoreFilter {
  const tab = sp.tab === "books" ? "books" : "classes";
  const raw = sp.type ?? sp.mode ?? "";
  const type: ClassTypeFilter = (CLASS_TYPES as readonly string[]).includes(raw) ? (raw as ClassTypeFilter) : "all";
  const y = Number(sp.year);
  const year = sp.year === "all" ? null : Number.isInteger(y) && y >= 2020 && y <= 2040 ? y : defaultYear;
  return { tab, year, type, q: (sp.q ?? "").trim().slice(0, 60) };
}

export async function StoreCatalog({ classes, products, owned, filter, basePath, myYear = null }: {
  classes: ClassRow[]; products: Product[]; owned?: ClassOwnership; filter: StoreFilter;
  /** Page the filter links point to ("/dashboard/store" or "/store"). */
  basePath: string;
  /** The signed-in student's exam year (marked "your batch" in the year filter). */
  myYear?: number | null;
}) {
  const t = await getT("portal.store");
  const paid = classes.filter((c) => !c.is_free);
  const href = (patch: Partial<{ tab: string; year: string; type: string }>) => {
    const p = new URLSearchParams({
      tab: filter.tab,
      year: filter.year === null ? "all" : String(filter.year),
      type: filter.type,
      ...patch,
    });
    return `${basePath}?${p}`;
  };

  // Exam year: the class's batch, or classes open to every batch (no target year).
  const years = [...new Set([...AL_YEARS, ...paid.map((c) => c.target_year).filter((y): y is number => !!y)])].sort();
  const forYear = paid.filter((c) => filter.year === null || !c.target_year || c.target_year === filter.year);

  const matchesType = (c: ClassRow) => {
    if (filter.type === "all") return true;
    const titleLower = c.title.toLowerCase();
    const isCombo = c.class_type === "Combo" || titleLower.includes("+") || titleLower.includes("full pack") || titleLower.includes("combo");
    if (filter.type === "combo") return isCombo;
    if (filter.type === "theory") return (titleLower.includes("theory") || c.class_type === "Theory") && !isCombo;
    if (filter.type === "revision") return (titleLower.includes("revision") || c.class_type === "Revision") && !isCombo;
    if (filter.type === "paper") return (titleLower.includes("paper") || c.class_type === "Paper Class") && !isCombo;
    return true;
  };

  const needle = filter.q.toLowerCase();
  // One grid: newest batch first, then by title (each card shows its batch, so no per-year headings).
  const filtered = forYear.filter(matchesType)
    .filter((c) => !needle || `${c.title} ${c.description ?? ""}`.toLowerCase().includes(needle))
    .sort((a, b) => (b.target_year ?? 0) - (a.target_year ?? 0) || a.title.localeCompare(b.title));
  const pill = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm backdrop-blur";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {/* Classes / Tute books — a segmented switch, like a shop's Classes | Shop toggle. */}
        <nav className="inline-flex shrink-0 self-start rounded-xl bg-muted p-1" aria-label={t("title")} data-testid="store-tabs">
          {([["classes", BookOpen, t("tabs.classes")], ["books", Package, t("tabs.books")]] as const).map(([key, Icon, label]) => (
            <Link key={key} href={href({ tab: key })} aria-current={filter.tab === key ? "page" : undefined}
              className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold transition",
                filter.tab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <Icon className="h-4 w-4" /> {label}
            </Link>
          ))}
        </nav>
        {filter.tab === "classes" && (
          <Suspense fallback={<div className="h-11 flex-1 rounded-xl bg-muted/60" />}>
            <StoreToolbar types={CLASS_TYPES} years={years} myYear={myYear} className="flex-1" />
          </Suspense>
        )}
      </div>

      {filter.tab === "classes" ? (
        <section className="space-y-4">
          {!paid.length ? (
            <EmptyState icon={BookOpen} title={t("noClasses")} description={t("noClassesText")} />
          ) : !filtered.length ? (
            <EmptyState icon={BookOpen} title={t("noMatch")} description={t("noMatchText")}>
              <Link href={`${basePath}?tab=classes&year=all&type=all`} className={buttonVariants({ size: "sm", variant: "outline" })}>{t("clearFilters")}</Link>
            </EmptyState>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{t("count", { n: filtered.length })}</p>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3" data-testid="store-grid">
                {filtered.map((c) => (
                  <ClassCard key={c.id} cls={c} href={owned?.[c.id] === "owned" ? `/dashboard/classes/${c.id}` : `/dashboard/store/class/${c.id}`}
                    badge={owned?.[c.id] === "owned" ? (
                      <span className={cn(pill, "bg-success text-white")}><CheckCircle2 className="h-3.5 w-3.5" /> {t("owned")}</span>
                    ) : owned?.[c.id] === "pending" ? (
                      <span className={cn(pill, "bg-warning text-white")}><Clock className="h-3.5 w-3.5" /> {t("pending")}</span>
                    ) : undefined} />
                ))}
              </div>
            </>
          )}
        </section>
      ) : (
        <section>
          <h2 className="mb-1 font-display text-xl font-bold text-foreground">{t("booksTitle")}</h2>
          <p className="mb-5 text-sm text-muted-foreground">{t("booksText")}</p>
          {products.length ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((p) => (
                <Link key={p.id} href={`/dashboard/store/product/${p.id}`} className={cn(cardVariants({ variant: "interactive" }), "group overflow-hidden")}>
                  <div className="relative aspect-[4/3] bg-gradient-brand">
                    {p.image_url ? <Image src={p.image_url} alt={p.title} fill sizes="300px" className="object-cover" /> :
                      <Package className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-white/40" />}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold group-hover:text-primary">{p.title}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                    <p className="mt-3 font-display font-bold">{formatLKR(p.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState icon={Package} title={t("noBooks")} description={t("noBooksText")} />
          )}
        </section>
      )}
    </div>
  );
}
