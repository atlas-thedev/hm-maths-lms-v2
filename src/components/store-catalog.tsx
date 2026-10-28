import Image from "next/image";
import Link from "next/link";
import { BookOpen, CheckCircle2, Clock, GraduationCap, Package } from "lucide-react";
import type { ClassRow, Product } from "@/lib/types";
import { ClassCard } from "@/components/class-card";
import { Badge, ChipLink, EmptyState, buttonVariants, cardVariants } from "@/components/ui";
import { getT } from "@/i18n/server";
import { AL_YEARS } from "@/lib/constants";
import { cn, formatLKR } from "@/lib/utils";

/** Per-class state for the signed-in student: has access this month, or a slip waiting for review. */
export type ClassOwnership = Record<string, "owned" | "pending">;

export const CLASS_TYPES = ["all", "theory", "revision", "paper", "combo"] as const;
export type ClassTypeFilter = (typeof CLASS_TYPES)[number];
/** year = null → every exam year. */
export type StoreFilter = { tab: "classes" | "books"; year: number | null; type: ClassTypeFilter };

/** Reads ?tab, ?year (a year or "all") and ?type/?mode from the URL; the year defaults to the student's batch. */
export function parseStoreFilter(sp: { tab?: string; year?: string; type?: string; mode?: string }, defaultYear: number | null): StoreFilter {
  const tab = sp.tab === "books" ? "books" : "classes";
  const raw = sp.type ?? sp.mode ?? "";
  const type: ClassTypeFilter = (CLASS_TYPES as readonly string[]).includes(raw) ? (raw as ClassTypeFilter) : "all";
  const y = Number(sp.year);
  const year = sp.year === "all" ? null : Number.isInteger(y) && y >= 2020 && y <= 2040 ? y : defaultYear;
  return { tab, year, type };
}

export async function StoreCatalog({ classes, products, owned, filter, basePath, myYear = null }: {
  classes: ClassRow[]; products: Product[]; owned?: ClassOwnership; filter: StoreFilter;
  /** Page the filter links point to ("/dashboard/store" or "/store"). */
  basePath: string;
  /** The signed-in student's exam year (marked "your batch" in the year filter). */
  myYear?: number | null;
}) {
  const [t, tc] = await Promise.all([getT("portal.store"), getT("common")]);
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
    const isCombo = titleLower.includes("+") || titleLower.includes("full pack") || titleLower.includes("combo");
    if (filter.type === "combo") return isCombo;
    if (filter.type === "theory") return titleLower.includes("theory") || c.class_type === "Theory";
    if (filter.type === "revision") return titleLower.includes("revision") || c.class_type === "Revision";
    if (filter.type === "paper") return titleLower.includes("paper") || c.class_type === "Paper Class";
    return true;
  };

  const filtered = forYear.filter(matchesType);

  const batchYears = [...new Set(filtered.map((c) => c.target_year).filter((y): y is number => !!y))].sort((a, b) => b - a);
  const otherClasses = filtered.filter((c) => !c.target_year);

  const sections = [
    ...batchYears.map((yr) => ({
      key: `batch-${yr}`,
      title: tc("alBatch", { year: yr }),
      icon: GraduationCap,
      items: filtered.filter((c) => c.target_year === yr),
    })),
    ...(otherClasses.length > 0 ? [{
      key: "other",
      title: t("sections.other") || "වෙනත් පන්ති",
      icon: BookOpen,
      items: otherClasses,
    }] : []),
  ];

  return (
    <div className="space-y-8">
      <nav className="flex flex-wrap gap-2" aria-label={t("title")} data-testid="store-tabs">
        <ChipLink href={href({ tab: "classes" })} active={filter.tab === "classes"}><BookOpen className="h-3.5 w-3.5" /> {t("tabs.classes")}</ChipLink>
        <ChipLink href={href({ tab: "books" })} active={filter.tab === "books"}><Package className="h-3.5 w-3.5" /> {t("tabs.books")}</ChipLink>
      </nav>

      {filter.tab === "classes" ? (
        <section className="space-y-6">
          <div>
            <h2 className="mb-1 font-display text-xl font-bold text-slate-900 dark:text-white">{t("classesTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("classesText")}</p>
          </div>
          <div className="space-y-3 rounded-2xl bg-muted/50 p-3 sm:p-4" data-testid="store-filters">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("filters.year")}</span>
              <ChipLink href={href({ year: "all" })} active={filter.year === null} data-testid="filter-year-all">{t("filters.allYears")}</ChipLink>
              {years.map((y) => (
                <ChipLink key={y} href={href({ year: String(y) })} active={filter.year === y} data-testid={`filter-year-${y}`}>
                  {tc("alBatch", { year: y })}{y === myYear ? ` · ${t("filters.yours")}` : ""}
                </ChipLink>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("filters.type")}</span>
              {CLASS_TYPES.map((typeKey) => (
                <ChipLink key={typeKey} href={href({ type: typeKey })} active={filter.type === typeKey} data-testid={`filter-type-${typeKey}`}>
                  {t(`filters.${typeKey}`)}
                </ChipLink>
              ))}
            </div>
          </div>
          {!paid.length ? (
            <EmptyState icon={BookOpen} title={t("noClasses")} description={t("noClassesText")} />
          ) : !sections.length ? (
            <EmptyState icon={BookOpen} title={t("noMatch")} description={t("noMatchText")}>
              <Link href={href({ year: "all", type: "all" })} className={buttonVariants({ size: "sm", variant: "outline" })}>{t("clearFilters")}</Link>
            </EmptyState>
          ) : sections.map(({ key, title, icon: Icon, items }) => (
            <div key={key} className="space-y-3" data-testid={`store-section-${key}`}>
              <h3 className="flex items-center gap-2 font-display text-base font-bold"><Icon className="h-4 w-4 text-primary" /> {title}
                <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-foreground">{items.length}</span></h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((c) => (
                  <ClassCard key={c.id} cls={c} href={owned?.[c.id] === "owned" ? `/dashboard/classes/${c.id}` : `/dashboard/store/class/${c.id}`}
                    footer={owned?.[c.id] === "owned" ? (
                      <span className="flex items-center gap-2"><Badge variant="success" className="whitespace-nowrap"><CheckCircle2 /> {t("owned")}</Badge><span className={buttonVariants({ size: "sm", variant: "outline" })}>{t("open")}</span></span>
                    ) : owned?.[c.id] === "pending" ? (
                      <Badge variant="warning" className="whitespace-nowrap"><Clock /> {t("pending")}</Badge>
                    ) : <span className={buttonVariants({ size: "sm" })}>{t("enroll")}</span>} />
                ))}
              </div>
            </div>
          ))}
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
