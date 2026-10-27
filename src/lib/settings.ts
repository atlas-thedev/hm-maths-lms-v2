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
const ALL_KEYS = ["landing_stats", "theme", "maintenance", "announcement", "access", "brand", "centers", "site_text", "site_data"];
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
