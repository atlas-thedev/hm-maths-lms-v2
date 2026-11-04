import Link from "next/link";
import { ArrowDown, Award, GraduationCap } from "lucide-react";
import { PublicShell } from "@/components/landing/public-shell";
import { ResultPhoto } from "@/components/landing/result-photo";
import { getSession } from "@/lib/auth";
import { getStudentResults, type StudentResult } from "@/lib/public-results";
import { districtRank, resultGrade } from "@/lib/result-wall";
import { getT } from "@/i18n/server";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  const t = await getT("landing.resultsPage");
  return { title: t("title"), description: t("subtitle"), alternates: { canonical: "/results" } };
}

export default async function ResultsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const { db } = await getSession();
  const [allResults, t, params] = await Promise.all([getStudentResults(db), getT("landing.resultsPage"), searchParams]);
  const years = [...new Set(allResults.map((r) => r.exam_year))].sort((a, b) => b - a);
  const selectedYear = /^\d{4}$/.test(params.year ?? "") ? Number(params.year) : null;
  const results = selectedYear === null ? allResults : allResults.filter((r) => r.exam_year === selectedYear);
  const featured = results.filter((r) => r.distinction.trim()).sort((a, b) => {
    if (a.exam_year !== b.exam_year) return b.exam_year - a.exam_year;
    const aRank = districtRank(a.distinction);
    const bRank = districtRank(b.distinction);
    return Number(aRank?.number ?? Number.MAX_SAFE_INTEGER) - Number(bRank?.number ?? Number.MAX_SAFE_INTEGER);
  });
  const ordinary = results.filter((r) => !r.distinction.trim());
  const a = ordinary.filter((r) => resultGrade(r.grades) === "A");
  const b = ordinary.filter((r) => resultGrade(r.grades) === "B");
  const other = ordinary.filter((r) => !resultGrade(r.grades));

  const rankBadge = (number: string, compact = false) => <span aria-hidden data-testid="district-rank-badge" className={cn("flex shrink-0 flex-col items-center justify-center rounded-full border-[3px] border-white bg-red-700 text-center text-white shadow-[0_6px_18px_rgba(127,29,29,0.35)]", compact ? "h-14 w-14" : "h-28 w-28 border-4 sm:h-24 sm:w-24", !compact && "absolute bottom-4 right-4")}>
    <span className={cn("font-sans font-black leading-none tabular-nums", compact ? "text-xl" : "text-4xl", number.length > 3 && (compact ? "text-sm" : "text-2xl"))}>{number}</span>
    {!compact && <span className="mt-1 text-[10px] font-bold uppercase leading-none tracking-wider">{t("rank")}</span>}
  </span>;

  const featureCard = (r: StudentResult) => {
    const rank = districtRank(r.distinction);
    return <li key={r.id} data-testid="result-card" className="group flex h-full flex-col overflow-hidden rounded-[1.65rem] border border-brand-100 bg-white shadow-soft">
      <div className="relative overflow-hidden bg-brand-50">
        <ResultPhoto src={r.photo_url} name={r.name} />
        {rank && rankBadge(rank.number)}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="mb-4 border-l-[3px] border-red-700 pl-3 text-sm font-extrabold leading-snug text-red-800 break-words">{r.distinction}</p>
        <p className="text-xs font-bold uppercase tracking-wider text-brand-700">{r.exam_year} · {t("year")}</p>
        <h3 className="mt-1.5 break-words font-display text-lg font-extrabold leading-snug text-ink">{r.name}</h3>
        <p className="mt-3 break-words text-sm font-semibold leading-relaxed text-slate-600">{r.grades}</p>
        {r.exam_number && <p className="mt-2 break-words text-xs text-slate-500">{t("examNumber")}: {r.exam_number}</p>}
      </div>
    </li>;
  };

  const wallCard = (r: StudentResult, grade: "A" | "B" | null) => {
    const rank = districtRank(r.grades);
    return <li key={r.id} data-testid="result-card" className="flex h-full flex-col rounded-[1.4rem] border border-black/[0.06] bg-white p-4 shadow-[0_8px_30px_-20px_rgba(20,14,10,.2)] sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <span aria-hidden className={cn("grid h-14 w-14 shrink-0 place-items-center rounded-2xl font-display text-4xl font-black leading-none shadow-sm sm:h-16 sm:w-16 sm:text-5xl", grade === "A" ? "bg-brand-600 text-white" : grade === "B" ? "bg-ink text-white" : "bg-brand-50 text-brand-700")}>{grade ?? <GraduationCap className="h-7 w-7" />}</span>
        <ResultPhoto src={r.photo_url} name={r.name} variant="avatar" />
      </div>
      <h3 className="mt-4 break-words font-display text-sm font-bold leading-snug text-ink sm:text-base">{r.name}</h3>
      <p className="mt-1 text-xs font-medium text-slate-500">{r.exam_year} · {t("year")}</p>
      <p className="mt-3 break-words border-t border-slate-100 pt-3 text-xs font-semibold leading-relaxed text-slate-700">{r.grades}</p>
      {rank && <div className="mt-3 flex items-center gap-2">{rankBadge(rank.number, true)}<p className="break-words text-xs font-bold leading-snug text-red-800">{rank.label}</p></div>}
      {r.exam_number && <p className="mt-2 break-words text-xs text-slate-500">{t("examNumber")}: {r.exam_number}</p>}
    </li>;
  };

  const wallSection = (title: string, list: StudentResult[], grade: "A" | "B" | null, id: string) => list.length ? <section aria-labelledby={`${id}-title`} data-testid={id}>
    <div className="mb-5 flex items-end justify-between gap-3 border-b border-black/[0.06] pb-4">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">{t("wallLabel")}</p><h2 id={`${id}-title`} className="mt-1 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h2></div>
    </div>
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">{list.map((r) => wallCard(r, grade))}</ul>
  </section> : null;

  return <PublicShell>
    <section className="relative overflow-hidden bg-landing-hero pb-20 pt-32 text-white sm:pb-24 sm:pt-40">
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-brand-500/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute bottom-0 right-[6%] hidden select-none font-display text-[15rem] font-black leading-none text-white/[0.025] lg:block">A B</div>
      <div className="container relative">
        <div className="max-w-3xl"><h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">{t("title")}</h1><p className="mt-4 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">{t("subtitle")}</p></div>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a href="#results-wall" className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-400">{t("explore")} <ArrowDown className="h-4 w-4" /></a>
          <span className="text-sm text-white/55">{t("count", { n: results.length })}</span>
        </div>
      </div>
    </section>

    <div id="results-wall" className="container scroll-mt-24 space-y-14 py-10 sm:py-14">
      {years.length > 0 && <div className="flex flex-wrap items-center gap-2" aria-label={t("yearFilter")}>
        <span className="mr-1 text-sm font-semibold text-slate-600">{t("yearFilter")}</span>
        <Link href="/results#results-wall" aria-current={selectedYear === null ? "page" : undefined} className={cn("rounded-full border px-4 py-2 text-sm font-semibold transition", selectedYear === null ? "border-ink bg-ink text-white" : "border-black/10 bg-white text-slate-600 hover:border-brand-400 hover:text-ink")}>{t("allYears")}</Link>
        {years.map((year) => <Link key={year} href={`/results?year=${year}#results-wall`} aria-current={selectedYear === year ? "page" : undefined} className={cn("rounded-full border px-4 py-2 text-sm font-semibold transition", selectedYear === year ? "border-ink bg-ink text-white" : "border-black/10 bg-white text-slate-600 hover:border-brand-400 hover:text-ink")}>{year}</Link>)}
      </div>}
      {!results.length && <div className="rounded-[1.75rem] border border-dashed border-brand-200 bg-white px-6 py-14 text-center"><GraduationCap className="mx-auto h-10 w-10 text-brand-400" /><h2 className="mt-4 font-display text-xl font-bold">{selectedYear ? t("emptyYear") : t("empty")}</h2><p className="mt-2 text-sm text-slate-600">{selectedYear ? <Link className="font-semibold text-brand-700 underline" href="/results#results-wall">{t("allYears")}</Link> : t("emptyText")}</p></div>}
      {!!featured.length && <section aria-labelledby="featured-title" data-testid="featured-results"><div className="mb-5 flex items-end justify-between gap-3"><div><p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-brand-700"><Award className="h-4 w-4" />{t("spotlight")}</p><h2 id="featured-title" className="mt-1 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{t("featured")}</h2></div></div><ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{featured.map(featureCard)}</ul></section>}
      {wallSection(t("aResults"), a, "A", "grade-a-results")}
      {wallSection(t("bResults"), b, "B", "grade-b-results")}
      {wallSection(t("otherResults"), other, null, "other-results")}
    </div>
  </PublicShell>;
}
