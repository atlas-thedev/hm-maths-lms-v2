import Link from "next/link";
import { CalendarDays, ChevronRight, FileText, Trophy, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, PageHeader, StatCard, cardVariants } from "@/components/ui";
import { Stagger, StaggerItem } from "@/components/motion";
import { DateTile } from "@/components/date-tile";
import { colomboToday, type Paper } from "@/lib/papers";
import type { ClassRow } from "@/lib/types";
import { getFormat, getT } from "@/i18n/server";
import { PaperForm } from "./paper-forms";
import { NewPaperButton } from "./new-paper-button";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  return { title: (await getT("admin.nav"))("papers") };
}

export default async function AdminPapersPage() {
  const { db } = await requireAdmin();
  const [t, tc, f] = await Promise.all([getT("admin.papers"), getT("common"), getFormat()]);
  const [{ data: papers, error }, { data: classes }, { data: marks }] = await Promise.all([
    db.from("papers").select("*").order("paper_date", { ascending: false }).order("created_at", { ascending: false }).limit(200),
    db.from("classes").select("id, title").order("title"),
    db.from("paper_marks").select("paper_id, marks").limit(20000),
  ]);
  const rows = (papers ?? []) as Paper[];
  const agg = new Map<string, { n: number; top: number }>();
  for (const x of marks ?? []) {
    const a = agg.get(x.paper_id as string) ?? { n: 0, top: 0 };
    a.n++; a.top = Math.max(a.top, Number(x.marks));
    agg.set(x.paper_id as string, a);
  }
  const cls = new Map(((classes ?? []) as Pick<ClassRow, "id" | "title">[]).map((c) => [c.id, c.title]));
  const totalEntries = [...agg.values()].reduce((s, a) => s + a.n, 0);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} icon={FileText}>
        <NewPaperButton label={t("new")} />
      </PageHeader>
      {error && <p className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">{t("migrate")}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t("stats.papers")} value={rows.length} icon={FileText} />
        <StatCard label={t("stats.entries")} value={totalEntries} icon={Users} tone="sky" />
        <StatCard label={t("stats.latest")} value={rows[0] ? f.date(rows[0].paper_date) : tc("dash")} icon={CalendarDays} tone="violet" hint={rows[0]?.title} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_440px]">
        <section className="min-w-0">
          {rows.length ? (
            <Stagger className="space-y-2.5">
              {rows.map((p) => {
                const a = agg.get(p.id);
                return (
                  <StaggerItem key={p.id}>
                    <Link href={`/admin/papers/${p.id}`} className={cn(cardVariants({ variant: "interactive" }), "group flex items-center gap-4 p-4")}>
                      <DateTile date={p.paper_date} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate font-semibold">{p.title}</p>
                          <Badge>{tc(`paperTypes.${p.paper_type}`)}</Badge>
                          {!p.is_published && <Badge variant="warning">{t("draft")}</Badge>}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {[p.al_year ? tc("alBatch", { year: p.al_year }) : t("allBatches"), p.class_id ? cls.get(p.class_id) : null, t("outOf", { total: Number(p.total_marks) })].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <div className="hidden text-right sm:block">
                        <p className="font-display text-lg font-bold">{a?.n ?? 0}</p>
                        <p className="text-[11px] text-muted-foreground">{t("entries")}</p>
                      </div>
                      <div className="hidden text-right md:block">
                        <p className="flex items-center justify-end gap-1 font-display text-lg font-bold"><Trophy className="h-4 w-4 text-warning-soft-foreground" />{a ? a.top : tc("dash")}</p>
                        <p className="text-[11px] text-muted-foreground">{t("top")}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                    </Link>
                  </StaggerItem>
                );
              })}
            </Stagger>
          ) : (
            <EmptyState icon={FileText} title={t("emptyTitle")} description={t("emptyText")} />
          )}
        </section>
        <Card id="new" className="scroll-mt-24 xl:sticky xl:top-24 xl:self-start">
          <CardHeader><CardTitle>{t("new")}</CardTitle><p className="text-sm text-muted-foreground">{t("newHint")}</p></CardHeader>
          <CardContent><PaperForm newId={crypto.randomUUID()} classes={(classes ?? []) as Pick<ClassRow, "id" | "title">[]} today={colomboToday()} /></CardContent>
        </Card>
      </div>
    </div>
  );
}
