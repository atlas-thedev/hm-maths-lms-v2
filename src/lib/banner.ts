/* Class banner templates: 5 designs drawn from the class itself (title, year, type, center, time) plus the
   current month, which is filled in automatically every time the banner is shown. */

export const BANNER_TEMPLATES = ["attention", "midnight", "brand", "paper", "sunrise"] as const;
export type BannerTemplate = (typeof BANNER_TEMPLATES)[number];
export type BannerShape = "poster" | "wide" | "strip";

export interface BannerConfig {
  template: BannerTemplate;
  /** "month" = the current month's name, filled in automatically; "custom" = the text below; "none" = no big word. */
  headlineMode: "month" | "custom" | "none";
  headline: string;
  /** Small label like "ATTENTION" or "NEW BATCH" (empty = none). */
  badge: string;
  subtitle: string;
  tagline: string;
}

export const DEFAULT_BANNER_CONFIG: BannerConfig = { template: "attention", headlineMode: "month", headline: "", badge: "", subtitle: "", tagline: "" };

const t = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Validates whatever the form or the database hands over; returns null for "no template". */
export function normalizeBannerConfig(v: unknown): BannerConfig | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (!(BANNER_TEMPLATES as readonly unknown[]).includes(o.template)) return null;
  return {
    template: o.template as BannerTemplate,
    headlineMode: o.headlineMode === "custom" || o.headlineMode === "none" ? o.headlineMode : "month",
    headline: t(o.headline, 24), badge: t(o.badge, 24), subtitle: t(o.subtitle, 70), tagline: t(o.tagline, 70),
  };
}

export const TEMPLATE_LABEL: Record<BannerTemplate, string> = { attention: "Attention", midnight: "Midnight", brand: "Brand colour", paper: "Exam paper", sunrise: "Sunrise" };

/** Month 0–11 in Sri Lanka time. */
export function colomboMonth(now = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Colombo", month: "numeric" }).format(now)) - 1;
}

/** "12.00 – 2.00" style range with a localized am/pm marker. */
export function timeRange(start: string | null | undefined, minutes: number | null | undefined, locale: string): string {
  if (!start) return "";
  const [h, m] = start.split(":").map(Number);
  const end = (h * 60 + m + (minutes ?? 120)) % 1440;
  const mk = (mins: number) => { const hh = Math.floor(mins / 60), mm = mins % 60; const h12 = ((hh + 11) % 12) + 1; return { text: `${h12}.${String(mm).padStart(2, "0")}`, pm: hh >= 12 }; };
  const a = mk(h * 60 + m), b = mk(end);
  const mark = (pm: boolean) => (locale === "si" ? (pm ? "ප.ව" : "පෙ.ව") : pm ? "PM" : "AM");
  return a.pm === b.pm ? `${locale === "si" ? `${mark(a.pm)} ` : ""}${a.text} - ${b.text}${locale === "si" ? "" : ` ${mark(b.pm)}`}` : `${a.text} ${mark(a.pm)} - ${b.text} ${mark(b.pm)}`;
}

/** Everything a template needs, already worded for the language. */
export interface BannerContent {
  config: BannerConfig;
  headline: string;
  year: string;
  type: string;
  title: string;
  badge: string;
  subtitle: string;
  venue: string;
  town: string;
  time: string;
  days: string;
  tagline: string;
  owner: string;
  photo: string | null;
  locale: string;
}

/** Longest line first: scales the big word down so a long month ("SEPTEMBER") still fits the width it is given. */
export function fitScale(text: string, availableUnits: number, baseUnits: number, locale: string): number {
  const k = /[඀-෿]/.test(text) ? 0.72 : 0.76;
  const need = [...text].length * k * baseUnits;
  return need <= availableUnits ? 1 : Math.max(0.35, availableUnits / need);
}
