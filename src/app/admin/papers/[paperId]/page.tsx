import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BarChart3, Download, FileText, Medal, Percent, Trophy, Users } from "lucide-react";
import { isOwnerRole, requireAdmin } from "@/lib/auth";
import { Badge, Card, CardContent, CardHeader, CardTitle, PageHeader, StatCard, Table, buttonVariants } from "@/components/ui";
import { colomboToday, grade, pct, type Paper } from "@/lib/papers";
import type { ClassRow, Profile } from "@/lib/types";
import { townKeys } from "@/lib/centers";
import { getCenters } from "@/lib/settings";
import { getFormat, getT } from "@/i18n/server";
import { cn } from "@/lib/utils";
import { DeletePaperButton, EditMarkCell, MarksEntry, PaperForm } from "../paper-forms";

export default async function AdminPaperPage({ params }: { params: Promise<{ paperId: string }> }) {
  const { paperId } = await params;
  const { db, profile } = await requireAdmin();
  const [t, tc, f, centers] = await Promise.all([getT("admin.papers"), getT("common"), getFormat(), getCenters()]);
  const { data } = await db.from("papers").select("*").eq("id", paperId).maybeSingle();
  if (!data) notFound();
  const paper = data as Paper;
  const total = Number(paper.total_marks);
  const [{ data: marks }, { data: classes }] = await Promise.all([
    db.from("paper_marks").select("student_id, marks, remark, entered_at, profiles(full_name, student_id, town, school, mobile)")
      .eq("paper_id", paperId).order("marks", { ascending: false }),
    db.from("classes").select("id, title").order("title"),
  ]);
  type Row = { student_id: string; marks: number; remark: string | null; entered_at: string; profiles: Pick<Profile, "full_name" | "student_id" | "town" | "school" | "mobile"> | null };
  const rows = ((marks ?? []) as unknown as Row[]).map((r) => ({ ...r, marks: Number(r.marks) }));
  // Competition ranking (1, 2, 2, 4) – same as the student leaderboard.
  let lastMarks = Number.NaN, lastRank = 0;
  const ranked = rows.map((r, i) => { if (r.marks !== lastMarks) { lastRank = i + 1; lastMarks = r.marks; } return { ...r, rank: lastRank }; });
  const avg = rows.length ? rows.reduce((s, r) => s + r.marks, 0) / rows.length : 0;
  const passRate = rows.length ? Math.round((rows.filter((r) => pct(r.marks, total) >= 35).length / rows.length) * 100) : 0;
  const towns = townKeys(centers).map((x) => ({ town: x, n: rows.filter((r) => r.profiles?.town === x).length })).filter((x) => x.n);
  const dist = (["A", "B", "C", "S", "F"] as const).map((g) => ({ g, n: rows.filter((r) => grade(pct(r.marks, total)) === g).length }));
  const maxBand = Math.max(1, ...dist.map((d) => d.n));
  const file = (p: string | null) => (p ? `/api/files/papers?path=${encodeURIComponent(p)}` : null);

  return (
    <div className="space-y-6">
      <Link href="/admin/papers" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-primary"><ArrowLeft className="h-4 w-4" /> {t("back")}</Link>
      <PageHeader title={paper.title} icon={FileText}
        description={[f.date(paper.paper_date), tc(`paperTypes.${paper.paper_type}`), paper.al_year ? tc("alBatch", { year: paper.al_year }) : t("allBatches"), t("outOf", { total })].join(" · ")}>
        {!paper.is_published && <Badge variant="warning" className="h-8 px-3">{t("draft")}</Badge>}
        {file(paper.paper_path) && <a href={file(paper.paper_path)!} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}><Download /> {t("paperFile")}</a>}
        {file(paper.answers_path) && <a href={file(paper.answers_path)!} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}><Download /> {t("answersFile")}</a>}
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("stats.entries")} value={rows.length} icon={Users} />
        <StatCard label={t("stats.average")} value={rows.length ? `${pct(avg, total)}%` : tc("dash")} icon={Percent} tone="sky" hint={rows.length ? t("avgMarks", { marks: Math.round(avg * 10) / 10, total }) : undefined} />
        <StatCard label={t("stats.top")} value={rows[0] ? rows[0].marks : tc("dash")} icon={Trophy} tone="amber" hint={rows[0]?.profiles?.full_name} />
        <StatCard label={t("stats.pass")} value={rows.length ? `${passRate}%` : tc("dash")} icon={Medal} tone="green" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          <Card className="overflow-hidden">
            <div className="border-b bg-gradient-to-r from-accent via-accent/40 to-transparent p-5">
              <h2 className="font-display text-lg font-semibold">{t("entry.title")}</h2>
              <p className="text-sm text-muted-foreground">{t("entry.subtitle")}</p>
            </div>
            <CardContent className="pt-5 sm:pt-5"><MarksEntry paperId={paper.id} total={total} /></CardContent>
          </Card>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">{t("results", { n: rows.length })}</h2>
              <Link href={`/dashboard/papers/${paper.id}`} className="text-sm font-medium text-primary hover:underline">{t("studentView")}</Link>
            </div>
            <Table>
              <thead><tr><th className="w-14">#</th><th>{t("cols.student")}</th><th>{t("cols.center")}</th><th className="text-right">%</th><th className="text-right">{t("cols.marks")}</th></tr></thead>
              <tbody>
                {ranked.map((r) => (
                  <tr key={r.student_id}>
                    <td>
                      <span className={cn("grid h-8 w-8 place-items-center rounded-lg text-xs font-bold",
                        r.rank === 1 ? "bg-gradient-to-br from-medal-gold-from to-medal-gold-to text-white" : r.rank === 2 ? "bg-gradient-to-br from-medal-silver-from to-medal-silver-to text-white" : r.rank === 3 ? "bg-gradient-to-br from-medal-bronze-from to-medal-bronze-to text-white" : "bg-muted text-muted-foreground")}>{r.rank}</span>
                    </td>
                    <td>
                      <p className="font-medium">{r.profiles?.full_name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{r.profiles?.student_id}{r.remark ? <span className="ml-2 font-sans italic">“{r.remark}”</span> : null}</p>
                    </td>
                    <td className="text-xs">{r.profiles ? tc(`towns.${r.profiles.town}`) : tc("dash")}</td>
                    <td className="text-right text-xs font-semibold text-primary">{pct(r.marks, total)}%</td>
                    <td><EditMarkCell paperId={paper.id} studentId={r.student_id} name={r.profiles?.full_name ?? ""} marks={r.marks} remark={r.remark} total={total} /></td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">{t("noMarks")}</td></tr>}
              </tbody>
            </Table>
          </section>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-4 w-4 text-primary" /> {t("distribution")}</CardTitle></CardHeader>
            <CardContent className="space-y-2.5">
              {dist.map((d) => (
                <div key={d.g} className="flex items-center gap-3 text-sm">
                  <span className="w-6 font-display font-bold">{d.g}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-brand" style={{ width: `${(d.n / maxBand) * 100}%` }} /></div>
                  <span className="w-8 text-right text-xs font-semibold text-muted-foreground">{d.n}</span>
                </div>
              ))}
              {towns.length > 0 && (
                <div className="flex flex-wrap gap-1.5 border-t pt-3">
                  {towns.map((x) => <span key={x.town} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{tc(`towns.${x.town}`)} · {x.n}</span>)}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{t("edit")}</CardTitle>
              {isOwnerRole(profile.role) && <DeletePaperButton id={paper.id} />}
            </CardHeader>
            <CardContent><PaperForm paper={paper} classes={(classes ?? []) as Pick<ClassRow, "id" | "title">[]} today={colomboToday()} /></CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
