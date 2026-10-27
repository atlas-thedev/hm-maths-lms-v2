/* Class centers ("towns"). Editable in the Developer panel → Centers; "Online" is always there and cannot be removed. */

export interface Center {
  /** Stored on student profiles and classes (e.g. "Panadura"). Never changes once created. */
  key: string;
  en: string;
  si: string;
  /** Hall / institute name shown on the home page card (optional). */
  venueEn: string;
  venueSi: string;
  /** Position on the home page map (optional). */
  lat: number | null;
  lon: number | null;
}

export const ONLINE_KEY = "Online";

export const DEFAULT_CENTERS: Center[] = [
  { key: "Panadura", en: "Panadura", si: "පානදුර", venueEn: "Sakya", venueSi: "සක්යා", lat: 6.7132, lon: 79.9026 },
  { key: "Horana", en: "Horana", si: "හොරණ", venueEn: "Widula", venueSi: "විදුල", lat: 6.7159, lon: 80.0622 },
  { key: "Mathugama", en: "Mathugama", si: "මතුගම", venueEn: "Panola", venueSi: "පැනෝලා", lat: 6.5222, lon: 80.1136 },
  { key: "Kalutara", en: "Kalutara", si: "කළුතර", venueEn: "Rasanya", venueSi: "රසන්යා", lat: 6.5854, lon: 79.9607 },
  { key: "Nugegoda", en: "Nugegoda", si: "නුගේගොඩ", venueEn: "", venueSi: "", lat: 6.8649, lon: 79.8997 },
];

const clean = (v: unknown, max = 80) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi ? Math.round(v * 1e5) / 1e5 : null);
export const KEY_RE = /^[A-Za-z][A-Za-z0-9 .'-]{1,38}$/;

/** Validates whatever was stored: bad rows are dropped, duplicate keys removed, "Online" is never a physical center. */
export function normalizeCenters(v: unknown): Center[] {
  if (!Array.isArray(v)) return DEFAULT_CENTERS;
  const seen = new Set<string>();
  const out: Center[] = [];
  for (const r of v as Record<string, unknown>[]) {
    const key = clean(r?.key, 40);
    if (!KEY_RE.test(key) || key.toLowerCase() === ONLINE_KEY.toLowerCase() || seen.has(key.toLowerCase())) continue;
    seen.add(key.toLowerCase());
    out.push({ key, en: clean(r.en) || key, si: clean(r.si) || clean(r.en) || key, venueEn: clean(r.venueEn), venueSi: clean(r.venueSi), lat: num(r.lat, 5.5, 10), lon: num(r.lon, 79, 82.5) });
  }
  return out.length ? out : DEFAULT_CENTERS;
}

/** Every key a profile / class may use: the centers plus "Online". */
export const townKeys = (centers: Center[]) => [...centers.map((c) => c.key), ONLINE_KEY];

/** Latitude / longitude → position on the home page map (fitted to the four original town markers). */
export const mapPoint = (c: Pick<Center, "lat" | "lon">): [number, number] | null =>
  c.lat === null || c.lon === null ? null : [Math.round((79.8 + 199 * (c.lon - 79.9026)) * 10) / 10, Math.round((637.4 - 199.5 * (c.lat - 6.7132)) * 10) / 10];

export const centerLabel = (c: Center, locale: string) => (locale === "si" ? c.si : c.en);
export const centerVenue = (c: Center, locale: string) => (locale === "si" ? c.venueSi : c.venueEn);
