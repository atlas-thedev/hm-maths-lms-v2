import "server-only";
import type { DbClient } from "@/lib/db/types";
import type { MyPaperRank, OverallLeaderRow, Paper, PaperLeaderRow, PaperStats, PremiumStatus } from "./papers";

const num = <T extends object>(r: T, keys: (keyof T)[]): T => {
  const o = { ...r } as Record<keyof T, unknown>;
  for (const k of keys) if (o[k] !== null && o[k] !== undefined) o[k] = Number(o[k]);
  return o as T;
};

export async function getPaperStats(db: DbClient): Promise<PaperStats | null> {
  const { data, error } = await db.rpc("get_my_paper_stats");
  if (error || !data) return null;
  const s = data as PaperStats;
  if (s.last) s.last = num(s.last, ["marks", "total_marks", "pct", "rank_island", "entrants_island", "rank_town", "entrants_town"]);
  return num(s, ["papers", "avg_pct", "best_pct", "points", "full_marks", "streak", "best_streak"]);
}


export async function getPaperBoard(db: DbClient, paperId: string, town: string | null, limit = 100): Promise<PaperLeaderRow[]> {
  const { data } = await db.rpc("paper_board", { p_paper: paperId, p_town: town, p_limit: limit });
  return ((data ?? []) as PaperLeaderRow[]).map((r) => num(r, ["rank", "marks", "total_marks", "pct", "entrants", "attempt"]));
}

export async function getOverallBoard(db: DbClient, f: { town?: string | null; year?: number | null; type?: string | null; from?: string | null; to?: string | null; limit?: number }): Promise<OverallLeaderRow[]> {
  const { data } = await db.rpc("season_board", {
    p_town: f.town ?? null, p_year: f.year ?? null, p_type: f.type ?? null, p_from: f.from ?? null, p_to: f.to ?? null, p_limit: f.limit ?? 100,
  });
  return ((data ?? []) as OverallLeaderRow[]).map((r) => num(r, ["rank", "points", "papers", "avg_pct", "best_pct", "entrants", "attempt"]));
}

export async function getPremiumStatus(db: DbClient): Promise<PremiumStatus | null> {
  const { data, error } = await db.rpc("my_premium_status");
  if (error || !data) return null;
  return num(data as PremiumStatus, ["papers", "avg", "since_slip", "threshold", "floor", "min_papers", "recover"]);
}

/** paper_id → my all-island and center rank on that paper. */
export async function getMyPaperRanks(db: DbClient): Promise<Map<string, MyPaperRank>> {
  const { data } = await db.rpc("my_paper_ranks");
  return new Map(((data ?? []) as MyPaperRank[]).map((r) => [r.paper_id, num(r, ["marks", "rank_island", "entrants_island", "rank_town", "entrants_town"])]));
}

/** Published papers for the student's batch (plus any paper they have marks in), newest first. */
export async function getMyPapers(db: DbClient, userId: string, alYear: number | null) {
  const [{ data: papers }, { data: marks }] = await Promise.all([
    db.from("papers").select("*").order("paper_date", { ascending: false }).order("created_at", { ascending: false }).limit(120),
    db.from("paper_marks").select("paper_id, marks, remark").eq("student_id", userId),
  ]);
  const mine = new Map((marks ?? []).map((m) => [m.paper_id as string, { marks: Number(m.marks), remark: (m.remark as string | null) ?? null }]));
  return ((papers ?? []) as Paper[])
    .map((p) => ({ ...p, total_marks: Number(p.total_marks), mine: mine.get(p.id) ?? null }))
    .filter((p) => p.mine || !p.al_year || !alYear || p.al_year === alYear);
}
