import { Award, GraduationCap } from "lucide-react";
import { PublicShell } from "@/components/landing/public-shell";
import { ResultPhoto } from "@/components/landing/result-photo";
import { getSession } from "@/lib/auth";
import { getStudentResults, type StudentResult } from "@/lib/public-results";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getT("landing.resultsPage");
  return { title: t("title"), description: t("subtitle"), alternates: { canonical: "/results" } };
}
export default async function ResultsPage() {
  const { db } = await getSession();
  const [results, t] = await Promise.all([getStudentResults(db), getT("landing.resultsPage")]);
  const featured = results.filter((r) => r.distinction);
  const ordinary = results.filter((r) => !r.distinction);
  const card = (r: StudentResult, large: boolean) => <li key={r.id} className={`overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft ${large ? "sm:flex" : ""}`}>
    <div className={large ? "sm:w-2/5 sm:shrink-0" : ""}><ResultPhoto src={r.photo_url} name={r.name} /></div>
    <div className="flex flex-col justify-center p-5">
      {r.distinction && <p className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-sm font-bold text-brand-700"><Award className="h-4 w-4" />{r.distinction}</p>}
      <h3 className={`font-display font-bold ${large ? "text-2xl" : "text-lg"}`}>{r.name}</h3>
      <p className="mt-2 font-display text-xl font-extrabold text-brand-700">{r.grades}</p>
      <p className="mt-2 text-sm text-slate-600">{t("year")}: {r.exam_year}</p>
      <p className="mt-1 break-words text-sm text-slate-600">{t("examNumber")}: {r.exam_number}</p>
    </div>
  </li>;
  return <PublicShell><section className="bg-landing-hero pb-14 pt-32 text-white"><div className="container"><GraduationCap className="h-8 w-8 text-brand-300" /><h1 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">{t("title")}</h1><p className="mt-3 text-white/75">{t("subtitle")}</p></div></section>
    <div className="container space-y-12 py-12">
      {!results.length && <div className="rounded-3xl border border-dashed bg-white p-12 text-center"><h2 className="text-xl font-bold">{t("empty")}</h2><p className="mt-2 text-slate-600">{t("emptyText")}</p></div>}
      {!!featured.length && <section><h2 className="mb-5 font-display text-2xl font-bold">{t("featured")}</h2><ul className="grid gap-5 lg:grid-cols-2">{featured.map((r) => card(r, true))}</ul></section>}
      {!!ordinary.length && <section><h2 className="mb-5 font-display text-2xl font-bold">{t("all")}</h2><ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{ordinary.map((r) => card(r, false))}</ul></section>}
    </div></PublicShell>;
}
