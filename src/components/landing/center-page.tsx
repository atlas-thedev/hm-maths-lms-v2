import Link from "next/link";
import { ArrowRight, CalendarClock, Check, MapPin, Wifi } from "lucide-react";
import { WhatsAppIcon } from "@/components/brand-icons";
import { getSiteData } from "@/lib/settings";
import { centerLabel, centerVenue, type Center } from "@/lib/centers";
import { centerSlug, ONLINE_SLUG } from "@/lib/seo";
import { cn, whatsappLink } from "@/lib/utils";
import type { ClassRow } from "@/lib/types";
import { interpolate } from "@/i18n/translate";
import { getLocale, getScheduleLabel, getT } from "@/i18n/server";

type Faq = { q: string; a: string };

/** Text + class list for one center ("Panadura"), for the hub (center = null) or for "online" (online = true). */
export async function CenterPageBody({ center, centers, classes, online = false }: { center: Center | null; centers: Center[]; classes: ClassRow[]; online?: boolean }) {
  const SITE = await getSiteData();
  const [t, tc, locale, sched] = await Promise.all([getT("landing.seo"), getT("common"), getLocale(), getScheduleLabel()]);
  const town = center ? centerLabel(center, locale) : "";
  const venue = center ? centerVenue(center, locale) : "";
  const vars = { town, venue: venue ? ` (${venue})` : "" };
  const faq = (t.raw<Faq[]>("faq") ?? []).map((f) => ({ q: interpolate(f.q, vars), a: interpolate(f.a, vars) }));
  const wa = whatsappLink(SITE.contact.whatsapp, center ? `Hi, I'd like to join the Combined Maths class in ${center.en}` : "Hi");
  const title = center ? t("centerTitle", vars) : online ? t("onlineTitle") : t("hubTitle");
  const intro = center ? t("centerIntro", vars) : online ? t("onlineIntro") : t("hubIntro");
  const others = centers.filter((c) => c.key !== center?.key);

  return (
    <>
      <section className="bg-landing-hero pb-12 pt-28 text-white sm:pb-16 sm:pt-32">
        <div className="container max-w-4xl">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-white/75">
            <Link href="/" className="hover:text-white">{t("back")}</Link><span aria-hidden>/</span>
            {center || online ? <><Link href="/combined-maths-classes" className="hover:text-white">{t("hub")}</Link><span aria-hidden>/</span><span className="text-white">{center ? town : t("online")}</span></> : <span className="text-white">{t("hub")}</span>}
          </nav>
          <h1 className="mt-4 text-balance font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/80 sm:text-lg">{intro}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-700 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30">{t("register")} <ArrowRight className="h-4 w-4" /></Link>
            {wa ? <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/15"><WhatsAppIcon className="h-4 w-4" /> {t("whatsapp")}</a> : null}
          </div>
        </div>
      </section>

      <div className="container max-w-4xl space-y-12 py-10 sm:py-14">
        {!center && !online && (
          <section>
            <ul className="grid gap-3 sm:grid-cols-2">
              {centers.map((c) => (
                <li key={c.key}>
                  <Link href={`/combined-maths-classes/${centerSlug(c)}`} className="group flex items-center gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700"><MapPin className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1"><span className="block font-display font-bold">{centerLabel(c, locale)}</span><span className="block truncate text-xs text-slate-600">{centerVenue(c, locale) || t("centerTitle", { town: centerLabel(c, locale) })}</span></span>
                    <ArrowRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
              <li>
                <Link href={`/combined-maths-classes/${ONLINE_SLUG}`} className="group flex items-center gap-3 rounded-2xl border border-black/5 bg-gradient-dark p-4 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10"><Wifi className="h-5 w-5 text-brand-300" /></span>
                  <span className="min-w-0 flex-1"><span className="block font-display font-bold">{t("online")}</span><span className="block truncate text-xs text-white/75">{t("onlineTitle")}</span></span>
                  <ArrowRight className="h-4 w-4 text-white/70 transition group-hover:translate-x-0.5" />
                </Link>
              </li>
            </ul>
          </section>
        )}

        {(center || online) && (
          <section aria-labelledby="classes-h">
            <h2 id="classes-h" className="font-display text-2xl font-bold">{center ? t("classesTitle", vars) : t("onlineClassesTitle")}</h2>
            {classes.length ? (
              <ul className="mt-5 grid gap-4 sm:grid-cols-2">
                {classes.map((c) => (
                  <li key={c.id}>
                    <Link href={c.is_free ? "/dashboard/free-zone" : `/dashboard/store/class/${c.id}`} className="group flex h-full flex-col rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider">
                        <span className="rounded-full bg-teal-50 px-2.5 py-1 text-teal-700">{tc(`classTypes.${c.class_type}`)}</span>
                        {c.target_year ? <span className="rounded-full bg-brand-50 px-2.5 py-1 text-brand-700">{t("batch", { year: c.target_year })}</span> : null}
                      </div>
                      <h3 className="mt-3 font-display text-lg font-bold group-hover:text-brand-700">{c.title}</h3>
                      {sched(c) ? <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-600"><CalendarClock className="h-3.5 w-3.5" />{sched(c)}</p> : null}
                      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                        <span className="font-display font-bold">{c.is_free ? t("free") : t("perMonth", { amount: Number(c.fee).toLocaleString("en-LK") })}</span>
                        <span className="text-sm font-semibold text-brand-700">{t("view")} →</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-sm text-slate-700">{t("noClasses")}</p>}
          </section>
        )}

        <section aria-labelledby="why-h">
          <h2 id="why-h" className="font-display text-2xl font-bold">{t("whyTitle")}</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {(t.raw<string[]>("why") ?? []).map((w) => (
              <li key={w} className="flex gap-3 rounded-2xl border border-black/5 bg-white p-4 text-sm leading-relaxed text-slate-700 shadow-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success-soft-foreground" />{w}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="faq-h">
          <h2 id="faq-h" className="font-display text-2xl font-bold">{t("faqTitle")}</h2>
          <div className="mt-5 divide-y rounded-2xl border border-black/5 bg-white shadow-sm">
            {faq.map((f) => (
              <details key={f.q} className="group p-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-3 font-semibold">{f.q}<span aria-hidden className="text-brand-600 transition group-open:rotate-45">+</span></summary>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={cn("rounded-3xl bg-gradient-brand p-7 text-white shadow-lg sm:p-9")}>
          <h2 className="font-display text-2xl font-bold">{t("ctaTitle")}</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-800">{t("register")} <ArrowRight className="h-4 w-4" /></Link>
            {wa ? <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"><WhatsAppIcon className="h-4 w-4" /> {t("whatsapp")}</a> : null}
          </div>
        </section>

        {(center || online) && (
          <nav aria-label={t("otherCenters")}>
            <h2 className="font-display text-lg font-bold">{t("otherCenters")}</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {others.map((c) => <li key={c.key}><Link href={`/combined-maths-classes/${centerSlug(c)}`} className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:border-brand-400 hover:text-brand-700">{centerLabel(c, locale)}</Link></li>)}
              {center ? <li><Link href={`/combined-maths-classes/${ONLINE_SLUG}`} className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:border-brand-400 hover:text-brand-700">{t("online")}</Link></li> : null}
              <li><Link href="/combined-maths-classes" className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:border-brand-400 hover:text-brand-700">{t("allCenters")}</Link></li>
            </ul>
          </nav>
        )}
      </div>
    </>
  );
}

export { type Faq };
