import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, FileText, TrendingUp, Trophy } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Card, CardContent, MetricTile, PageHeader, buttonVariants } from "@/components/ui";
import { Reveal } from "@/components/motion";
import { FilterTabs, Leaderboard, type BoardRow } from "@/components/leaderboard";
import { RankTile, ScoreRing } from "@/components/portal/progress-widgets";
import { townKeys } from "@/lib/centers";
import { getCenters } from "@/lib/settings";
import { grade, pct, scopesOf, scopeTown, type Paper } from "@/lib/papers";
import { getPaperBoard } from "@/lib/paper-data";
import { getFormat, getT } from "@/i18n/server";

const file = (p: string | null) => (p ? `/api/files/papers?path=${encodeURIComponent(p)}` : null);

export default async function PaperResultPage({ params, searchParams }: { params: Promise<{ paperId: string }>; searchParams: Promise<{ scope?: string }> }) {
  const [{ paperId }, { scope: rawScope }] = await Promise.all([params, searchParams]);
  const { db, user, profile } = await requireUser();
  const [t, tc, f, centers] = await Promise.all([getT("portal.papers"), getT("common"), getFormat(), getCenters()]);
  const towns = townKeys(centers);
  const { data } = await db.from("papers").select("*").eq("id", paperId).maybeSingle();
  if (!data) notFound();
  const paper = data as Paper;
  const total = Number(paper.total_marks);
  const town = scopeTown(rawScope, towns);
  const scope = town ?? "island";

  const [{ data: mineRow }, board, island, local] = await Promise.all([
    db.from("paper_marks").select("marks, remark").eq("paper_id", paperId).eq("student_id", user.id).maybeSingle(),
    getPaperBoard(db, paperId, town, 100),
    getPaperBoard(db, paperId, null, 500),
    profile.town ? getPaperBoard(db, paperId, profile.town, 500) : Promise.resolve([]),
  ]);
  const mine = mineRow ? { marks: Number(mineRow.marks), remark: (mineRow.remark as string | null) ?? null } : null;
  const meIsland = island.find((r) => r.is_me);
  const meTown = local.find((r) => r.is_me);
  const entrants = island[0]?.entrants ?? 0;
  const ahead = meIsland && entrants > 1 ? Math.round((island.filter((r) => r.marks < meIsland.marks).length / (entrants - 1)) * 100) : null;
  const avg = island.length ? island.reduce((s, r) => s + r.marks, 0) / island.length : 0;

  const rows: BoardRow[] = board.map((r, i) => ({
    key: `${r.student_code ?? i}-${i}`, rank: r.rank, name: r.full_name, isMe: r.is_me, premium: r.premium,
    note: r.attempt > 1 ? `(${tc(`attempts.${r.attempt}`)})` : undefined,
    sub: [r.student_code, tc(`towns.${r.town}`)].filter(Boolean).join(" · "),
    side: r.school ?? undefined, main: `${r.marks}`, mainLabel: `${r.pct}%`,
  }));
  const tabs = scopesOf(towns).map((s) => ({ value: s, label: s === "island" ? t("scope.island") : tc(`towns.${s}`), href: `/dashboard/papers/${paperId}${s === "island" ? "" : `?scope=${s}`}` }));

  return (
    <div className="space-y-6">
      <Link href="/dashboard/papers" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-primary"><ArrowLeft className="h-4 w-4" /> {t("back")}</Link>
      <PageHeader title={paper.title} icon={FileText}
        description={[f.date(paper.paper_date), tc(`paperTypes.${paper.paper_type}`), t("outOf", { total })].join(" · ")}>
        {file(paper.paper_path) && <a href={file(paper.paper_path)!} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}><Download /> {t("paperFile")}</a>}
        {file(paper.answers_path) && <a href={file(paper.answers_path)!} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}><Download /> {t("answersFile")}</a>}
      </PageHeader>
      {paper.description && <p className="-mt-3 max-w-3xl text-sm text-muted-foreground">{paper.description}</p>}

      <Reveal>
        <Card className="overflow-hidden">
          <CardContent className="grid grid-cols-1 items-center gap-5 p-5 md:grid-cols-[auto_1fr]">
            {mine ? (
              <>
                <div className="flex flex-col items-center">
                  <ScoreRing value={pct(mine.marks, total)} size={148} label={t("marksOf", { marks: mine.marks, total })} sub={`${t("grade")} ${grade(pct(mine.marks, total))}`} />
                  {mine.remark && <p className="mt-2 max-w-[180px] text-center text-xs text-muted-foreground">“{mine.remark}”</p>}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <RankTile label={t("islandRank")} rank={meIsland?.rank ?? null} of={entrants} />
                  <RankTile icon="pin" tone="info" label={t("townRank", { town: profile.town ? tc(`towns.${profile.town}`) : "" })} rank={meTown?.rank ?? null} of={local[0]?.entrants} />
                  <MetricTile icon={TrendingUp} tone="success" label={t("ahead")} value={ahead === null ? tc("dash") : `${ahead}%`} />
                  <MetricTile icon={Trophy} tone="highlight" label={t("classAvg")} value={island.length ? `${pct(avg, total)}%` : tc("dash")} />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground md:col-span-2">{t("noMarkYet")}</p>
            )}
          </CardContent>
        </Card>
      </Reveal>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Trophy className="h-5 w-5 text-medal-gold-to" /> {t("board")}</h2>
          <FilterTabs id="paper-scope" items={tabs} active={scope} />
        </div>
        <Leaderboard rows={rows} emptyLabel={t("boardEmpty")} youLabel={t("you")} premiumLabel={tc("premium.name")} meLabel={tc("premium.yourPosition")} />
      </section>
    </div>
  );
}
