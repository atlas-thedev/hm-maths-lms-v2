"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CalendarClock, CalendarDays, MapPin, Phone, Sparkles, Tag, Wifi } from "lucide-react";
import { WhatsAppIcon } from "@/components/brand-icons";
import { useLocale, useT } from "@/i18n/client";
import { centerLabel, ONLINE_KEY, type Center } from "@/lib/centers";
import type { TimetableEntry } from "@/lib/timetable";
import { cn, whatsappLink } from "@/lib/utils";

const TYPE_STYLE: Record<string, string> = {
  Theory: "bg-brand-50 text-brand-700 ring-brand-200/80",
  Revision: "bg-indigo-50 text-indigo-700 ring-indigo-200/80",
  "Paper Class": "bg-teal-50 text-teal-700 ring-teal-200/80",
  Combo: "bg-amber-50 text-amber-800 ring-amber-200/80",
};

export function TimetableView({
  entries,
  centers,
  initialYear,
  whatsappNumber,
  phoneNumber,
}: {
  entries: TimetableEntry[];
  centers: Center[];
  initialYear: number | null;
  whatsappNumber: string;
  phoneNumber: string;
}) {
  const locale = useLocale();
  const t = useT("landing.timetablePage");
  const tc = useT("common");

  const years = useMemo(
    () => [...new Set(entries.map((e) => e.batch_year))].sort((a, b) => b - a),
    [entries],
  );
  const centerKeys = useMemo(() => {
    const keys = new Set<string>(entries.map((e) => e.center_key));
    const ordered = centers.map((c) => c.key).filter((k) => keys.has(k));
    if (keys.has(ONLINE_KEY)) ordered.push(ONLINE_KEY);
    for (const k of keys) if (!ordered.includes(k)) ordered.push(k);
    return ordered;
  }, [entries, centers]);

  const [selectedYear, setSelectedYear] = useState<number | null>(
    initialYear && years.includes(initialYear) ? initialYear : null,
  );
  const [selectedCenter, setSelectedCenter] = useState<string>("all");

  const labelForCenter = (key: string) => {
    if (key === ONLINE_KEY) return locale === "si" ? "Online" : "Online";
    const found = centers.find((c) => c.key.toLowerCase() === key.toLowerCase());
    return found ? centerLabel(found, locale) : key;
  };

  const filtered = useMemo(
    () =>
      entries.filter((e) => {
        if (selectedYear !== null && e.batch_year !== selectedYear) return false;
        if (selectedCenter !== "all" && e.center_key.toLowerCase() !== selectedCenter.toLowerCase()) return false;
        return true;
      }),
    [entries, selectedYear, selectedCenter],
  );

  // Group filtered entries by batch year (highest year first)
  const grouped = useMemo(() => {
    const map = new Map<number, TimetableEntry[]>();
    for (const e of filtered) {
      const list = map.get(e.batch_year) ?? [];
      list.push(e);
      map.set(e.batch_year, list);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [filtered]);

  return (
    <div className="space-y-8">
      {/* Filter Toolbar */}
      <div className="rounded-3xl border border-black/[0.06] bg-white p-4 shadow-soft sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Batch Year Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedYear(null)}
              className={cn(
                "rounded-full px-4 py-2 text-xs font-bold transition sm:text-sm",
                selectedYear === null
                  ? "bg-ink text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200",
              )}
            >
              {t("allBatches")}
            </button>
            {years.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setSelectedYear(y)}
                className={cn(
                  "rounded-full px-4 py-2 text-xs font-bold transition sm:text-sm",
                  selectedYear === y
                    ? "bg-brand-600 text-white shadow-md shadow-brand-500/25"
                    : "bg-brand-50 text-brand-700 ring-1 ring-brand-100 hover:bg-brand-100",
                )}
              >
                {t("batchLabel", { year: y })}
              </button>
            ))}
          </div>

          <p className="text-xs font-semibold text-slate-500">{t("count", { n: filtered.length })}</p>
        </div>

        {/* Center Chips */}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => setSelectedCenter("all")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
              selectedCenter === "all"
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700",
            )}
          >
            {t("allCenters")}
          </button>
          {centerKeys.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setSelectedCenter(k)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                selectedCenter.toLowerCase() === k.toLowerCase()
                  ? "bg-brand-600 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:text-brand-700",
              )}
            >
              {k === ONLINE_KEY ? <Wifi className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
              {labelForCenter(k)}
            </button>
          ))}
        </div>
      </div>

      {/* Grouped Schedule Cards */}
      {grouped.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <CalendarDays className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-3 font-display text-lg font-bold text-ink">{t("empty")}</p>
          <p className="mt-1 text-sm text-slate-600">{t("emptyDesc")}</p>
        </div>
      ) : (
        <div className="space-y-10">
          {grouped.map(([year, items]) => (
            <section key={year} aria-labelledby={`batch-${year}`}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 items-center rounded-2xl bg-gradient-brand px-4 font-display text-xl font-black text-white shadow-sm">
                    {year}
                  </span>
                  <div>
                    <h2 id={`batch-${year}`} className="font-display text-xl font-extrabold text-ink sm:text-2xl">
                      {t("batchLabel", { year })}
                    </h2>
                    <p className="text-xs font-medium text-slate-500">{t("count", { n: items.length })}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.map((item, idx) => {
                  const waText = `Hi, I would like details about ${item.title} (${labelForCenter(item.center_key)}${item.hall_name ? ` - ${item.hall_name}` : ""}, ${item.day_label} ${item.time_label}).`;
                  const waHref = whatsappLink(whatsappNumber, waText);
                  const typeCls = TYPE_STYLE[item.class_type] ?? "bg-slate-100 text-slate-700 ring-slate-200";
                  const lines = item.details
                    .split(/\r?\n/)
                    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
                    .filter(Boolean);

                  return (
                    <motion.article
                      key={item.id}
                      initial={{ opacity: 0, y: 18 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.45, delay: Math.min(idx, 5) * 0.05 }}
                      className={cn(
                        "flex h-full flex-col rounded-3xl border bg-white p-5 shadow-soft transition hover:-translate-y-1 hover:shadow-lift sm:p-6",
                        item.is_featured ? "border-brand-200 ring-1 ring-brand-100" : "border-black/[0.06]",
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ring-1", typeCls)}>
                            {tc.raw<Record<string, string>>("classTypes")?.[item.class_type] ?? item.class_type}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                            {item.center_key === ONLINE_KEY ? <Wifi className="h-3 w-3 text-brand-600" /> : <MapPin className="h-3 w-3 text-brand-600" />}
                            {labelForCenter(item.center_key)}
                          </span>
                        </div>
                        {item.is_featured ? (
                          <span className="rounded-full bg-brand-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                            {t("newIntakeBadge")}
                          </span>
                        ) : null}
                      </div>

                      <h3 className="mt-3.5 font-display text-lg font-extrabold leading-snug text-ink">
                        {item.title}
                      </h3>
                      {item.hall_name ? (
                        <p className="mt-1 text-sm font-semibold text-brand-700">{item.hall_name}</p>
                      ) : null}

                      <div className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-3.5 text-sm">
                        <div className="flex items-start gap-2.5">
                          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                          <div>
                            <p className="font-bold text-ink">{item.day_label}</p>
                            <p className="text-xs font-semibold text-slate-600">{item.time_label}</p>
                          </div>
                        </div>
                        {item.fee_label ? (
                          <div className="flex items-center gap-2.5 border-t border-slate-200/70 pt-2">
                            <Tag className="h-4 w-4 shrink-0 text-teal-600" />
                            <p className="text-xs font-bold text-slate-800">{item.fee_label}</p>
                          </div>
                        ) : null}
                      </div>

                      {item.start_note ? (
                        <p className="mt-3 rounded-xl bg-brand-50/70 px-3 py-2 text-xs font-semibold text-brand-800">
                          {item.start_note}
                        </p>
                      ) : null}

                      {lines.length > 0 ? (
                        <ul className="mt-3.5 space-y-1.5 text-xs leading-relaxed text-slate-600">
                          {lines.map((line, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                        {item.class_id ? (
                          <Link
                            href={`/dashboard/store/class/${item.class_id}`}
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-brand-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700"
                          >
                            {t("viewClassBtn")} <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        ) : (
                          <Link
                            href="/register"
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-brand-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700"
                          >
                            {t("registerBtn")} <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        )}
                        {waHref ? (
                          <a
                            href={waHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                          >
                            <WhatsAppIcon className="h-3.5 w-3.5" /> {t("whatsappBtn")}
                          </a>
                        ) : null}
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Contact Helper Banner */}
      <div className="rounded-3xl bg-gradient-dark p-6 text-white shadow-lift sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-8">
        <div>
          <h3 className="font-display text-xl font-extrabold">{t("contactBannerTitle")}</h3>
          <p className="mt-1 max-w-2xl text-sm text-white/80">{t("contactBannerDesc")}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2.5 sm:mt-0 sm:shrink-0">
          <a
            href={`tel:${phoneNumber.replace(/\s/g, "")}`}
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-bold text-ink transition hover:bg-brand-50 sm:text-sm"
          >
            <Phone className="h-4 w-4 text-brand-600" /> {t("callBtn")}
          </a>
          {whatsappLink(whatsappNumber, "Hi, I would like class timetable details.") ? (
            <a
              href={whatsappLink(whatsappNumber, "Hi, I would like class timetable details.")!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-brand-400 sm:text-sm"
            >
              <WhatsAppIcon className="h-4 w-4" /> WhatsApp
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
