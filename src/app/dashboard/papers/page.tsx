import Link from "next/link";
import { Award, BadgeCheck, BarChart3, ChevronRight, Download, FileText, MapPin, Percent, Star, Trophy } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Badge, Card, CardContent, CardHeader, EmptyNote, EmptyState, IconTile, PageHeader, ProgressBar, StatCard, buttonVariants, toneSoft } from "@/components/ui";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { DateTile } from "@/components/date-tile";
import { ResultsChart } from "@/components/portal/charts";
import { Achievements, RankTile, ScoreRing, StreakPanel } from "@/components/portal/progress-widgets";
import { achievements, grade, normalizeStreaks, pct, premiumProgress } from "@/lib/papers";
import { getMyPaperRanks, getMyPapers, getPaperStats, getPremiumStatus } from "@/lib/paper-data";
import { PremiumMark } from "@/components/premium-badge";
import { Sticker } from "@/components/sticker";
import { getFormat, getT } from "@/i18n/server";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  return { title: (await getT("portal.nav"))("papers") };
}

const file = (p: string | null) => (p ? `/api/files/papers?path=${encodeURIComponent(p)}` : null);

export default async function MyPapersPage() {
  const { db, user, profile } = await requireUser();
  const [t, tc, f] = await Promise.all([getT("portal.papers"), getT("common"), getFormat()]);
  const [stats, papers, premium, ranks] = await Promise.all([
    getPaperStats(db), getMyPapers(db, user.id, profile.al_year ?? null), getPremiumStatus(db), getMyPaperRanks(db),
  ]);
  const pp = premiumProgress(premium);
  const last = stats?.last ?? null;
  const sat = papers.filter((p) => p.mine).slice(0, 10).reverse();
  const chart = sat.map((p, i) => ({ label: t("paperN", { n: i + 1 }), title: p.title, value: Math.round(pct(p.mine!.marks, p.total_marks)) }));
  const town = profile.town ? tc(`towns.${profile.town}`) : null;

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} icon={FileText} eyebrow={t("eyebrow")}>
        <Link href="/dashboard/leaderboard" className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition hover:-translate-y-px"><Trophy className="h-4 w-4" /> {t("openLeaderboard")}</Link>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Reveal delay={0.05}>
          <Card className="h-full overflow-hidden">
            {last ? (
              <>
                <div className="relative bg-gradient-brand p-5 text-white">
                  <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/90"><Sticker name="cool-ducks" size={20} /> {t("latest")}</p>
                  <p className="mt-1 truncate font-display text-xl font-bold">{last.title}</p>
                  <p className="text-xs text-white/90">{f.date(last.paper_date)} · {tc(`paperTypes.${last.paper_type}`)}</p>
                </div>
                <CardContent className="p-5">
                  <div className="flex flex-col items-center gap-5 sm:flex-row">
                    <ScoreRing value={last.pct} label={t("marksOf", { marks: last.marks, total: last.total_marks })} />
                    <div className="grid w-full flex-1 grid-cols-1 gap-3">
                      <RankTile label={t("islandRank")} rank={last.rank_island} of={last.entrants_island} href={`/dashboard/papers/${last.paper_id}`} />
                      <RankTile icon="pin" tone="info" label={t("townRank", { town: town ?? "" })} rank={last.rank_town} of={last.entrants_town} href={`/dashboard/papers/${last.paper_id}?scope=${profile.town}`} />
                      <div className="flex items-center justify-between rounded-2xl bg-muted/60 px-4 py-2.5 text-sm">
                        <span className="text-muted-foreground">{t("grade")}</span>
                        <span className="font-display text-lg font-bold text-primary">{grade(last.pct)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <div className="flex h-full p-4 sm:p-5">
                <EmptyNote icon={Star} eyebrow={t("latest")} title={t("noLatest")} description={t("noLatestText")} className="w-full justify-center" />
              </div>
            )}
          </Card>
        </Reveal>
        <Stagger className="grid grid-cols-2 gap-4">
          <StaggerItem><StatCard label={t("stats.sat")} value={stats?.papers ?? 0} icon={FileText} /></StaggerItem>
          <StaggerItem><StatCard label={t("stats.average")} value={stats?.papers ? `${stats.avg_pct}%` : tc("dash")} icon={Percent} tone="info" /></StaggerItem>
          <StaggerItem><StatCard label={t("stats.best")} value={stats?.papers ? `${stats.best_pct}%` : tc("dash")} icon={Star} tone="warning" /></StaggerItem>
          <StaggerItem><StatCard label={t("stats.points")} value={Math.round(stats?.points ?? 0)} icon={Award} tone="highlight" hint={t("stats.pointsHint")} /></StaggerItem>
        </Stagger>
      </div>

      {/* Premium Verified ✓ — automatic badge (rules in db/migrations/0012_premium_ranks.sql) */}
      {premium && pp && (
        <Reveal>
          <Card data-testid="premium-card" className={premium.premium ? "border-info/40 ring-1 ring-info/20" : undefined}>
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_15rem] sm:items-center">
                <div className="flex items-start gap-3.5">
                  <IconTile icon={BadgeCheck} size="lg" tone={premium.premium ? "info" : "neutral"} variant={premium.premium ? "solid" : "soft"} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                      <h3 className="font-display text-lg font-bold leading-tight">{tc("premium.name")}</h3>
                      {premium.premium && <PremiumMark label={tc("premium.active")} withText />}
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {premium.premium ? t("premium.keep", { floor: premium.floor })
                        : t("premium.rule", { threshold: premium.threshold, min: premium.min_papers, floor: premium.floor })}
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl bg-muted/60 p-3.5">
                  <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{t("premium.average")}</span><span className="font-bold text-foreground">{premium.avg}% / {premium.threshold}%</span></div>
                  <ProgressBar value={pp.percent} tone="info" label={t("premium.average")} />
                </div>
              </div>
              {!premium.premium && (
                <ul className="flex flex-wrap gap-2 border-t pt-3.5 text-xs font-semibold" data-testid="premium-todo">
                  {pp.morePapers > 0 && <li><Badge variant="secondary" size="lg">{t("premium.morePapers", { n: pp.morePapers })}</Badge></li>}
                  {!pp.avgOk && <li><Badge variant="secondary" size="lg">{t("premium.raiseAvg", { avg: premium.avg, threshold: premium.threshold })}</Badge></li>}
                  {pp.moreGood > 0 && <li><Badge variant="warning" size="lg">{t("premium.recover", { n: pp.moreGood, floor: premium.floor })}</Badge></li>}
                </ul>
              )}
            </CardContent>
          </Card>
        </Reveal>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader icon={BarChart3} title={t("progress")} description={t("progressHint")} />
          <CardContent><ResultsChart data={chart} emptyLabel={t("noProgress")} emptyHint={t("noLatestText")} /></CardContent>
        </Card>
        <Card>
          <CardHeader icon={Award} title={t("achievements")} />
          <CardContent><Achievements items={achievements(stats, premium?.premium ?? false)} /></CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">{t("all")}</h2>
        {papers.length ? (
          <Stagger className="space-y-2.5">
            {papers.map((p) => {
              const mine = p.mine;
              const v = mine ? pct(mine.marks, p.total_marks) : null;
              const rk = mine ? ranks.get(p.id) : undefined;
              return (
                <StaggerItem key={p.id}>
                  <Card variant="interactive" padding="md" className="group flex flex-wrap items-center gap-3 sm:gap-4">
                    <DateTile date={p.paper_date} />
                    <Link href={`/dashboard/papers/${p.id}`} className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate font-semibold group-hover:text-primary">{p.title}</p>
                        <Badge>{tc(`paperTypes.${p.paper_type}`)}</Badge>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{t("outOf", { total: p.total_marks })}{mine?.remark ? ` · ${mine.remark}` : ""}</p>
                      {rk && (
                        <p className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-semibold" data-testid="paper-ranks">
                          <Badge variant="warning"><Trophy />{t("rankIslandShort", { rank: rk.rank_island, n: rk.entrants_island })}</Badge>
                          {town && <Badge variant="info"><MapPin />{t("rankTownShort", { rank: rk.rank_town, n: rk.entrants_town, town })}</Badge>}
                        </p>
                      )}
                    </Link>
                    <div className="flex items-center gap-2">
                      {file(p.paper_path) && <a href={file(p.paper_path)!} target="_blank" rel="noreferrer" title={t("paperFile")} className={buttonVariants({ variant: "outline", size: "icon-sm" })}><Download /></a>}
                      {file(p.answers_path) && <a href={file(p.answers_path)!} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm", className: "hidden sm:inline-flex" })}><Download /> {t("answersFile")}</a>}
                      {mine ? (
                        <span className={cn("min-w-[72px] rounded-xl px-3 py-1.5 text-center font-display text-sm font-bold", toneSoft[v! >= 75 ? "success" : v! >= 50 ? "brand" : "warning"])}>
                          {mine.marks}/{p.total_marks}
                        </span>
                      ) : <span className="min-w-[72px] rounded-xl bg-muted px-3 py-1.5 text-center text-xs font-semibold text-muted-foreground">{t("notSat")}</span>}
                      <Link href={`/dashboard/papers/${p.id}`} aria-label={t("viewResult")}><ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" /></Link>
                    </div>
                  </Card>
                </StaggerItem>
              );
            })}
          </Stagger>
        ) : (
          <EmptyState icon={FileText} title={t("emptyTitle")} description={t("emptyText")} />
        )}
      </section>

      <Reveal><div id="streaks" className="scroll-mt-24"><StreakPanel streaks={normalizeStreaks(stats)} /></div></Reveal>
    </div>
  );
}
