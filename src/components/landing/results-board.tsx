"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Award, GraduationCap, MapPin, Medal, Phone, Search, Trophy } from "lucide-react";
import { WhatsAppIcon } from "@/components/brand-icons";
import { Sticker } from "@/components/landing/sticker";
import { cn, whatsappLink } from "@/lib/utils";
import { initialsOf, resultYears, type ExamResult, type ResultsSettings } from "@/lib/results";

/* Grade → tone. "A" is the brand colour, the rest step down through the theme's status colours. */
const GRADE_TONE: Record<string, string> = {
  A: "bg-brand-500 text-white ring-brand-500/30",
  B: "bg-info text-white ring-info/30",
  C: "bg-success text-white ring-success/30",
  S: "bg-warning text-white ring-warning/30",
  W: "bg-slate-400 text-white ring-slate-400/30",
  F: "bg-destructive text-white ring-destructive/30",
  "-": "bg-slate-200 text-slate-600 ring-slate-300/40",
};

/** Round photo, or the student's initials when there isn't one. */
function Portrait({ photo, name, size = "md" }: { photo: string; name: string; size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-20 w-20 sm:h-24 sm:w-24" : "h-14 w-14";
  if (!photo) {
    return (
      <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-100 to-warning/60 font-display font-bold text-brand-700 ring-1 ring-brand-200", box, size === "lg" ? "text-2xl" : "text-base")}>
        {initialsOf(name)}
      </span>
    );
  }
  return (
    <span className={cn("relative shrink-0 overflow-hidden rounded-full bg-slate-200 ring-1 ring-black/5", box)}>
      <Image src={photo} alt="" fill sizes={size === "lg" ? "96px" : "56px"} className="object-cover" />
    </span>
  );
}

/**
 * One district (big) result: the name in large type, then the same four details every row carries —
 * photo, name, examination year, district and grade.
 */
function DistrictCard({ r, locale }: { r: ExamResult; locale: "en" | "si" }) {
  const district = locale === "si" ? r.districtSi || r.district : r.district;
  return (
    <motion.li
      initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5 }}
      className={cn("group relative overflow-hidden rounded-3xl p-5 ring-1 sm:p-7",
        r.featured
          ? "bg-gradient-to-br from-[#1b1410] via-[#241a13] to-[#3a2717] text-white ring-white/10 shadow-[0_30px_70px_-30px_rgba(20,14,10,.7)]"
          : "bg-white/80 text-ink ring-slate-200 shadow-soft")}
    >
      {r.featured && (
        <>
          <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-500/25 blur-2xl" />
          <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white">
            <Medal className="h-3.5 w-3.5" /> {locale === "si" ? "දිස්ත්‍රික්කයේ ඉහළම" : "District top"}
          </span>
        </>
      )}
      <div className="flex items-start gap-4">
        <Portrait photo={r.photo} name={r.name} size="lg" />
        <div className="min-w-0 flex-1">
          <p className={cn("text-[11px] font-bold uppercase tracking-[0.18em]", r.featured ? "text-brand-300" : "text-brand-600")}>
            {locale === "si" ? "දිස්ත්‍රික්ක මට්ටම" : "District result"}
          </p>
          <h3 className={cn("mt-1 font-display text-xl font-extrabold leading-tight sm:text-2xl", r.featured && "text-white")}>{r.name}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className={cn("inline-flex items-center gap-1.5", r.featured ? "text-white/80" : "text-slate-600")}>
              <MapPin className="h-3.5 w-3.5" /> {district}
            </span>
            <span className={cn("inline-flex items-center gap-1.5", r.featured ? "text-white/80" : "text-slate-600")}>
              <GraduationCap className="h-3.5 w-3.5" /> {r.year} A/L
            </span>
            {r.marks && <span className={cn("font-semibold", r.featured ? "text-brand-300" : "text-brand-600")}>{r.marks}</span>}
          </div>
        </div>
        <span className={cn("grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-2xl font-extrabold ring-1 sm:h-16 sm:w-16 sm:text-3xl", GRADE_TONE[r.grade] ?? GRADE_TONE["A"])}>
          {r.grade === "-" ? "—" : r.grade}
        </span>
      </div>
      {(r.noteEn || r.noteSi) && (
        <p className={cn("mt-4 border-t pt-3 text-sm leading-relaxed", r.featured ? "border-white/10 text-white/75" : "border-slate-200 text-slate-600")}>
          {locale === "si" ? r.noteSi || r.noteEn : r.noteEn || r.noteSi}
        </p>
      )}
    </motion.li>
  );
}

/** One normal result: a table-like line — grade slot, photo, name, and the year / district / marks. */
function StudentRow({ r, locale }: { r: ExamResult; locale: "en" | "si" }) {
  const district = locale === "si" ? r.districtSi || r.district : r.district;
  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-30px" }} transition={{ duration: 0.35 }}
      className="flex items-center gap-3.5 rounded-2xl bg-white/80 px-4 py-3 ring-1 ring-slate-200 transition hover:ring-brand-300 sm:gap-4"
    >
      <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg font-extrabold ring-1", GRADE_TONE[r.grade] ?? GRADE_TONE["-"])}>
        {r.grade === "-" ? "—" : r.grade}
      </span>
      <Portrait photo={r.photo} name={r.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display font-bold text-ink">{r.name}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1"><GraduationCap className="h-3 w-3" /> {r.year} A/L</span>
          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {district}</span>
          {r.marks && <span className="font-semibold text-brand-600">{r.marks}</span>}
        </p>
      </div>
      {(r.noteEn || r.noteSi) && (
        <span className="hidden max-w-[38%] truncate text-right text-xs text-slate-500 sm:block">
          {locale === "si" ? r.noteSi || r.noteEn : r.noteEn || r.noteSi}
        </span>
      )}
    </motion.li>
  );
}

export interface ResultsPageProps {
  settings: ResultsSettings;
  locale: "en" | "si";
  whatsapp: string | null | undefined;
  brandName: string;
}

/**
 * The /results page: district toppers first (big cards), then every normal result as a line.
 * Two filters — year and district — plus a name search, so a student can find their own row quickly.
 */
export function ResultsBoard({ settings, locale, whatsapp, brandName }: ResultsPageProps) {
  const [year, setYear] = useState<string>("");
  const [district, setDistrict] = useState<string>("");
  const [q, setQ] = useState("");

  const all = useMemo(() => settings.results.filter((r) => r.enabled && r.name), [settings.results]);
  const years = useMemo(() => resultYears(all), [all]);
  const districts = useMemo(
    () => [...new Set(all.map((r) => (locale === "si" ? r.districtSi || r.district : r.district)).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [all, locale],
  );

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter((r) => {
      if (year && r.year !== year) return false;
      if (district && (locale === "si" ? r.districtSi || r.district : r.district) !== district) return false;
      if (needle && !`${r.name} ${r.district} ${r.districtSi} ${r.noteEn} ${r.noteSi}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [all, year, district, q, locale]);

  const districtsBig = shown.filter((r) => r.kind === "district");
  const students = shown.filter((r) => r.kind === "student");
  const filtering = !!(year || district || q.trim());
  const grades = ["A", "B", "C", "S"];
  const chip = (active: boolean) =>
    cn("rounded-full border px-4 py-2 text-sm font-semibold transition",
      active ? "border-brand-500 bg-brand-500 text-white shadow-md shadow-brand-500/25" : "border-white/20 bg-white/5 text-white/90 hover:bg-white/15");

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-landing-hero pb-14 pt-28 text-white sm:pb-20 sm:pt-32">
        <span aria-hidden className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="container relative">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-300">
            <Trophy className="h-4 w-4" /> {locale === "si" ? settings.eyebrowSi : settings.eyebrowEn}
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
            {locale === "si" ? settings.titleSi : settings.titleEn}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/75">
            {locale === "si" ? settings.introSi : settings.introEn}
          </p>

          {/* Quick counts: how many results are published, and how many are A grades. */}
          {all.length > 0 && (
            <dl className="mt-8 flex flex-wrap gap-3">
              {[
                { label: locale === "si" ? "ප්‍රතිඵල" : "Results", value: all.length },
                { label: locale === "si" ? "A සාමාර්ථ" : "A grades", value: all.filter((r) => r.grade === "A").length },
                { label: locale === "si" ? "දිස්ත්‍රික්ක" : "Districts", value: new Set(all.map((r) => r.district).filter(Boolean)).size },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 backdrop-blur">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">{s.label}</dt>
                  <dd className="font-display text-2xl font-extrabold">{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      {/* ── Filters ── */}
      <section className="border-y border-slate-200 bg-white/70 py-4 backdrop-blur">
        <div className="container flex flex-wrap items-center gap-3">
          <label className="relative min-w-[13rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder={locale === "si" ? "ඔබේ නම සොයන්න…" : "Search your name…"}
              className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
            />
          </label>
          {years.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button type="button" onClick={() => setYear("")} className={cn("rounded-full px-3.5 py-2 text-xs font-bold transition", !year ? "bg-ink text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
                {locale === "si" ? "සියලු වසර" : "All years"}
              </button>
              {years.map((y) => (
                <button key={y} type="button" onClick={() => setYear(year === y ? "" : y)} className={cn("rounded-full px-3.5 py-2 text-xs font-bold transition", year === y ? "bg-ink text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
                  {y}
                </button>
              ))}
            </div>
          )}
          {districts.length > 1 && (
            <select value={district} onChange={(e) => setDistrict(e.target.value)}
              className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 outline-none focus:border-brand-400">
              <option value="">{locale === "si" ? "සියලු දිස්ත්‍රික්ක" : "All districts"}</option>
              {districts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          )}
          {filtering && (
            <button type="button" onClick={() => { setYear(""); setDistrict(""); setQ(""); }} className="text-xs font-semibold text-brand-600 hover:underline">
              {locale === "si" ? "හිස් කරන්න" : "Clear"}
            </button>
          )}
          <span className="ml-auto text-xs font-semibold text-slate-500">
            {shown.length} {locale === "si" ? "ප්‍රතිඵල" : shown.length === 1 ? "result" : "results"}
          </span>
        </div>
      </section>

      {/* ── The board ── */}
      <section className="container py-10 sm:py-14">
        {!shown.length ? (
          <div className="mx-auto max-w-md rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 py-14 text-center">
            <Award className="mx-auto h-10 w-10 text-slate-400" />
            <h2 className="mt-3 font-display text-lg font-bold">{locale === "si" ? "ප්‍රතිඵල හමු නොවිණි" : "No results found"}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {all.length
                ? (locale === "si" ? "වෙනත් වසරක් හෝ දිස්ත්‍රික්කයක් තෝරන්න." : "Try another year or district.")
                : (locale === "si" ? "ප්‍රතිඵල ඉක්මනින් ප්‍රකාශයට පත් වේ." : "Results will be published soon.")}
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {districtsBig.length > 0 && (
              <div>
                <h2 className="mb-4 flex items-center gap-2.5 font-display text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
                  <Sticker name="star" size={34} />
                  {locale === "si" ? "දිස්ත්‍රික්ක මට්ටමේ ප්‍රතිඵල" : "District top results"}
                </h2>
                <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {districtsBig.map((r) => <DistrictCard key={r.id} r={r} locale={locale} />)}
                </ul>
              </div>
            )}

            {students.length > 0 && (
              <div>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <h2 className="flex items-center gap-2.5 font-display text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
                    <Sticker name="party" size={34} />
                    {locale === "si" ? "සියලු ප්‍රතිඵල" : "All results"}
                  </h2>
                  <ul className="flex flex-wrap gap-1.5">
                    {grades.map((g) => (
                      <li key={g} className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold ring-1", GRADE_TONE[g])}>
                        {g} {students.filter((s) => s.grade === g).length}
                      </li>
                    ))}
                  </ul>
                </div>
                <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                  {students.map((r) => <StudentRow key={r.id} r={r} locale={locale} />)}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── Closing card: tell us if a result is missing ── */}
        <div className="mt-12 overflow-hidden rounded-3xl bg-gradient-brand px-6 py-8 text-white sm:px-10">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="max-w-xl">
              <h2 className="font-display text-xl font-extrabold sm:text-2xl">
                {locale === "si" ? "ඔබේ ප්‍රතිඵලය මෙහි නැද්ද?" : "Is your result missing?"}
              </h2>
              <p className="mt-1.5 text-sm text-white/85">
                {locale === "si"
                  ? `ඔබ ${brandName} පන්තියේ සිසුවෙක් නම්, ඔබේ නම සහ දිස්ත්‍රික්කය WhatsApp හරහා එවන්න — අපි එය මෙහි එකතු කරන්නෙමු.`
                  : `If you studied with ${brandName}, send us your name and district on WhatsApp and we will add your result here.`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/combined-maths-classes" className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-brand-700 shadow-sm transition hover:-translate-y-0.5">
                {locale === "si" ? "පන්ති බලන්න" : "See our classes"}
              </Link>
              <a href={whatsappLink(whatsapp, locale === "si" ? "මගේ A/L ප්‍රතිඵලය" : "My A/L result") ?? "/#centers"} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5">
                <WhatsAppIcon className="h-4 w-4" /> WhatsApp
              </a>
            </div>
          </div>
        </div>

        <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-slate-500">
          <Phone className="h-3.5 w-3.5" />
          {locale === "si" ? "ප්‍රතිඵල ප්‍රකාශයට පත් කරන්නේ සිසුන්ගේ අවසරය ඇතිවයි." : "Results are published with the permission of each student."}
        </p>
      </section>
    </>
  );
}
