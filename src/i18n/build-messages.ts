import { MESSAGES } from "./messages";
import type { Locale } from "./config";
import type { Messages } from "./translate";
import { centerLabel, centerVenue, ONLINE_KEY, type Center } from "@/lib/centers";
import type { SiteData } from "@/lib/site-data";
import type { FaqItem } from "@/lib/settings";

/** Brand name the translation files were written with; replaced by the Developer-panel name when it differs. */
export const DEFAULT_BRAND_NAME = "HM Maths";

export interface BuildInput {
  brand: { name: string; fullName: string; owner: string; logoUrl: string; logoDarkUrl: string; logoOnTile: boolean };
  centers: Center[];
  overrides: Record<string, string>;
  site: SiteData;
  onlineLabel: { en: string; si: string };
  faqs?: FaqItem[];
}

function setPath(root: Messages, path: string, value: unknown) {
  const parts = path.split(".");
  let cur: unknown = root;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur || typeof cur !== "object" || !(parts[i] in (cur as object))) return;   // only existing keys can be overridden
    cur = (cur as Record<string, unknown>)[parts[i]];
  }
  const last = parts[parts.length - 1];
  if (!cur || typeof cur !== "object" || !(last in (cur as object))) return;
  const slot = cur as Record<string, unknown>;
  if (typeof slot[last] === "string") slot[last] = value;
  // a list of words (e.g. search keywords) is edited as one comma-separated line
  else if (Array.isArray(slot[last]) && (slot[last] as unknown[]).every((x) => typeof x === "string") && typeof value === "string") slot[last] = value.split(",").map((x) => x.trim()).filter(Boolean);
}

function walk(node: unknown, fn: (s: string) => string): unknown {
  if (typeof node === "string") return fn(node);
  if (Array.isArray(node)) return node.map((x) => walk(x, fn));
  if (node && typeof node === "object") return Object.fromEntries(Object.entries(node as Record<string, unknown>).map(([k, v]) => [k, walk(v, fn)]));
  return node;
}

const cache = new Map<string, Messages>();

/**
 * The translation tree for one language, with everything the Developer panel can change applied:
 *   1. site-text overrides (any string),
 *   2. the centers list → common.towns, the home page center cards, and the {centers} / {centers_and} / {centerCount} tokens,
 *   3. the brand name (every "HM Maths" in the text) and __brand for the browser (logo, name).
 */
export function buildMessages(locale: Locale, input: BuildInput): Messages {
  const key = locale + JSON.stringify(input);
  const hit = cache.get(key);
  if (hit) return hit;

  const base = structuredClone(MESSAGES[locale]) as Messages;
  const { brand, centers, overrides } = input;

  // centers → labels used everywhere (`towns.<key>`) + the home page cards
  const labels: Record<string, string> = Object.fromEntries(centers.map((c) => [c.key, centerLabel(c, locale)]));
  labels[ONLINE_KEY] = input.onlineLabel[locale];
  (base.common as Messages).towns = labels;
  const home = ((base.landing as Messages).home as Messages).centers as Messages;
  home.items = centers.map((c) => ({ key: c.key, place: centerVenue(c, locale), town: centerLabel(c, locale) }));

  if (input.faqs && input.faqs.length > 0) {
    const faqList = input.faqs.map((f) => ({
      q: locale === "si" ? (f.qSi || f.qEn) : (f.qEn || f.qSi),
      a: locale === "si" ? (f.aSi || f.aEn) : (f.aEn || f.aSi),
    }));
    ((base.landing as Messages).faq as Messages).items = faqList;
  }

  for (const [path, value] of Object.entries(overrides)) setPath(base, path, value);

  const names = centers.map((c) => centerLabel(c, locale));
  const and = locale === "si" ? "සහ" : "and";
  const list = names.join(", ");
  const listAnd = names.length > 1 ? `${names.slice(0, -1).join(", ")} ${and} ${names[names.length - 1]}` : names[0] ?? "";
  const rename = brand.name !== DEFAULT_BRAND_NAME;
  const out = walk(base, (s) => {
    let r = s.includes("{center") ? s.replaceAll("{centers_and}", listAnd).replaceAll("{centers}", list).replaceAll("{centerCountAll}", String(names.length + 1)).replaceAll("{centerCount}", String(names.length)) : s;
    if (rename && r.includes(DEFAULT_BRAND_NAME)) r = r.replaceAll(DEFAULT_BRAND_NAME, brand.name);
    return r;
  }) as Messages;
  out.__brand = brand;
  out.__site = input.site;

  if (cache.size > 12) cache.clear();
  cache.set(key, out);
  return out;
}
