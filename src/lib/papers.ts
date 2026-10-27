import type { Town } from "./constants";

export const PAPER_TYPES = ["weekly", "monthly", "model", "term"] as const;
export type PaperType = (typeof PAPER_TYPES)[number];

export interface Paper {
  id: string;
  title: string;
  description: string | null;
  paper_type: PaperType;
  class_id: string | null;
  al_year: number | null;
  paper_date: string; // YYYY-MM-DD
  total_marks: number;
  paper_path: string | null;
  answers_path: string | null;
  is_published: boolean;
  created_at: string;
}

/** attempt (1st / 2nd / 3rd A/L attempt), al_year and premium come with every leaderboard row. */
type BoardExtras = { attempt: number; al_year: number | null; premium: boolean };

export interface PaperLeaderRow extends BoardExtras {
  rank: number; student_code: string | null; full_name: string; town: Town; school: string | null;
  marks: number; total_marks: number; pct: number; is_me: boolean; entrants: number;
}

export interface OverallLeaderRow extends BoardExtras {
  rank: number; student_code: string | null; full_name: string; town: Town; school: string | null;
  points: number; papers: number; avg_pct: number; best_pct: number; is_me: boolean; entrants: number;
}

/** Premium Verified ✓ — see db/migrations/0012_premium_ranks.sql for the rules. */
export interface PremiumStatus {
  premium: boolean; papers: number; avg: number; had_slip: boolean; since_slip: number;
  threshold: number; floor: number; min_papers: number; recover: number;
}

/** What the student still needs for the badge, in display order. */
export function premiumProgress(s: PremiumStatus | null) {
  if (!s) return null;
  const morePapers = Math.max(0, s.min_papers - s.papers);
  const moreGood = s.had_slip ? Math.max(0, s.recover - s.since_slip) : 0;
  return { morePapers, moreGood, avgOk: s.avg >= s.threshold, percent: Math.min(100, Math.round((s.avg / s.threshold) * 100)) };
}

/** My all-island + center rank on one paper (my_paper_ranks). */
export type MyPaperRank = { paper_id: string; marks: number; rank_island: number; entrants_island: number; rank_town: number; entrants_town: number };

export interface PaperStats {
  papers?: number;
  avg_pct?: number;
  best_pct?: number;
  points?: number;
  full_marks?: number;
  streak: number;
  best_streak: number;
  streaks?: Partial<Record<StreakKey, StreakValue>>;
  town: Town | null;
  al_year: number | null;
  last: null | {
    paper_id: string; title: string; paper_date: string; paper_type: PaperType;
    marks: number; total_marks: number; pct: number;
    rank_island: number; entrants_island: number; rank_town: number; entrants_town: number;
  };
}

/** Performance streaks (from get_my_paper_stats). Order = display order. */
export const STREAK_KEYS = ["top3", "top10", "score75", "pass50", "improve", "attend"] as const;
export type StreakKey = (typeof STREAK_KEYS)[number];
export type StreakValue = { current: number; best: number };
export type Streaks = Record<StreakKey, StreakValue>;

export function normalizeStreaks(s: PaperStats | null): Streaks {
  const out = {} as Streaks;
  for (const k of STREAK_KEYS) {
    const v = s?.streaks?.[k];
    out[k] = { current: Number(v?.current ?? (k === "attend" ? s?.streak ?? 0 : 0)), best: Number(v?.best ?? (k === "attend" ? s?.best_streak ?? 0 : 0)) };
  }
  return out;
}

/** The streak to headline: highest current run (ties → the harder streak, i.e. earlier in STREAK_KEYS). */
export function hottestStreak(st: Streaks): { key: StreakKey; value: StreakValue } | null {
  let best: { key: StreakKey; value: StreakValue } | null = null;
  for (const k of STREAK_KEYS) if (st[k].current > 0 && (!best || st[k].current > best.value.current)) best = { key: k, value: st[k] };
  return best;
}

/** Next milestone for a streak run (3 → 5 → 10 → 15 → 20 …). */
export const nextMilestone = (n: number) => [3, 5, 10, 15, 20, 30, 50].find((m) => m > n) ?? n + 10;

/** Leaderboard scopes shown as tabs: all-island + every class center. */
/** `towns` = every key from townKeys(await getCenters()). */
export const scopesOf = (towns: string[]) => ["island", ...towns];
export const scopeTown = (s: string | undefined, towns: string[]): Town | null => (s && towns.includes(s) ? s : null);

export const PERIODS = ["week", "month", "year", "all"] as const;
export type Period = (typeof PERIODS)[number];

/** Sri Lanka "today" as YYYY-MM-DD. */
export function colomboToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Date range for a leaderboard period (week = Monday → today). */
export function periodRange(p: Period, now = new Date()): { from: string | null; to: string | null } {
  const today = colomboToday(now);
  const [y, m, d] = today.split("-").map(Number);
  if (p === "all") return { from: null, to: null };
  if (p === "year") return { from: `${y}-01-01`, to: today };
  if (p === "month") return { from: `${y}-${String(m).padStart(2, "0")}-01`, to: today };
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7)); // back to Monday
  return { from: dt.toISOString().slice(0, 10), to: today };
}

export function pct(marks: number, total: number) {
  return total > 0 ? Math.round((marks / total) * 1000) / 10 : 0;
}

/** Letter grade used on result cards (A/L style). */
export function grade(p: number): "A" | "B" | "C" | "S" | "F" {
  return p >= 75 ? "A" : p >= 65 ? "B" : p >= 50 ? "C" : p >= 35 ? "S" : "F";
}

export type BadgeKey = "premium" | "firstPaper" | "streak3" | "streak5" | "streak10" | "top10" | "champion" | "townChampion" | "fullMarks" | "score90" | "hot10" | "pass50x5" | "score75x3" | "improve3" | "papers10";

/** Achievements unlocked from paper stats + performance streaks. */
export function achievements(s: PaperStats | null, premium = false): { key: BadgeKey; unlocked: boolean }[] {
  const n = s?.papers ?? 0;
  const st = normalizeStreaks(s);
  const last = s?.last;
  return [
    { key: "premium", unlocked: premium },
    { key: "firstPaper", unlocked: n >= 1 },
    { key: "streak3", unlocked: st.attend.best >= 3 },
    { key: "streak5", unlocked: st.attend.best >= 5 },
    { key: "streak10", unlocked: st.attend.best >= 10 },
    { key: "pass50x5", unlocked: st.pass50.best >= 5 },
    { key: "score75x3", unlocked: st.score75.best >= 3 },
    { key: "improve3", unlocked: st.improve.best >= 3 },
    { key: "hot10", unlocked: st.top10.best >= 3 },
    { key: "score90", unlocked: (s?.best_pct ?? 0) >= 90 },
    { key: "fullMarks", unlocked: (s?.full_marks ?? 0) >= 1 },
    { key: "top10", unlocked: st.top10.best >= 1 || (!!last && last.rank_island <= 10) },
    { key: "townChampion", unlocked: !!last && last.rank_town === 1 },
    { key: "champion", unlocked: st.top3.best >= 1 && !!last && last.rank_island === 1 },
    { key: "papers10", unlocked: n >= 10 },
  ];
}
