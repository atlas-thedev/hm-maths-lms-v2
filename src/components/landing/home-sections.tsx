"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useInView, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowRight, BellRing, Check, Clapperboard, MapPin, Phone, Play, Quote, Wifi, Youtube } from "lucide-react";
import { TelegramGlyph, WhatsAppIcon } from "@/components/brand-icons";
import { useLocale, useSite, useT, useTownKeys } from "@/i18n/client";
import { ChannelAvatar } from "@/components/channel-avatar";
import { channelTitle } from "@/lib/site-data";
import { cn, whatsappLink } from "@/lib/utils";
import { SL_DISTRICTS, SL_VIEWBOX } from "./sl-map-data";
import { Sticker } from "./sticker";
import { Magnetic, SplitReveal, TiltCard } from "./motion-kit";
import { HeroBanner } from "./hero-banner";

const ease = [0.22, 1, 0.36, 1] as const;
const up = (d = 0) => ({ initial: { opacity: 0, y: 26 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" }, transition: { duration: 0.7, delay: d, ease } });

/* ---------- shared bits ---------- */
export function Glow({ className }: { className?: string }) {
  return <div aria-hidden className={cn("pointer-events-none absolute rounded-full blur-3xl", className)} />;
}
function Kicker({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">{icon}{children}</p>;
}
function Heading({ kicker, kickerIcon, title, sticker, subtitle, className }: {
  kicker?: string; kickerIcon?: React.ReactNode; title: string; sticker?: string; subtitle?: string; className?: string;
}) {
  return (
    <motion.div {...up()} className={cn("relative mx-auto max-w-2xl px-5 text-center", className)}>
      {kicker ? <Kicker icon={kickerIcon}>{kicker}</Kicker> : null}
      <h2 className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-balance font-display text-[2rem] font-bold leading-tight tracking-tight text-ink sm:text-[2.6rem]">
        {sticker ? <Sticker name={sticker} size={46} /> : null}<SplitReveal text={title} />
      </h2>
      {subtitle ? <p className="mt-3 text-[15px] leading-relaxed text-slate-700">{subtitle}</p> : null}
    </motion.div>
  );
}

/* ---------- hero ---------- */
function CountUp({ value }: { value: string }) {
  // "7.4K+" → animates 0 → 7.4 keeping prefix/suffix
  const m = value.match(/^([^\d]*)([\d.]+)(.*)$/);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const to = m ? parseFloat(m[2]) : 0;
  const [v, setV] = useState(to);
  const dec = m && m[2].includes(".") ? m[2].split(".")[1].length : 0;
  useEffect(() => {
    if (!inView || !m) return;
    const c = animate(0, to, { duration: 1.8, ease, onUpdate: setV });
    return () => c.stop();
  }, [inView, to]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!m) return <span>{value}</span>;
  return <span ref={ref}>{m[1]}{v.toFixed(dec)}{m[3]}</span>;
}

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const x = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 });
  return <motion.div aria-hidden style={{ scaleX: x }} className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-brand-600 via-brand-400 to-warning" />;
}

export type LandingStats = { abResults?: string; subscribers?: string; videos?: string };

export function HomeHero({ account, stats, photo }: { account: "guest" | "student" | "admin"; stats?: LandingStats; photo?: string | null }) {
  const SITE = useSite();
  const townKeys = useTownKeys();
  const t = useT("landing.home.hero");
  const yt = SITE.youtube;
  const subs = stats?.subscribers || yt.subscribers;
  const videos = stats?.videos || yt.videos;
  const rawAb = stats?.abResults || yt.abResults || "+500";
  const abResults = rawAb.startsWith("+") ? rawAb : `+${rawAb}`;
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const textY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const primary = account === "guest" ? { href: "/register", label: t("ctaGuest") } : { href: account === "admin" ? "/admin" : "/dashboard", label: t("ctaGuest") };
  return (
    <section ref={ref} id="home" className="relative scroll-mt-24 overflow-hidden bg-landing-hero pb-24 pt-24 text-white lg:pb-28 lg:pt-24">
      <motion.div style={reduce ? undefined : { y: textY, opacity: fade }} className="container relative flex flex-col items-center">
        {/* Channel banner is the hero: its backdrop matches --landing-hero in the theme, so it blends edge-to-edge.
            The banner is neutral; everything that was red in the art is a brand-coloured mask on top (so it follows the
            theme) and the year badge is live code. */}
        <motion.div
          initial={{ opacity: 0, y: 24, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 1.1, ease }}
          className="w-full max-w-[1000px]">
          <HeroBanner label={t("badge")} photo={photo} />
        </motion.div>
        <h1 className="sr-only">{t("line1")} {t("line2")}</h1>
        <div className="flex w-full max-w-2xl flex-col items-center text-center">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.8 }} className="mt-4 text-[15px] leading-relaxed text-white/65">{t("desc")}</motion.p>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6, ease }} className="mt-7 flex flex-wrap justify-center gap-3">
            <Magnetic strength={0.3}>
              <Link href={primary.href} className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-brand-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/30 transition hover:-translate-y-0.5 hover:bg-brand-400">
                <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition duration-700 group-hover:translate-x-full" />
                <span className="relative">{primary.label}</span> <ArrowRight className="relative h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
            </Magnetic>
            <Magnetic strength={0.25}>
              <Link href="/#process" className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10">{t("ctaLearn")}</Link>
            </Magnetic>
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }} className="mt-7 flex items-center gap-1.5 font-display text-lg font-semibold text-white/90">
            <Sticker name="cool-ducks" size={30} /> {t("tagline")} <Sticker name="target" size={30} />
          </motion.p>
          <motion.dl initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.1, delayChildren: 0.95 } } }} className="mt-8 grid w-full max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[[subs, t("stats.subs"), "hero-subs"], [abResults, t("stats.abResults"), "hero-ab-results"], [videos, t("stats.videos"), "hero-videos"], [String(Math.max(0, townKeys.length - 1)), t("stats.centers"), "hero-centers"]].map(([v, l, tid]) => (
              <motion.div key={tid} data-testid={tid} variants={{ h: { opacity: 0, y: 16, scale: 0.95 }, s: { opacity: 1, y: 0, scale: 1 } }} transition={{ duration: 0.6, ease }}
                className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-md transition hover:border-brand-400/40 hover:bg-white/10">
                <dt className="sr-only">{l}</dt>
                <dd className="font-display text-xl font-bold text-white sm:text-2xl"><CountUp value={v} /></dd>
                <p className="mt-0.5 text-[11px] leading-snug text-white/55">{l}</p>
              </motion.div>
            ))}
          </motion.dl>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3 }} className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-2xl bg-white/95 py-1.5 pl-1.5 pr-3 text-xs font-semibold text-ink shadow-xl">
              <Sticker name="teacher" size={32} />{t("tv")}
            </span>
            <a href={SITE.social.youtube} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-2xl bg-destructive px-3 py-2 text-xs font-semibold text-white shadow-xl transition hover:-translate-y-0.5">
              <Youtube className="h-4 w-4" />{subs}
            </a>
          </motion.div>
        </div>
      </motion.div>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-landing-bg" />
    </section>
  );
}

/* ---------- about the program + quote ---------- */
type Testi = { name: string; meta: string; text: string };
export function HomeAbout() {
  const t = useT("landing.home.about");
  const tt = useT("landing.testimonials");
  const quotes = tt.raw<Testi[]>("items") ?? [];
  const pillars = t.raw<string[]>("pillars") ?? [];
  const [i, setI] = useState(0);
  useEffect(() => {
    if (quotes.length < 2) return;
    const id = setInterval(() => setI((v) => (v + 1) % quotes.length), 6000);
    return () => clearInterval(id);
  }, [quotes.length]);
  const q = quotes[i];
  return (
    <section className="relative pt-10">
      <div className="container">
        <div className="relative grid gap-10 border-y border-dashed border-slate-200 py-12 md:grid-cols-2 md:gap-0">
          <span aria-hidden className="absolute -top-3 left-1/2 hidden -translate-x-1/2 text-slate-300 md:block">+</span>
          <span aria-hidden className="absolute -bottom-3 left-1/2 hidden -translate-x-1/2 text-slate-300 md:block">+</span>
          <motion.div {...up()} className="md:border-r md:border-dashed md:border-slate-200 md:pr-10">
            <Kicker icon={<Clapperboard className="h-3.5 w-3.5" />}>{t("label")}</Kicker>
            <p className="mt-4 text-[15px] leading-relaxed text-slate-700">{t("p1")}</p>
            <p className="mt-3 text-[15px] leading-relaxed text-slate-700">{t("p2")}</p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {pillars.map((p) => (
                <li key={p} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-100"><Check className="h-3.5 w-3.5" />{p}</li>
              ))}
            </ul>
          </motion.div>
          <motion.div {...up(0.1)} className="flex items-center md:pl-10">
            {q ? (
              <div className="flex gap-4">
                <Sticker name="partyface" size={52} />
                <div className="min-h-[9rem]">
                  <Kicker>{t("quoteLabel")}</Kicker>
                  <AnimatePresence mode="wait">
                    <motion.blockquote key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }} className="mt-2">
                      <p className="text-[15px] italic leading-relaxed text-slate-600">“{q.text}”</p>
                      <footer className="mt-3 text-sm font-bold text-ink">{q.name}<span className="block text-xs font-medium text-slate-600">{q.meta}</span></footer>
                    </motion.blockquote>
                  </AnimatePresence>
                </div>
              </div>
            ) : null}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ---------- our process ---------- */
type Step = { sticker: string; title: string; text: string };
export function HomeProcess() {
  const t = useT("landing.home.process");
  const items = t.raw<Step[]>("items") ?? [];
  return (
    <section id="process" className="relative scroll-mt-24 py-14 sm:py-24">
      <Glow className="left-1/2 top-24 h-96 w-[40rem] -translate-x-1/2 bg-brand-100/60" />
      <Heading kicker={t("label")} kickerIcon={<Check className="h-3.5 w-3.5" />} title={t("title")} subtitle={t("subtitle")} />
      <div className="container relative mt-12 flex flex-wrap justify-center gap-5">
        {items.map((s, k) => (
          <motion.div key={s.title} {...up((k % 3) * 0.08)} className="w-full sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)]">
          <TiltCard max={7} className="h-full rounded-3xl">
          <article
            className="group h-full w-full rounded-3xl border border-black/[0.05] bg-white/80 p-6 shadow-soft backdrop-blur transition duration-300 hover:shadow-[0_24px_60px_-28px_hsl(var(--brand-500)/.45)]">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-50 to-warning-soft ring-1 ring-brand-100 transition group-hover:scale-105"><Sticker name={s.sticker} size={48} /></div>
            <h3 className="mt-5 font-display text-lg font-bold text-ink">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.text}</p>
          </article>
          </TiltCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ---------- about teacher ---------- */
export function HomeTeacher({ photo, isReal }: { photo: string; isReal: boolean }) {
  const SITE = useSite();
  const t = useT("landing.home.teacher");
  return (
    <section id="teacher" className="relative scroll-mt-24 overflow-hidden py-12 sm:py-20">
      <Glow className="-left-32 bottom-0 h-96 w-96 bg-warning/70" />
      <div className="container relative grid items-center gap-12 lg:grid-cols-2">
        <motion.div {...up()}>
          <Kicker>{t("label")}</Kicker>
          <h2 className="mt-2 flex items-center gap-3 font-display text-[2rem] font-bold tracking-tight text-ink sm:text-[2.6rem]">{t("title")} <Sticker name="teacher" size={52} /></h2>
          <Quote className="mt-6 h-8 w-8 rotate-180 fill-ink text-ink" />
          <p className="mt-3 text-[15px] leading-[1.9] text-slate-600">{t("text")}</p>
          <div className="mt-3 flex justify-end"><Quote className="h-8 w-8 fill-slate-300 text-slate-300" /></div>
          <p className="mt-2 font-display text-lg font-bold text-ink">{t("name")}</p>
          <p className="text-sm text-slate-600">{t("role")}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a href={SITE.social.youtube} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-xs font-semibold text-white shadow-md shadow-destructive/20 transition hover:-translate-y-0.5"><Youtube className="h-4 w-4" />YouTube</a>
            {SITE.social.facebook ? <a href={SITE.social.facebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-facebook px-4 py-2 text-xs font-semibold text-white shadow-md shadow-info/20 transition hover:-translate-y-0.5">Facebook</a> : null}
          </div>
        </motion.div>
        <motion.div {...up(0.1)} className="relative mx-auto w-full max-w-md">
          <div className="absolute inset-x-6 bottom-0 top-10 rounded-[3rem] bg-gradient-to-b from-brand-200/70 to-warning/40 blur-2xl" />
          <div className="relative overflow-hidden rounded-[2.5rem] shadow-[0_30px_80px_-30px_rgba(20,14,10,.5)] [mask-image:linear-gradient(to_bottom,black_80%,transparent)]">
            <Image src={photo} alt={t("name")} width={800} height={1000} className={cn("w-full object-cover", isReal ? "aspect-[4/5]" : "aspect-square")} />
          </div>
          <div className="absolute -bottom-3 -left-4"><Sticker name="partyface" size={72} /></div>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------- centers + map ---------- */
type Center = { key: string; place: string; town: string };
export function HomeCenters({ points }: { points: { key: string; p: [number, number] | null }[] }) {
  const SITE = useSite();
  const t = useT("landing.home.centers");
  const items = t.raw<Center[]>("items") ?? [];
  const [hover, setHover] = useState<string | null>(null);
  const tel = SITE.contact.phone.replace(/\s/g, "");
  const wa = whatsappLink(SITE.contact.whatsapp, "Hi");
  return (
    <section id="centers" className="relative scroll-mt-24 overflow-hidden py-12 sm:py-20">
      <div className="container grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <motion.div {...up()}>
          <h2 className="flex items-center gap-3 font-display text-[2rem] font-bold tracking-tight text-ink sm:text-[2.6rem]">{t("title")} <Sticker name="map" size={50} /></h2>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-600">{t("text")}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {items.map((c) => (
              <button type="button" key={c.key} onPointerEnter={(e) => e.pointerType === "mouse" && setHover(c.key)} onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}
                onClick={() => setHover(c.key)} aria-pressed={hover === c.key}
                className={cn("flex items-center gap-3 rounded-2xl border bg-white p-3 text-left shadow-sm transition active:scale-[0.98]", hover === c.key ? "border-brand-300 shadow-md" : "border-black/5")}>
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700"><MapPin className="h-5 w-5" /></span>
                <span><span className="block font-display font-bold text-ink">{c.place}</span><span className="text-xs text-slate-600">{c.town}</span></span>
              </button>
            ))}
            <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-gradient-dark p-3 text-white shadow-sm sm:col-span-2">
              <Sticker name="online" size={46} />
              <span><span className="flex items-center gap-1.5 font-display font-bold"><Wifi className="h-4 w-4 text-brand-400" />{t("onlineTitle")}</span><span className="text-xs text-white/90">{t("onlineText")}</span></span>
            </div>
          </div>
          <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-600">
            <Sticker name="phone" size={34} /> {t("call")}:
            <a href={`tel:${tel}`} className="inline-flex min-h-10 items-center gap-1 font-semibold text-brand-700 hover:underline"><Phone className="h-3.5 w-3.5" />{SITE.contact.phone}</a>
            {wa ? <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1 font-semibold text-whatsapp-text hover:underline"><WhatsAppIcon className="h-4 w-4" />070 339 9339</a> : null}
          </p>
        </motion.div>
        <motion.div {...up(0.1)} className="relative mx-auto w-full max-w-[15rem] sm:max-w-sm">
          <svg viewBox={SL_VIEWBOX} className="h-auto w-full drop-shadow-[0_20px_40px_hsl(var(--brand-500)/.15)]" role="img" aria-label="Sri Lanka">
            {SL_DISTRICTS.map((d) => (
              <path key={d.name} d={d.d} className={cn("stroke-white transition-colors duration-300", d.name === "Kalutara" ? "fill-brand-500" : d.name === "Colombo" ? "fill-brand-200" : "fill-brand-100 hover:fill-brand-200")} strokeWidth={1.5} />
            ))}
            {items.map((c) => {
              const p = points.find((x) => x.key === c.key)?.p;
              if (!p) return null;
              const on = hover === c.key;
              return (
                <g key={c.key}>
                  <circle cx={p[0]} cy={p[1]} r={on ? 14 : 9} className="fill-brand-500/25 transition-all"><animate attributeName="r" values="7;16;7" dur="2.4s" repeatCount="indefinite" /></circle>
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

          <div className="absolute left-4 top-10"><Sticker name="location" size={64} /></div>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------- success stories (YouTube) ---------- */
type YtVideo = { id: string; title: string };
export function HomeStories({ stories, lessons }: { stories: YtVideo[]; lessons: YtVideo[] }) {
  const SITE = useSite();
  const t = useT("landing.home.stories");
  const Card = ({ v, big }: { v: YtVideo; big?: boolean }) => (
    <a href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer"
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-black/5 bg-white shadow-soft transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_60px_-28px_rgba(20,14,10,.4)]">
      <div className="relative aspect-video overflow-hidden bg-slate-100">
        <Image src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt="" fill sizes="(min-width:1024px) 33vw, 90vw" className="object-cover transition duration-500 group-hover:scale-105" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-destructive px-2 py-0.5 text-[11px] font-bold text-white"><Youtube className="h-3.5 w-3.5" />Video</span>
        <span className="absolute inset-0 grid place-items-center"><span className="grid h-14 w-14 place-items-center rounded-full bg-destructive/95 text-white shadow-xl transition group-hover:scale-110"><Play className="ml-0.5 h-6 w-6 fill-white" /></span></span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className={cn("line-clamp-2 font-semibold leading-snug text-ink", big ? "text-base" : "text-sm")}>{v.title}</h3>
        <span className="mt-auto inline-flex items-center gap-1.5 pt-3 text-xs font-semibold text-destructive-soft-foreground"><Play className="h-3.5 w-3.5 fill-destructive" />{t("watch")}</span>
      </div>
    </a>
  );
  return (
    <section id="stories" className="relative scroll-mt-24 py-14 sm:py-24">
      <Glow className="left-1/2 top-20 h-80 w-[36rem] -translate-x-1/2 bg-destructive/60" />
      <Heading kicker={t("label")} kickerIcon={<Clapperboard className="h-3.5 w-3.5" />} title={t("title")} sticker="party" subtitle={t("subtitle")} />
      <div className="container relative mt-12 grid gap-5 md:grid-cols-3">
        {stories.map((v, k) => <motion.div key={v.id} {...up(k * 0.08)}><Card v={v} big /></motion.div>)}
      </div>
      {lessons.length ? (
        <div className="container relative mt-14">
          <h3 className="flex items-center gap-2 font-display text-xl font-bold text-ink"><Sticker name="bulb" size={34} />{t("lessons")}</h3>
          <div className="scrollbar-none -mx-4 mt-5 flex snap-x gap-4 overflow-x-auto px-4 pb-3">
            {lessons.map((v) => <div key={v.id} className="w-[78%] shrink-0 snap-start sm:w-[40%] lg:w-[24%]"><Card v={v} /></div>)}
          </div>
          <div className="mt-6 text-center">
            <a href={SITE.social.youtube} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:-translate-y-0.5">
              <Youtube className="h-4 w-4 text-destructive-soft-foreground" />{t("more")}<ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      ) : null}
    </section>
  );
}

/* ---------- gallery ---------- */
export type GalleryPreview = { id: string; url: string; alt: string; href: string };
export function HomeGallery({ photos, photo }: { photos: GalleryPreview[]; photo: string | null }) {
  const t = useT("landing.home.gallery");
  // A big first tile + rows of four: only 9, 5 or (without the big tile) 3–4 photos fill the grid without a gap.
  const featured = photos.length >= 5;
  const shown = photos.slice(0, photos.length >= 9 ? 9 : featured ? 5 : Math.min(photos.length, 4));
  if (!photo && shown.length < 3) return null;   // nothing to show yet: no empty section on the home page
  return (
    <section id="gallery" className="relative scroll-mt-24 py-10 sm:py-16">
      <Heading title={t("title")} subtitle={t("subtitle")} sticker="photos" />
      <motion.div {...up(0.1)} className="container mt-10 space-y-3 sm:space-y-4">
        {photo ? (
          <div className="relative overflow-hidden rounded-[2rem] border border-black/5 bg-ink shadow-[0_30px_80px_-30px_rgba(20,14,10,.5)]">
            <Image src={photo} alt={t("title")} width={1600} height={900} sizes="(max-width: 1280px) 100vw, 1200px" className="h-auto w-full object-cover" />
          </div>
        ) : null}
        {shown.length >= 3 ? (
          <div className={cn("grid gap-2.5 sm:gap-3", featured && !photo ? "auto-rows-[7.5rem] grid-cols-2 sm:auto-rows-[10rem] sm:grid-cols-4" : shown.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4")}>
            {shown.slice(0, photo ? 4 : shown.length).map((p, i) => (
              <Link key={p.id} href={p.href} className={cn("group relative overflow-hidden rounded-2xl bg-slate-200 shadow-sm ring-1 ring-black/5", featured && !photo ? i === 0 && "col-span-2 row-span-2" : "aspect-[4/3]")}>
                <Image src={p.url} alt={p.alt} fill sizes={featured && !photo && i === 0 ? "(max-width: 640px) 100vw, 50vw" : "(max-width: 640px) 50vw, 25vw"} className="object-cover transition duration-700 group-hover:scale-105" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        ) : null}
        <div className="flex justify-center pt-3">
          <Link href="/gallery" className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:-translate-y-px hover:bg-brand-600">{t("viewAll")} <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </motion.div>
    </section>
  );
}

/* ---------- YouTube community card ---------- */
export function HomeCommunity({ stats }: { stats?: LandingStats }) {
  const SITE = useSite();
  const t = useT("landing.home.community");
  const th = useT("landing.home.hero");
  const yt = SITE.youtube;
  const subs = stats?.subscribers || yt.subscribers;
  const videos = stats?.videos || yt.videos;
  const rawAb = stats?.abResults || yt.abResults || "+500";
  const abResults = rawAb.startsWith("+") ? rawAb : `+${rawAb}`;
  return (
    <section className="relative overflow-hidden py-14 sm:py-24">
      <Glow className="left-1/2 top-1/3 h-[26rem] w-[26rem] -translate-x-1/2 bg-destructive/70" />
      <Heading kicker={t("label")} kickerIcon={<Youtube className="h-3.5 w-3.5 text-destructive-soft-foreground" />} title={t("title")} subtitle={t("subtitle")} />
      <motion.div {...up(0.1)} className="relative mx-auto mt-10 w-[min(92vw,26rem)]">
        <div className="rounded-[2rem] border border-black/5 bg-white/90 p-6 text-center shadow-[0_30px_80px_-35px_rgba(20,14,10,.45)] backdrop-blur">
          <div className="relative mx-auto w-fit">
            <Image src={yt.avatar} alt={th("line2")} width={96} height={96} className="h-24 w-24 rounded-full object-cover ring-4 ring-white shadow-lg" />
            <span className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-destructive text-white ring-2 ring-white"><Youtube className="h-4 w-4" /></span>
          </div>
          <p className="mt-4 font-display font-bold text-ink">{t("name")}</p>
          <p className="text-xs text-slate-600">{yt.handle} · ⭕ {th("tagline")}</p>
          <div className="mt-5 grid grid-cols-3 gap-2.5">
            <div className="rounded-2xl border border-brand-200 bg-brand-50 px-2 py-3.5"><p className="font-display text-2xl font-extrabold text-brand-700 sm:text-3xl">{subs}</p><p className="mt-0.5 text-[11px] font-medium text-slate-700">{t("subscribers")}</p></div>
            <div className="rounded-2xl border border-success/25 bg-success-soft px-2 py-3.5" data-testid="community-ab-results"><p className="font-display text-2xl font-extrabold text-success-soft-foreground sm:text-3xl">{abResults}</p><p className="mt-0.5 text-[11px] font-medium text-slate-700">{th("stats.abResults")}</p></div>
            <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-2 py-3.5"><p className="font-display text-2xl font-extrabold text-destructive-soft-foreground sm:text-3xl">{videos}</p><p className="mt-0.5 text-[11px] font-medium text-slate-700">{t("videos")}</p></div>
          </div>
          <a href={`${SITE.social.youtube}?sub_confirmation=1`} target="_blank" rel="noopener noreferrer"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-destructive py-3 text-sm font-semibold text-white shadow-lg shadow-destructive/25 transition hover:-translate-y-0.5 hover:bg-destructive">
            <Youtube className="h-4 w-4" />{t("subscribe")}
          </a>
        </div>
        <div className="absolute -right-10 -top-8 hidden sm:block"><Sticker name="star" size={64} /></div>
        <p className="mx-auto mt-4 flex items-start gap-2 rounded-2xl border border-black/5 bg-white/70 px-4 py-3 text-xs leading-relaxed text-slate-600 shadow-sm">
          <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-warning-soft-foreground" />{t("stay")}
        </p>
      </motion.div>
    </section>
  );
}

/* ---------- channels ---------- */
export function HomeChannels() {
  const SITE = useSite();
  const locale = useLocale();
  const t = useT("landing.home.channels");
  return (
    <section id="channels" className="relative scroll-mt-24 py-10 sm:py-16">
      <motion.div {...up()} className="relative mx-auto max-w-2xl px-5 text-center">
        <h2 className="flex items-center justify-center gap-3 font-display text-[2rem] font-bold text-ink sm:text-[2.4rem]">
          <TelegramGlyph className="h-9 w-9" />{t("title")}<WhatsAppIcon className="h-9 w-9" />
        </h2>
        <p className="mt-3 text-[15px] text-slate-600">{t("subtitle")}</p>
      </motion.div>
      <div className="container mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SITE.channels.map((c, k) => (
          <motion.a key={c.key} {...up((k % 3) * 0.06)} href={c.url} target="_blank" rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-2xl border border-black/5 bg-white p-4 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-25px_rgba(20,14,10,.35)]">
            <ChannelAvatar image={c.image} kind={c.kind} />
            <span className="min-w-0">
              <span className="block truncate font-display font-bold text-ink group-hover:text-brand-600">{channelTitle(c, locale)}</span>
              <span className="block truncate text-xs text-slate-600">{c.handle}</span>
            </span>
            <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
          </motion.a>
        ))}
        <motion.div {...up(0.12)} className="hidden items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 p-4 lg:flex">
          <Sticker name="group" size={64} /><Sticker name="megaphone" size={56} />
        </motion.div>
      </div>
    </section>
  );
}

/* ---------- CTA ---------- */
export function HomeCta({ account }: { account: "guest" | "student" | "admin" }) {
  const t = useT("landing.home.cta");
  const href = account === "guest" ? "/register" : account === "admin" ? "/admin" : "/dashboard";
  return (
    <section className="container py-10 sm:py-16">
      <motion.div {...up()} className="relative overflow-hidden rounded-[2rem] bg-gradient-dark px-6 py-12 text-center text-white shadow-[0_40px_90px_-40px_hsl(var(--brand-500)/.6)] sm:px-12">
        <Glow className="-right-10 -top-10 h-64 w-64 bg-brand-500/40" />
        <Glow className="-bottom-16 -left-10 h-64 w-64 bg-warning/20" />
        <div className="relative mx-auto flex w-fit gap-2"><Sticker name="hatch" size={72} /><Sticker name="charts" size={64} /></div>
        <h2 className="relative mx-auto mt-4 max-w-2xl text-balance font-display text-2xl font-bold sm:text-4xl">{t("title")}</h2>
        <p className="relative mx-auto mt-3 max-w-xl text-sm text-white/90 sm:text-base">{t("text")}</p>
        <Link href={href} className="relative mt-7 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-700 to-brand-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:-translate-y-0.5">
          {t("button")} <ArrowRight className="h-4 w-4" />
        </Link>
      </motion.div>
    </section>
  );
}
