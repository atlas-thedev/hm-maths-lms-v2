"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CalendarClock, Check, MapPin, Phone, Play, Quote, Tv, Wifi, Youtube } from "lucide-react";
import { TelegramGlyph, WhatsAppIcon } from "@/components/brand-icons";
import { ClassBanner, type BannerClass } from "@/components/class-banner";
import { useLocale, useSite, useT, useTownKeys } from "@/i18n/client";
import { ChannelAvatar } from "@/components/channel-avatar";
import { channelTitle } from "@/lib/site-data";
import { cn, whatsappLink } from "@/lib/utils";
import { SL_DISTRICTS, SL_VIEWBOX } from "./sl-map-data";
import { Sticker } from "./sticker";

/*
 * Home page sections — a plain, fast class website: everything is visible as soon as it scrolls in (no fade-in
 * reveals), one light background, the classes right under the hero. Copy lives in landing.json (landing.home.*).
 */

/* ---------- shared bits ---------- */
function Heading({ kicker, title, subtitle, className, align = "center" }: {
  kicker?: string; title: string; subtitle?: string; className?: string; align?: "center" | "left";
}) {
  return (
    <div className={cn(align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl", className)}>
      {kicker ? <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">{kicker}</p> : null}
      <h2 className="mt-2 text-balance font-display text-[1.75rem] font-bold leading-tight tracking-tight text-ink sm:text-4xl">{title}</h2>
      {subtitle ? <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{subtitle}</p> : null}
    </div>
  );
}
const section = "relative scroll-mt-24 py-14 sm:py-20";

/* ---------- hero ---------- */
export type LandingStats = { abResults?: string; subscribers?: string; videos?: string };

export function HomeHero({ account, stats, photo }: { account: "guest" | "student" | "admin"; stats?: LandingStats; photo: string }) {
  const SITE = useSite();
  const townKeys = useTownKeys();
  const t = useT("landing.home.hero");
  const yt = SITE.youtube;
  const subs = stats?.subscribers || yt.subscribers;
  const videos = stats?.videos || yt.videos;
  const rawAb = stats?.abResults || yt.abResults || "+500";
  const abResults = rawAb.startsWith("+") ? rawAb : `+${rawAb}`;
  const primary = account === "guest" ? { href: "/register", label: t("ctaGuest") } : { href: account === "admin" ? "/admin" : "/dashboard", label: t("ctaGuest") };
  const wa = whatsappLink(SITE.contact.whatsapp, "Hi");
  const stat = [[subs, t("stats.subs"), "hero-subs"], [abResults, t("stats.abResults"), "hero-ab-results"], [videos, t("stats.videos"), "hero-videos"], [String(Math.max(0, townKeys.length - 1)), t("stats.centers"), "hero-centers"]];
  const [first, ...rest] = t("line2").split(" ");

  return (
    <section id="home" className="relative scroll-mt-24 overflow-hidden bg-gradient-to-b from-brand-50/80 via-landing-bg to-landing-bg pb-14 pt-28 sm:pb-20 sm:pt-32">
      <div aria-hidden className="bg-dots pointer-events-none absolute inset-0 opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
      <div className="container relative grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
        <div className="text-center lg:text-left">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs font-bold text-brand-700 shadow-sm">
            <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[11px] text-white">{t("badge")}</span>{t("kicker")}
          </p>
          <h1 className="mt-5 font-display font-extrabold leading-[1.1] tracking-tight text-ink">
            <span className="block text-xl text-slate-500 sm:text-2xl">{t("line1")}</span>
            <span className="mt-1 block text-[2.6rem] sm:text-6xl"><span className="text-brand-600">{first}</span> {rest.join(" ")}</span>
          </h1>
          <p className="mt-3 font-display text-lg font-semibold text-slate-700">{t("tagline")}</p>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-slate-600 lg:mx-0">{t("desc")}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3 lg:justify-start">
            <Link href={primary.href} className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/30 transition hover:-translate-y-0.5 hover:bg-brand-600">
              {primary.label} <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#classes" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-ink shadow-sm transition hover:border-brand-300 hover:text-brand-700">
              {t("ctaClasses")}
            </a>
          </div>
          <dl className="mx-auto mt-9 grid max-w-xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 shadow-sm sm:grid-cols-4 lg:mx-0">
            {stat.map(([v, l, tid]) => (
              <div key={tid} data-testid={tid} className="bg-white px-3 py-3 text-center">
                <dt className="sr-only">{l}</dt>
                <dd className="font-display text-xl font-bold text-ink sm:text-2xl">{v}</dd>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{l}</p>
              </div>
            ))}
          </dl>
          <p className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-slate-600 lg:justify-start">
            <a href={`tel:${SITE.contact.phone.replace(/\s/g, "")}`} className="inline-flex min-h-10 items-center gap-1.5 font-semibold hover:text-brand-700"><Phone className="h-4 w-4" />{SITE.contact.phone}</a>
            {wa ? <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1.5 font-semibold text-whatsapp-text hover:underline"><WhatsAppIcon className="h-4 w-4" />WhatsApp</a> : null}
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-sm sm:max-w-md">
          <div aria-hidden className="absolute inset-x-4 bottom-0 top-8 rounded-[2.5rem] bg-gradient-to-br from-brand-400 to-brand-600" />
          <div className="relative overflow-hidden rounded-[2.5rem] border-4 border-white bg-white shadow-[0_30px_70px_-30px_rgba(20,14,10,.45)]">
            <Image src={photo} alt={t("line2")} width={800} height={1000} priority sizes="(min-width:1024px) 420px, 80vw" className="aspect-[4/5] w-full object-cover" />
          </div>
          <span className="absolute -left-3 top-10 inline-flex max-w-[15rem] items-center gap-2 rounded-2xl bg-white py-2 pl-2 pr-3 text-xs font-semibold text-ink shadow-xl sm:-left-8">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><Tv className="h-4 w-4" /></span>{t("tv")}
          </span>
          <a href={SITE.social.youtube} target="_blank" rel="noopener noreferrer" className="absolute -right-2 bottom-10 inline-flex items-center gap-2 rounded-2xl bg-destructive px-3 py-2 text-xs font-bold text-white shadow-xl transition hover:-translate-y-0.5 sm:-right-6">
            <Youtube className="h-4 w-4" />{subs}
          </a>
        </div>
      </div>
    </section>
  );
}

/* ---------- classes ---------- */
export type HomeClass = {
  id: string | null; title: string; type: string; year: number | null; town: string | null;
  schedule: string | null; fee: number; isFree: boolean; lines: string[]; banner: string | null;
  /** Everything the banner template needs (set for real classes). */
  bannerClass?: BannerClass;
};

/** Open classes as shop cards (banner, what's covered, timetable, monthly fee, Enroll), filterable by A/L year. */
export function HomeClasses({ classes }: { classes: HomeClass[] }) {
  const t = useT("landing.classes");
  const tc = useT("common");
  const years = [...new Set(classes.map((c) => c.year).filter((y): y is number => !!y))].sort();
  const [year, setYear] = useState<number | null>(null);
  const shown = year ? classes.filter((c) => !c.year || c.year === year) : classes;
  const chip = "inline-flex min-h-9 items-center rounded-full border px-4 text-sm font-semibold transition";

  return (
    <section id="classes" className={cn(section, "bg-white")}>
      <div className="container">
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
          <Heading kicker={t("label")} title={t("title")} subtitle={t("subtitle")} align="left" className="sm:max-w-xl" />
          {years.length > 1 && (
            <div className="flex flex-wrap justify-center gap-2" role="group" aria-label={t("label")}>
              <button type="button" onClick={() => setYear(null)} aria-pressed={!year} className={cn(chip, !year ? "border-transparent bg-ink text-white" : "border-slate-200 bg-white text-slate-700 hover:border-brand-300")}>{t("all")}</button>
              {years.map((y) => (
                <button key={y} type="button" onClick={() => setYear(y)} aria-pressed={year === y}
                  className={cn(chip, year === y ? "border-transparent bg-ink text-white" : "border-slate-200 bg-white text-slate-700 hover:border-brand-300")}>{tc("alBatch", { year: y })}</button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((c, i) => {
            const href = c.id ? (c.isFree ? "/dashboard/free-zone" : `/dashboard/store/class/${c.id}`) : "/register";
            return (
              <Link key={(c.id ?? "p") + i} href={href}
                className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-soft transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift">
                <ClassBanner cls={c.bannerClass ?? { banner_url: c.banner, class_type: c.type, title: c.title }} />
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide">
                    <span className="rounded-full bg-brand-50 px-2.5 py-1 text-brand-700">{tc(`classTypes.${c.type}`)}</span>
                    {c.year ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{tc("alBatch", { year: c.year })}</span> : null}
                  </div>
                  <h3 className="mt-3 line-clamp-2 font-display text-lg font-bold leading-snug text-ink group-hover:text-brand-700">{c.title}</h3>
                  {c.schedule ? <p className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-500"><CalendarClock className="mt-px h-3.5 w-3.5 shrink-0" /><span className="line-clamp-2">{c.schedule}</span></p> : null}
                  {c.lines.length ? (
                    <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
                      {c.lines.slice(0, 3).map((l, k) => (
                        <li key={k} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /><span className="line-clamp-1">{l}</span></li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <span className="font-display text-lg font-bold text-ink">
                      {!c.id ? null : c.isFree ? t("free") : <>LKR {c.fee.toLocaleString("en-LK")}<span className="ml-1 text-xs font-medium text-slate-500">{t("month")}</span></>}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-brand-500/25 transition group-hover:bg-brand-600">
                      {t("enroll")} <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        <div className="mt-10 text-center">
          <Link href="/store" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-ink shadow-sm transition hover:border-brand-300 hover:text-brand-700">
            {t("viewAll")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- how we teach ---------- */
type Step = { sticker: string; title: string; text: string };
export function HomeProcess() {
  const t = useT("landing.home.process");
  const items = t.raw<Step[]>("items") ?? [];
  return (
    <section id="process" className={section}>
      <div className="container">
        <Heading kicker={t("label")} title={t("title")} subtitle={t("subtitle")} />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <article key={s.title} className="flex gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-50"><Sticker name={s.sticker} size={40} /></span>
              <div className="min-w-0">
                <h3 className="font-display text-base font-bold text-ink">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- the teacher ---------- */
export function HomeTeacher({ photo, isReal }: { photo: string; isReal: boolean }) {
  const SITE = useSite();
  const t = useT("landing.home.teacher");
  return (
    <section id="teacher" className={cn(section, "bg-white")}>
      <div className="container grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div className="relative mx-auto w-full max-w-sm">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100 shadow-[0_30px_70px_-35px_rgba(20,14,10,.45)]">
            <Image src={photo} alt={t("name")} width={800} height={1000} className={cn("w-full object-cover", isReal ? "aspect-[4/5]" : "aspect-square")} />
          </div>
        </div>
        <div>
          <Heading kicker={t("label")} title={t("title")} align="left" />
          <div className="relative mt-6 rounded-2xl border border-slate-200 bg-landing-bg p-5 sm:p-6">
            <Quote className="absolute -top-3 left-5 h-7 w-7 rotate-180 fill-brand-500 text-brand-500" />
            <p className="text-[15px] leading-[1.9] text-slate-700">{t("text")}</p>
          </div>
          <p className="mt-5 font-display text-lg font-bold text-ink">{t("name")}</p>
          <p className="text-sm text-slate-600">{t("role")}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a href={SITE.social.youtube} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5"><Youtube className="h-4 w-4" />YouTube</a>
            {SITE.social.facebook ? <a href={SITE.social.facebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-facebook px-4 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5">Facebook</a> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- centres + map ---------- */
type Center = { key: string; place: string; town: string };
export function HomeCenters({ points }: { points: { key: string; p: [number, number] | null }[] }) {
  const SITE = useSite();
  const t = useT("landing.home.centers");
  const items = t.raw<Center[]>("items") ?? [];
  const [hover, setHover] = useState<string | null>(null);
  const tel = SITE.contact.phone.replace(/\s/g, "");
  const wa = whatsappLink(SITE.contact.whatsapp, "Hi");
  return (
    <section id="centers" className={section}>
      <div className="container grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <Heading kicker={t("label")} title={t("title")} subtitle={t("text")} align="left" />
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {items.map((c) => (
              <button type="button" key={c.key} onPointerEnter={(e) => e.pointerType === "mouse" && setHover(c.key)} onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}
                onClick={() => setHover(c.key)} aria-pressed={hover === c.key}
                className={cn("flex items-center gap-3 rounded-2xl border bg-white p-3.5 text-left shadow-sm transition active:scale-[0.98]", hover === c.key ? "border-brand-300 shadow-md" : "border-slate-200/80")}>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><MapPin className="h-5 w-5" /></span>
                <span className="min-w-0"><span className="block font-display font-bold text-ink">{c.place}</span><span className="text-xs text-slate-600">{c.town}</span></span>
              </button>
            ))}
            <div className="flex items-center gap-3 rounded-2xl bg-ink p-3.5 text-white shadow-sm sm:col-span-2">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10"><Wifi className="h-5 w-5 text-brand-300" /></span>
              <span><span className="block font-display font-bold">{t("onlineTitle")}</span><span className="text-xs text-white/80">{t("onlineText")}</span></span>
            </div>
          </div>
          <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
            {t("call")}:
            <a href={`tel:${tel}`} className="inline-flex min-h-10 items-center gap-1 font-semibold text-brand-700 hover:underline"><Phone className="h-3.5 w-3.5" />{SITE.contact.phone}</a>
            {wa ? <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1 font-semibold text-whatsapp-text hover:underline"><WhatsAppIcon className="h-4 w-4" />{SITE.contact.whatsapp}</a> : null}
          </p>
        </div>
        <div className="relative mx-auto w-full max-w-[15rem] sm:max-w-xs">
          <svg viewBox={SL_VIEWBOX} className="h-auto w-full" role="img" aria-label="Sri Lanka">
            {SL_DISTRICTS.map((d) => (
              <path key={d.name} d={d.d} className={cn("stroke-white transition-colors", d.name === "Kalutara" ? "fill-brand-500" : d.name === "Colombo" ? "fill-brand-200" : "fill-brand-100")} strokeWidth={1.5} />
            ))}
            {items.map((c) => {
              const p = points.find((x) => x.key === c.key)?.p;
              if (!p) return null;
              const on = hover === c.key;
              return (
                <g key={c.key}>
                  <circle cx={p[0]} cy={p[1]} r={on ? 13 : 8} className="fill-brand-500/25 transition-all" />
                  <circle cx={p[0]} cy={p[1]} r={on ? 6 : 4.5} className="fill-white stroke-brand-700 transition-all" strokeWidth={2} />
                  {on ? (
                    <g>
                      <rect x={p[0] + 14} y={p[1] - 16} width={c.town.length * 10.5 + 26} height={32} rx={16} className="fill-white" style={{ filter: "drop-shadow(0 6px 14px rgba(20,14,10,.2))" }} />
                      <circle cx={p[0] + 28} cy={p[1]} r={5} className="fill-brand-500" />
                      <text x={p[0] + 40} y={p[1] + 5} className="fill-ink font-display" fontSize={15} fontWeight={700}>{c.town}</text>
                    </g>
                  ) : null}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </section>
  );
}

/* ---------- results: student stories (YouTube) + what students say ---------- */
type YtVideo = { id: string; title: string };
type Testi = { name: string; meta: string; text: string };
export function HomeStories({ stories }: { stories: YtVideo[] }) {
  const SITE = useSite();
  const t = useT("landing.home.stories");
  const tt = useT("landing.testimonials");
  const quotes = (tt.raw<Testi[]>("items") ?? []).slice(0, 3);
  return (
    <section id="stories" className={cn(section, "bg-white")}>
      <div className="container">
        <Heading kicker={t("label")} title={t("title")} subtitle={t("subtitle")} />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {stories.slice(0, 3).map((v) => (
            <a key={v.id} href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer"
              className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift">
              <div className="relative aspect-video overflow-hidden bg-slate-100">
                <Image src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt="" fill sizes="(min-width:768px) 33vw, 90vw" className="object-cover transition duration-500 group-hover:scale-105" />
                <span className="absolute inset-0 grid place-items-center"><span className="grid h-14 w-14 place-items-center rounded-full bg-destructive text-white shadow-xl transition group-hover:scale-110"><Play className="ml-0.5 h-6 w-6 fill-white" /></span></span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="line-clamp-2 font-semibold leading-snug text-ink">{v.title}</h3>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-3 text-xs font-semibold text-destructive-soft-foreground"><Play className="h-3.5 w-3.5 fill-destructive" />{t("watch")}</span>
              </div>
            </a>
          ))}
        </div>
        {quotes.length > 0 && (
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {quotes.map((q) => (
              <figure key={q.name} className="flex flex-col rounded-3xl border border-slate-200/80 bg-landing-bg p-6">
                <Quote className="h-6 w-6 rotate-180 fill-brand-500 text-brand-500" />
                <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed text-slate-700">“{q.text}”</blockquote>
                <figcaption className="mt-4 text-sm font-bold text-ink">{q.name}<span className="block text-xs font-medium text-slate-500">{q.meta}</span></figcaption>
              </figure>
            ))}
          </div>
        )}
        <div className="mt-10 text-center">
          <a href={SITE.social.youtube} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-ink shadow-sm transition hover:border-brand-300">
            <Youtube className="h-4 w-4 text-destructive" />{t("more")}<ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ---------- gallery ---------- */
export type GalleryPreview = { id: string; url: string; alt: string; href: string };
export function HomeGallery({ photos, photo }: { photos: GalleryPreview[]; photo: string | null }) {
  const t = useT("landing.home.gallery");
  const shown = photos.slice(0, 4);
  if (!photo && shown.length < 3) return null;   // nothing to show yet: no empty section on the home page
  return (
    <section id="gallery" className={section}>
      <div className="container">
        <Heading title={t("title")} subtitle={t("subtitle")} />
        <div className="mt-10 grid gap-3 lg:grid-cols-[1.4fr_1fr]">
          {photo ? (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
              <Image src={photo} alt={t("title")} width={1600} height={900} sizes="(max-width: 1024px) 100vw, 700px" className="h-full w-full object-cover" />
            </div>
          ) : null}
          {shown.length >= 3 ? (
            <div className={cn("grid grid-cols-2 gap-3", !photo && "lg:col-span-2 lg:grid-cols-4")}>
              {shown.map((p) => (
                <Link key={p.id} href={p.href} className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-200 ring-1 ring-black/5">
                  <Image src={p.url} alt={p.alt} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover transition duration-500 group-hover:scale-105" />
                </Link>
              ))}
            </div>
          ) : null}
        </div>
        <div className="mt-8 text-center">
          <Link href="/gallery" className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-brand-600">{t("viewAll")} <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- WhatsApp / Telegram channels ---------- */
export function HomeChannels() {
  const SITE = useSite();
  const locale = useLocale();
  const t = useT("landing.home.channels");
  return (
    <section id="channels" className={cn(section, "bg-white")}>
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="flex items-center justify-center gap-3 font-display text-[1.75rem] font-bold text-ink sm:text-4xl">
            <TelegramGlyph className="h-8 w-8" />{t("title")}<WhatsAppIcon className="h-8 w-8" />
          </h2>
          <p className="mt-3 text-[15px] text-slate-600">{t("subtitle")}</p>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SITE.channels.map((c) => (
            <a key={c.key} href={c.url} target="_blank" rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
              <ChannelAvatar image={c.image} kind={c.kind} />
              <span className="min-w-0">
                <span className="block truncate font-display font-bold text-ink group-hover:text-brand-700">{channelTitle(c, locale)}</span>
                <span className="block truncate text-xs text-slate-600">{c.handle}</span>
              </span>
              <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- closing call to action ---------- */
export function HomeCta({ account }: { account: "guest" | "student" | "admin" }) {
  const t = useT("landing.home.cta");
  const href = account === "guest" ? "/register" : account === "admin" ? "/admin" : "/dashboard";
  return (
    <section className="container py-14 sm:py-20">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-500 to-brand-700 px-6 py-12 text-center text-white shadow-[0_30px_70px_-35px_hsl(var(--brand-600)/.8)] sm:px-12">
        <div aria-hidden className="bg-hex absolute inset-0 opacity-60" />
        <h2 className="relative mx-auto max-w-2xl text-balance font-display text-2xl font-bold sm:text-4xl">{t("title")}</h2>
        <p className="relative mx-auto mt-3 max-w-xl text-sm text-white/90 sm:text-base">{t("text")}</p>
        <Link href={href} className="relative mt-7 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-brand-700 shadow-lg transition hover:-translate-y-0.5">
          {t("button")} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
