import "server-only";
import { cache } from "react";
import { asService } from "@/lib/db/pg";
import site from "@/content/site.json";
import { DEFAULT_THEME, normalizeTheme, type ThemeSettings } from "@/lib/theme";
import { BRAND } from "@/config/brand";
import { normalizeCenters, type Center } from "@/lib/centers";
import { normalizeSiteData, type SiteData } from "@/lib/site-data";

/*
 * Site settings stored in public.system_settings (key → JSON). Server-only.
 *   landing_stats  – numbers on the public home page (Owner Console → Landing page)
 *   theme          – brand colour, corner radius, light/dark default (Developer panel → Theme)
 *   maintenance    – maintenance mode (Developer panel → Maintenance)
 *   announcement   – banner shown at the top of the student & admin area
 *   access         – sign-up open / closed
 */

// ─── generic read / write ───
// Every setting is read with ONE query per request (React cache()), so adding settings costs nothing extra.
const ALL_KEYS = ["landing_stats", "theme", "maintenance", "announcement", "access", "brand", "centers", "site_text", "site_data", "faqs"];
const allSettings = cache(async (): Promise<Record<string, unknown>> => {
  try {
    const rows = await asService(async (c) => (await c.query("select key, value from public.system_settings where key = any($1::text[])", [ALL_KEYS])).rows);
    return Object.fromEntries(rows.map((r: { key: string; value: unknown }) => [r.key, r.value]));
  } catch {
    return {};
  }
});
async function readSetting(key: string): Promise<Record<string, unknown>> {
  return ((await allSettings())[key] ?? {}) as Record<string, unknown>;
}
/** Raw value (arrays included) for settings that are lists. */
async function readRaw(key: string): Promise<unknown> {
  return (await allSettings())[key];
}

async function writeSetting(key: string, value: unknown, actorId: string): Promise<void> {
  await asService((c) =>
    c.query(
      `insert into public.system_settings (key, value, updated_by, updated_at)
       values ($1, $2::jsonb, $3, now())
       on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()`,
      [key, JSON.stringify(value), actorId],
    ),
  );
}

const str = (v: unknown, fallback = "", max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : fallback);
const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);

// ─── Landing page counters ───
export interface LandingStatsSettings { abResults: string; subscribers: string; videos: string }

export async function getLandingStatsSettings(): Promise<LandingStatsSettings> {
  const v = await readSetting("landing_stats");
  return {
    abResults: str(v.abResults) || site.youtube.abResults || "+500",
    subscribers: str(v.subscribers) || site.youtube.subscribers || "7.4K+",
    videos: str(v.videos) || site.youtube.videos || "226+",
  };
}
export const saveLandingStatsSettings = (next: LandingStatsSettings, actorId: string) => writeSetting("landing_stats", next, actorId);

// ─── Theme ───
export const getThemeSettings = cache(async (): Promise<ThemeSettings> => normalizeTheme(await readSetting("theme")));
export const saveThemeSettings = (next: ThemeSettings, actorId: string) => writeSetting("theme", normalizeTheme(next as unknown as Record<string, unknown>), actorId);
export { DEFAULT_THEME };

// ─── Maintenance mode ───
export interface MaintenanceSettings { enabled: boolean; message: string; until: string }
export const getMaintenanceSettings = cache(async (): Promise<MaintenanceSettings> => {
  const v = await readSetting("maintenance");
  return { enabled: bool(v.enabled, false), message: str(v.message, "", 600), until: str(v.until, "", 40) };
});
export const saveMaintenanceSettings = (next: MaintenanceSettings, actorId: string) => writeSetting("maintenance", next, actorId);

// ─── Announcement banner ───
export type AnnouncementTone = "info" | "success" | "warning" | "danger" | "brand";
export interface AnnouncementSettings { enabled: boolean; text: string; link: string; tone: AnnouncementTone; audience: "all" | "students" | "staff" }
export const getAnnouncementSettings = cache(async (): Promise<AnnouncementSettings> => {
  const v = await readSetting("announcement");
  const tones: AnnouncementTone[] = ["info", "success", "warning", "danger", "brand"];
  return {
    enabled: bool(v.enabled, false),
    text: str(v.text, "", 300),
    link: str(v.link, "", 300),
    tone: tones.includes(v.tone as AnnouncementTone) ? (v.tone as AnnouncementTone) : "info",
    audience: v.audience === "students" || v.audience === "staff" ? v.audience : "all",
  };
});
export const saveAnnouncementSettings = (next: AnnouncementSettings, actorId: string) => writeSetting("announcement", next, actorId);

// ─── Access ───
export interface AccessSettings { registrationOpen: boolean; registrationClosedMessage: string }
export const getAccessSettings = cache(async (): Promise<AccessSettings> => {
  const v = await readSetting("access");
  return { registrationOpen: bool(v.registrationOpen, true), registrationClosedMessage: str(v.registrationClosedMessage, "", 400) };
});
export const saveAccessSettings = (next: AccessSettings, actorId: string) => writeSetting("access", next, actorId);

// ─── Brand (name, teacher, logo) ───
export interface BrandSettings { name: string; owner: string; logoUrl: string; logoDarkUrl: string; logoOnTile: boolean; groupPhoto: string; teacherPhoto: string; heroPhoto: string; googleVerification: string; bingVerification: string }
const imageUrl = (v: unknown) => { const u = str(v, "", 300); return /^(\/|https:\/\/)\S+$/.test(u) ? u : ""; };
export interface Brand { name: string; fullName: string; owner: string; description: string; logo: { image: string | null; dark: string | null; onTile: boolean }; themeColor: typeof BRAND.themeColor; appBackground: string }
export const getBrandSettings = cache(async (): Promise<BrandSettings> => {
  const v = await readSetting("brand");
  return {
    name: str(v.name, "", 40) || BRAND.name, owner: str(v.owner, "", 60) || BRAND.owner,
    logoUrl: imageUrl(v.logoUrl), logoDarkUrl: imageUrl(v.logoDarkUrl), logoOnTile: bool(v.logoOnTile, false),
    groupPhoto: imageUrl(v.groupPhoto), teacherPhoto: imageUrl(v.teacherPhoto), heroPhoto: imageUrl(v.heroPhoto),
    googleVerification: str(v.googleVerification, "", 120).replace(/[^\w-]/g, ""), bingVerification: str(v.bingVerification, "", 120).replace(/[^\w-]/g, ""),
  };
});
export const saveBrandSettings = (next: BrandSettings, actorId: string) => writeSetting("brand", next, actorId);
/** The brand with the Developer-panel overrides applied (name, teacher, logo). */
export const getBrand = cache(async (): Promise<Brand> => {
  const b = await getBrandSettings();
  return { name: b.name, owner: b.owner, fullName: `${b.name} | ${b.owner}`, description: `A/L Combined Mathematics classes by ${b.owner}`, logo: { image: b.logoUrl || null, dark: b.logoDarkUrl || null, onTile: b.logoOnTile }, themeColor: BRAND.themeColor, appBackground: BRAND.appBackground };
});

// ─── Class centers ───
export const getCenters = cache(async (): Promise<Center[]> => normalizeCenters(await readRaw("centers")));
export const saveCenters = (next: Center[], actorId: string) => writeSetting("centers", normalizeCenters(next), actorId);

// ─── Contact, social links, channels, bank accounts, featured videos ───
export const getSiteData = cache(async (): Promise<SiteData> => normalizeSiteData(await readRaw("site_data")));
export const saveSiteData = (next: SiteData, actorId: string) => writeSetting("site_data", next, actorId);

// ─── Site text overrides (any string in the translation files; Developer panel → Site text) ───
export type SiteText = { en: Record<string, string>; si: Record<string, string> };
const cleanText = (o: unknown): Record<string, string> => {
  const out: Record<string, string> = {};
  if (o && typeof o === "object") for (const [k, v] of Object.entries(o as Record<string, unknown>)) if (/^[\w.]{3,160}$/.test(k) && typeof v === "string" && v.length <= 3000) out[k] = v;
  return out;
};
export const getSiteText = cache(async (): Promise<SiteText> => {
  const v = await readSetting("site_text");
  return { en: cleanText(v.en), si: cleanText(v.si) };
});
export const saveSiteText = (next: SiteText, actorId: string) => writeSetting("site_text", { en: cleanText(next.en), si: cleanText(next.si) }, actorId);

// ─── Frequently Asked Questions (FAQ) ───
export interface FaqItem {
  id: string;
  qEn: string;
  aEn: string;
  qSi: string;
  aSi: string;
}

export function defaultFaqs(): FaqItem[] {
  return [
    {
      id: "faq-1",
      qEn: "How do I register for a class?",
      aEn: "Create a free account with your mobile number, then open the Store in your dashboard, choose your class and month, and upload your bank slip.",
      qSi: "පන්තියකට ලියාපදිංචි වන්නේ කෙසේද?",
      aSi: "ඔබගේ ජංගම දුරකථන අංකයෙන් නොමිලේ ගිණුමක් සාදා, පුවරුවේ වෙළඳසැල විවෘත කර, පන්තිය සහ මාසය තෝරා, බැංකු රිසිට්පත උඩුගත කරන්න."
    },
    {
      id: "faq-2",
      qEn: "How do I pay the class fee?",
      aEn: "Pay by bank deposit or online transfer to the account shown in the Store. Use your Student ID as the reference and upload a photo of the slip.",
      qSi: "පන්ති ගාස්තු ගෙවන්නේ කෙසේද?",
      aSi: "වෙළඳසැලේ පෙන්වා ඇති ගිණුමට බැංකු තැන්පතුවක් හෝ ඔන්ලයින් මාරු කිරීමක් මඟින් ගෙවන්න. සඳහන ලෙස ඔබගේ ශිෂ්‍ය අංකය භාවිත කර රිසිට්පතේ ඡායාරූපයක් උඩුගත කරන්න."
    },
    {
      id: "faq-3",
      qEn: "When will I get access after paying?",
      aEn: "Your payment is checked manually. Once approved, the class month unlocks automatically, usually within a few hours.",
      qSi: "ගෙවීමෙන් පසු ප්‍රවේශය ලැබෙන්නේ කවදාද?",
      aSi: "ඔබගේ ගෙවීම අතින් පරීක්ෂා කෙරේ. අනුමත වූ පසු එම මාසයේ පන්තිය ස්වයංක්‍රීයව විවෘත වේ, සාමාන්‍යයෙන් පැය කිහිපයක් ඇතුළත."
    },
    {
      id: "faq-4",
      qEn: "Can I watch the recordings again?",
      aEn: "Yes. Recordings for every month you have paid for stay available in My Classes, organised week by week.",
      qSi: "පටිගත කිරීම් නැවත නැරඹිය හැකිද?",
      aSi: "ඔව්. ඔබ ගෙවූ සෑම මාසයකම පටිගත කිරීම් සතියෙන් සතිය සකසා මගේ පන්ති තුළ තිබේ."
    },
    {
      id: "faq-5",
      qEn: "When can I join a live class?",
      aEn: "The Join button appears 20 minutes before the class starts. The link is shown only to students who have paid for that month.",
      qSi: "සජීවී පන්තියට සම්බන්ධ විය හැක්කේ කවදාද?",
      aSi: "පන්තිය ආරම්භ වීමට මිනිත්තු 20 කට පෙර සම්බන්ධ වීමේ බොත්තම දිස් වේ. සබැඳිය පෙන්වන්නේ එම මාසයට ගෙවූ සිසුන්ට පමණි."
    },
    {
      id: "faq-6",
      qEn: "I forgot my password. What should I do?",
      aEn: "Contact us on WhatsApp with your Student ID and registered mobile number and we will reset it for you.",
      qSi: "මට මුරපදය අමතක වුණා. කුමක් කළ යුතුද?",
      aSi: "ඔබගේ ශිෂ්‍ය අංකය සහ ලියාපදිංචි දුරකථන අංකය සමඟ WhatsApp හරහා අප අමතන්න, අපි එය යළි සකසන්නෙමු."
    },
    {
      id: "faq-7",
      qEn: "Are the online papers timed?",
      aEn: "Yes. MCQ papers have a countdown timer and submit automatically when time runs out. You can review answers after the paper closes.",
      qSi: "ඔන්ලයින් ප්‍රශ්න පත්‍ර කාලානුබද්ධද?",
      aSi: "ඔව්. බහුවරණ ප්‍රශ්න පත්‍රවල කාල ගණකයක් ඇති අතර කාලය අවසන් වූ විට ස්වයංක්‍රීයව ඉදිරිපත් වේ. ප්‍රශ්න පත්‍රය වැසූ පසු පිළිතුරු සමාලෝචනය කළ හැක."
    },
    {
      id: "faq-8",
      qEn: "Do you deliver printed tutes?",
      aEn: "Yes. Order tute books from the Store and they will be delivered island-wide to the address you provide.",
      qSi: "මුද්‍රිත නිබන්ධන බෙදා හරිනවාද?",
      aSi: "ඔව්. වෙළඳසැලෙන් නිබන්ධන පොත් ඇණවුම් කළ විට ඔබ ලබා දෙන ලිපිනයට දිවයින පුරා බෙදා හරිනු ලැබේ."
    }
  ];
}

export const getFaqs = cache(async (): Promise<FaqItem[]> => {
  const v = await readRaw("faqs");
  if (!Array.isArray(v) || v.length === 0) return defaultFaqs();
  return (v as Record<string, unknown>[]).map((r, i) => ({
    id: str(r.id) || `faq-${i + 1}`,
    qEn: str(r.qEn, "", 300),
    aEn: str(r.aEn, "", 2000),
    qSi: str(r.qSi, "", 300),
    aSi: str(r.aSi, "", 2000),
  })).filter((f) => f.qEn || f.qSi);
});

export const saveFaqs = (next: FaqItem[], actorId: string) => writeSetting("faqs", next, actorId);

// ─── Audit log ───
export async function recordAuditLog(entry: {
  actorId: string;
  actorName: string;
  actorRole: string;
  category: "receipt" | "order" | "staff" | "student" | "settings" | "attendance";
  action: string;
  targetId?: string | null;
  studentId?: string | null;
  studentName?: string | null;
  studentCode?: string | null;
  summary: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await asService((c) =>
      c.query(
        `insert into public.admin_audit_logs (
           actor_id, actor_name, actor_role, category, action, target_id,
           student_id, student_name, student_code, summary, details
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)`,
        [
          entry.actorId, entry.actorName, entry.actorRole, entry.category, entry.action, entry.targetId ?? null,
          entry.studentId ?? null, entry.studentName ?? null, entry.studentCode ?? null, entry.summary, JSON.stringify(entry.details ?? {}),
        ],
      ),
    );
  } catch (e) {
    console.error("[audit] failed to record log:", (e as Error).message);
  }
}
