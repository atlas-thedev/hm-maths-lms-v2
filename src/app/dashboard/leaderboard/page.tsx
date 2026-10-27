import { Award, CalendarRange, Flame, MapPin, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { requireUser } from "@/lib/auth";
import { PageHeader, StatCard, cardVariants } from "@/components/ui";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { FilterTabs, Leaderboard, type BoardRow } from "@/components/leaderboard";
import { RankTile } from "@/components/portal/progress-widgets";
import { AL_YEARS } from "@/lib/constants";
import { townKeys } from "@/lib/centers";
import { getCenters } from "@/lib/settings";
import { PERIODS, periodRange, scopesOf, scopeTown, type Period } from "@/lib/papers";
import { getOverallBoard, getPaperStats } from "@/lib/paper-data";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  return { title: (await getT("portal.nav"))("leaderboard") };
}

type SP = { scope?: string; period?: string; batch?: string; type?: string };

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { db, profile } = await requireUser();
  const [t, tc, centers] = await Promise.all([getT("portal.ranks"), getT("common"), getCenters()]);
  const towns = townKeys(centers);

  const town = scopeTown(sp.scope, towns);
  const scope = town ?? "island";
  const period: Period = (PERIODS as readonly string[]).includes(sp.period ?? "") ? (sp.period as Period) : "month";
  const batch = sp.batch === "all" ? "all" : AL_YEARS.map(String).includes(sp.batch ?? "") ? sp.batch! : profile.al_year ? String(profile.al_year) : "all";
  const type = sp.type === "weekly" ? "weekly" : "all";
  const { from, to } = periodRange(period);
  const year = batch === "all" ? null : Number(batch);
  const ptype = type === "weekly" ? "weekly" : null;

  const [board, island, local, stats] = await Promise.all([
    getOverallBoard(db, { town, year, type: ptype, from, to, limit: 100 }),
    getOverallBoard(db, { town: null, year, type: ptype, from, to, limit: 1000 }),
    profile.town ? getOverallBoard(db, { town: profile.town, year, type: ptype, from, to, limit: 1000 }) : Promise.resolve([]),
    getPaperStats(db),
  ]);
  const meIsland = island.find((r) => r.is_me);
  const meTown = local.find((r) => r.is_me);

  const href = (patch: Partial<SP>) => {
    const q = new URLSearchParams();
    const next = { scope, period, batch, type, ...patch };
    if (next.scope !== "island") q.set("scope", next.scope!);
    if (next.period !== "month") q.set("period", next.period!);
    q.set("batch", next.batch!);
    if (next.type !== "all") q.set("type", next.type!);
    return `/dashboard/leaderboard?${q.toString()}`;
  };
  const rows: BoardRow[] = board.map((r, i) => ({
    key: `${r.student_code ?? i}-${i}`, rank: r.rank, name: r.full_name, isMe: r.is_me, premium: r.premium,
    // Repeat students are ranked with the batch they are sitting now, with a small note.
    note: r.attempt > 1 ? `(${tc(`attempts.${r.attempt}`)})` : undefined,
    sub: [r.student_code, tc(`towns.${r.town}`)].filter(Boolean).join(" · "),
    side: t("papersAvg", { n: r.papers, avg: r.avg_pct }),
    main: `${Math.round(r.points)}`, mainLabel: t("pts"),
  }));

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} icon={Trophy} eyebrow={t("eyebrow")} />

      <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StaggerItem><RankTile label={t("islandRank")} rank={meIsland?.rank ?? null} of={island[0]?.entrants} tone="warning" /></StaggerItem>
        <StaggerItem><RankTile icon="pin" tone="info" label={t("townRank", { town: profile.town ? tc(`towns.${profile.town}`) : "" })} rank={meTown?.rank ?? null} of={local[0]?.entrants} /></StaggerItem>
        <StaggerItem><StatCard label={t("myPoints")} value={meIsland ? Math.round(meIsland.points) : 0} icon={Award} tone="highlight" hint={t("pointsHint")} /></StaggerItem>
        <StaggerItem><StatCard label={t("streak")} value={t("weeksN", { n: stats?.streak ?? 0 })} icon={Flame} tone="brand" hint={t("bestN", { n: stats?.best_streak ?? 0 })} /></StaggerItem>
      </Stagger>

      <Reveal className={cn(cardVariants(), "space-y-3 p-4")}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex w-24 items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {t("filters.scope")}</span>
          <FilterTabs id="scope" active={scope} items={scopesOf(towns).map((s) => ({ value: s, label: s === "island" ? t("island") : tc(`towns.${s}`), href: href({ scope: s }) }))} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex w-24 items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><CalendarRange className="h-3.5 w-3.5" /> {t("filters.period")}</span>
          <FilterTabs id="period" active={period} items={PERIODS.map((p) => ({ value: p, label: t(`periods.${p}`), href: href({ period: p }) }))} />
          <FilterTabs id="type" active={type} items={(["all", "weekly"] as const).map((x) => ({ value: x, label: t(`types.${x}`), href: href({ type: x }) }))} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex w-24 items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Users className="h-3.5 w-3.5" /> {t("filters.batch")}</span>
          <FilterTabs id="batch" active={batch} items={["all", ...AL_YEARS.map(String)].map((b) => ({ value: b, label: b === "all" ? t("allBatches") : tc("alBatch", { year: b }), href: href({ batch: b }) }))} />
        </div>
        <p className="text-[11px] text-muted-foreground" data-testid="repeat-note">({t("repeatNote")})</p>
      </Reveal>

      <Leaderboard rows={rows} emptyLabel={t("empty")} youLabel={t("you")} premiumLabel={tc("premium.name")} meLabel={tc("premium.yourPosition")} />
      <p className="text-center text-xs text-muted-foreground">{t("howPoints")}</p>
    </div>
  );
}
