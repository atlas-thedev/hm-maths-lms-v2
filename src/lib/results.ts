/*
 * Exam results shown on the public /results page ("විභාග ප්‍රතිඵල").
 *
 * Two kinds of rows:
 *   · villager  — a district/organisation top result. One big name, then the same details for everyone.
 *   · student   — a normal result (A / B / C …) with the grade shown as the line's "rank" slot.
 *
 * Photos are optional; without one the page draws a placeholder with the student's initials.
 * Everything here is developer-editable (Developer panel → Results) and stored in system_settings.
 */

export const RESULT_KINDS = ["district", "student"] as const;
export type ResultKind = (typeof RESULT_KINDS)[number];

/** A/L Combined Maths grades, best first, plus the pending state. */
export const RESULT_GRADES = ["A", "B", "C", "S", "W", "F", "-"] as const;
export type ResultGrade = (typeof RESULT_GRADES)[number];

export interface ExamResult {
  id: string;
  kind: ResultKind;
  /** Student's name as it should appear. */
  name: string;
  photo: string;
  /** A/L examination year, e.g. 2025. */
  year: string;
  /** Where the result came from: a center (Panadura), a school, or "Island". */
  district: string;
  /** Sinhala version of the district (optional — the English one is used when empty). */
  districtSi: string;
  /** Grade: A, B, C … shown as the rank slot on a normal row. */
  grade: ResultGrade;
  /** Marks / percentage / "Top 10" — free text, optional. */
  marks: string;
  /** Short line under a district (big) result, e.g. "Island rank 7". */
  noteEn: string;
  noteSi: string;
  /** Highlight this row with the medal colour. */
  featured: boolean;
  /** Unticked rows stay in the panel but are not published. */
  enabled: boolean;
}

export interface ResultsSettings {
  /** Line above the title, e.g. "Our students' 2025 A/L results". */
  eyebrowEn: string; eyebrowSi: string;
  titleEn: string; titleSi: string;
  /** Paragraph under the title. */
  introEn: string; introSi: string;
  results: ExamResult[];
  /** Ordering used on the page. */
  sort: "year" | "district" | "grade";
}

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const imageUrl = (v: unknown) => {
  const u = text(v, 400);
  return /^\/api\/storage\/public\/[\w-]+\/[\w./%-]+$/.test(u) || /^https:\/\/\S+$/.test(u) ? u : "";
};
export const isResultKind = (v: unknown): v is ResultKind => RESULT_KINDS.includes(v as ResultKind);
export const isResultGrade = (v: unknown): v is ResultGrade => RESULT_GRADES.includes(v as ResultGrade);

/** Best first: A → B → C → … → pending. Used when sorting "by grade". */
export const gradeWeight = (g: string): number => {
  const i = (RESULT_GRADES as readonly string[]).indexOf(g);
  return i === -1 ? RESULT_GRADES.length : i;
};

export function blankResult(kind: ResultKind = "student"): ExamResult {
  return {
    id: `result-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind, name: "", photo: "", year: String(new Date().getFullYear()), district: "", districtSi: "",
    grade: "-", marks: "", noteEn: "", noteSi: "", featured: false, enabled: true,
  };
}

export const DEFAULT_RESULTS_TEXT: Omit<ResultsSettings, "sort"> = {
  eyebrowEn: "Results", eyebrowSi: "ප්‍රතිඵල",
  titleEn: "Our students' results", titleSi: "අපගේ සිසුන්ගේ ප්‍රතිඵල",
  introEn: "Every year our students sit the G.C.E. Advanced Level examination in Combined Mathematics. Here are the results from our classes — district toppers first, then every result we have been given permission to publish.",
  introSi: "සෑම වසරකම අපගේ සිසුන් සංයුක්ත ගණිතය සඳහා උසස් පෙළ විභාගයට පෙනී සිටිති. අපගේ පන්තිවල ප්‍රතිඵල මෙහි දැක්වේ — පළමුව දිස්ත්‍රික්කයේ ඉහළම ලකුණු ලබාගත් සිසුන්, පසුව ප්‍රකාශයට පත් කිරීමට අවසර ලැබුණු සියලුම ප්‍රතිඵල.",
  results: [],
};

export function normalizeTopResults(v: unknown): ResultsSettings {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const raw = Array.isArray(o.results) ? o.results : [];
  const results: ExamResult[] = raw
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
    .map((r, i) => ({
      id: text(r.id, 60) || `result-${i + 1}`,
      kind: isResultKind(r.kind) ? r.kind : "student",
      name: text(r.name, 80),
      photo: imageUrl(r.photo),
      year: text(r.year, 4).replace(/\D/g, "").slice(0, 4),
      district: text(r.district, 60),
      districtSi: text(r.districtSi, 60),
      grade: isResultGrade(r.grade) ? r.grade : "-",
      marks: text(r.marks, 24),
      noteEn: text(r.noteEn, 120),
      noteSi: text(r.noteSi, 120),
      featured: r.featured === true,
      enabled: r.enabled === undefined ? true : r.enabled === true,
    }))
    .filter((r) => r.name || r.district || r.marks);
  const sort = o.sort === "district" || o.sort === "grade" ? o.sort : "year";
  return {
    eyebrowEn: text(o.eyebrowEn, 60) || DEFAULT_RESULTS_TEXT.eyebrowEn,
    eyebrowSi: text(o.eyebrowSi, 60) || DEFAULT_RESULTS_TEXT.eyebrowSi,
    titleEn: text(o.titleEn, 90) || DEFAULT_RESULTS_TEXT.titleEn,
    titleSi: text(o.titleSi, 90) || DEFAULT_RESULTS_TEXT.titleSi,
    introEn: text(o.introEn, 600) || DEFAULT_RESULTS_TEXT.introEn,
    introSi: text(o.introSi, 600) || DEFAULT_RESULTS_TEXT.introSi,
    results, sort,
  };
}

/** District (big) rows first, then normal rows — each group ordered per the chosen sort. */
export function orderResults(s: ResultsSettings): { districts: ExamResult[]; students: ExamResult[] } {
  const on = s.results.filter((r) => r.enabled && (r.name || r.district));
  const cmp = (a: ExamResult, b: ExamResult) => {
    if (s.sort === "grade") return gradeWeight(a.grade) - gradeWeight(b.grade) || a.name.localeCompare(b.name);
    if (s.sort === "district") return (a.district || "").localeCompare(b.district || "") || a.name.localeCompare(b.name);
    // newest examination year first, then best grade
    return (b.year || "").localeCompare(a.year || "") || gradeWeight(a.grade) - gradeWeight(b.grade) || a.name.localeCompare(b.name);
  };
  return {
    // A featured district result always leads its group.
    districts: on.filter((r) => r.kind === "district").sort((a, b) => Number(b.featured) - Number(a.featured) || cmp(a, b)),
    students: on.filter((r) => r.kind === "student").sort(cmp),
  };
}

/** "Bandara" → "B"; used for the placeholder tile. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Group key used for the "by year" chips on the page. */
export const resultYears = (rows: ExamResult[]): string[] =>
  [...new Set(rows.map((r) => r.year).filter(Boolean))].sort((a, b) => b.localeCompare(a));
