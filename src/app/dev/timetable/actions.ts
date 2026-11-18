"use server";

import { revalidatePath } from "next/cache";
import { requireDeveloper } from "@/lib/auth";
import { asService } from "@/lib/db/pg";
import {
  DEFAULT_HERO_PROMO,
  recordAuditLog,
  saveHeroPromoSettings,
  type HeroPromoSettings,
} from "@/lib/settings";
import type { ActionState } from "@/lib/types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const on = (fd: FormData, k: string) => ["on", "true", "1"].includes(String(fd.get(k) ?? ""));
const cleanStr = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function saveHeroPromoAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { user, profile } = await requireDeveloper();
  const href = str(fd, "href") || DEFAULT_HERO_PROMO.href;
  if (!href.startsWith("/") && !/^https:\/\/\S+$/.test(href)) {
    return { error: "Destination link must start with / or https://." };
  }

  const next: HeroPromoSettings = {
    enabled: on(fd, "enabled"),
    year: str(fd, "year").slice(0, 20) || DEFAULT_HERO_PROMO.year,
    badgeEn: str(fd, "badgeEn").slice(0, 50) || DEFAULT_HERO_PROMO.badgeEn,
    badgeSi: str(fd, "badgeSi").slice(0, 50) || DEFAULT_HERO_PROMO.badgeSi,
    titleEn: str(fd, "titleEn").slice(0, 120) || DEFAULT_HERO_PROMO.titleEn,
    titleSi: str(fd, "titleSi").slice(0, 120) || DEFAULT_HERO_PROMO.titleSi,
    subtitleEn: str(fd, "subtitleEn").slice(0, 220),
    subtitleSi: str(fd, "subtitleSi").slice(0, 220),
    ctaEn: str(fd, "ctaEn").slice(0, 50) || DEFAULT_HERO_PROMO.ctaEn,
    ctaSi: str(fd, "ctaSi").slice(0, 50) || DEFAULT_HERO_PROMO.ctaSi,
    href,
  };

  await saveHeroPromoSettings(next, user.id);
  await recordAuditLog({
    actorId: user.id,
    actorName: profile.full_name,
    actorRole: profile.role,
    category: "settings",
    action: "settings_changed",
    summary: `Hero Promo → ${next.enabled ? `${next.year} ON (${next.href})` : "OFF (using silhouette)"}`,
    details: { ...next },
  });

  revalidatePath("/", "layout");
  revalidatePath("/timetable");
  revalidatePath("/dev/timetable");
  return { ok: true, message: next.enabled ? `Saved. Hero promo (${next.year}) is live on the home page.` : "Saved. Hero promo card is hidden." };
}

export async function saveTimetableAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { user, profile } = await requireDeveloper();
  let raw: unknown;
  try {
    raw = JSON.parse(str(fd, "entries"));
  } catch {
    return { error: "Could not read timetable entries. Reload and try again." };
  }
  if (!Array.isArray(raw)) return { error: "Could not read timetable list." };

  const cleaned = [];
  for (const [idx, item] of (raw as Record<string, unknown>[]).entries()) {
    const yearNum = Number(item?.batch_year);
    if (!Number.isInteger(yearNum) || yearNum < 2020 || yearNum > 2099) {
      return { error: `Row ${idx + 1}: enter a valid A/L year (e.g. 2029).` };
    }
    const title = cleanStr(item?.title, 140);
    const center_key = cleanStr(item?.center_key, 60);
    const day_label = cleanStr(item?.day_label, 100);
    const time_label = cleanStr(item?.time_label, 120);
    if (!title || !center_key || !day_label || !time_label) {
      return { error: `Row ${idx + 1}: title, center, day and time are required.` };
    }
    const id = typeof item?.id === "string" && UUID_RE.test(item.id) ? item.id : null;
    const class_id = typeof item?.class_id === "string" && UUID_RE.test(item.class_id) ? item.class_id : null;
    cleaned.push({
      id,
      batch_year: yearNum,
      class_type: cleanStr(item?.class_type, 40) || "Theory",
      title,
      center_key,
      hall_name: cleanStr(item?.hall_name, 140),
      day_label,
      time_label,
      fee_label: cleanStr(item?.fee_label, 100),
      start_note: cleanStr(item?.start_note, 180),
      details: cleanStr(item?.details, 1500),
      class_id,
      is_featured: Boolean(item?.is_featured),
      is_active: item?.is_active !== false,
      sort_order: Number.isFinite(Number(item?.sort_order)) ? Number(item?.sort_order) : (idx + 1) * 10,
    });
  }

  await asService(async (c) => {
    const keepIds = cleaned.map((r) => r.id).filter((id): id is string => Boolean(id));
    if (keepIds.length > 0) {
      await c.query("delete from public.timetable_entries where not (id = any($1::uuid[]))", [keepIds]);
    } else {
      await c.query("delete from public.timetable_entries");
    }

    for (const r of cleaned) {
      if (r.id) {
        await c.query(
          `insert into public.timetable_entries (
             id, batch_year, class_type, title, center_key, hall_name, day_label, time_label,
             fee_label, start_note, details, class_id, is_featured, is_active, sort_order, updated_at
           ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, now())
           on conflict (id) do update set
             batch_year  = excluded.batch_year,
             class_type  = excluded.class_type,
             title       = excluded.title,
             center_key  = excluded.center_key,
             hall_name   = excluded.hall_name,
             day_label   = excluded.day_label,
             time_label  = excluded.time_label,
             fee_label   = excluded.fee_label,
             start_note  = excluded.start_note,
             details     = excluded.details,
             class_id    = excluded.class_id,
             is_featured = excluded.is_featured,
             is_active   = excluded.is_active,
             sort_order  = excluded.sort_order,
             updated_at  = now()`,
          [
            r.id, r.batch_year, r.class_type, r.title, r.center_key, r.hall_name,
            r.day_label, r.time_label, r.fee_label, r.start_note, r.details,
            r.class_id, r.is_featured, r.is_active, r.sort_order,
          ],
        );
      } else {
        await c.query(
          `insert into public.timetable_entries (
             batch_year, class_type, title, center_key, hall_name, day_label, time_label,
             fee_label, start_note, details, class_id, is_featured, is_active, sort_order
           ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            r.batch_year, r.class_type, r.title, r.center_key, r.hall_name,
            r.day_label, r.time_label, r.fee_label, r.start_note, r.details,
            r.class_id, r.is_featured, r.is_active, r.sort_order,
          ],
        );
      }
    }
  });

  await recordAuditLog({
    actorId: user.id,
    actorName: profile.full_name,
    actorRole: profile.role,
    category: "settings",
    action: "settings_changed",
    summary: `Updated public timetable (${cleaned.length} slot(s))`,
    details: { count: cleaned.length },
  });

  revalidatePath("/", "layout");
  revalidatePath("/timetable");
  revalidatePath("/dev/timetable");
  return { ok: true, message: `Saved ${cleaned.length} timetable entry(ies). Live at /timetable.` };
}
