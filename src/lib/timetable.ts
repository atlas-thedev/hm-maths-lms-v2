import "server-only";
import { cache } from "react";
import { asService } from "@/lib/db/pg";

export interface TimetableSlot {
  center_key: string;
  hall_name: string;
  day_label: string;
  time_label: string;
}

export interface TimetableEntry {
  id: string;
  batch_year: number;
  class_type: string;
  title: string;
  center_key: string;
  hall_name: string;
  day_label: string;
  time_label: string;
  fee_label: string;
  start_note: string;
  details: string;
  slots: TimetableSlot[];
  class_id: string | null;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
}

const cleanStr = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function normalizeEntry(row: Record<string, unknown>): TimetableEntry {
  const center_key = cleanStr(row.center_key);
  const hall_name = cleanStr(row.hall_name);
  const day_label = cleanStr(row.day_label);
  const time_label = cleanStr(row.time_label);

  const rawSlots = Array.isArray(row.slots) ? (row.slots as Record<string, unknown>[]) : [];
  const parsedSlots: TimetableSlot[] = rawSlots
    .map((s) => ({
      center_key: cleanStr(s?.center_key),
      hall_name: cleanStr(s?.hall_name),
      day_label: cleanStr(s?.day_label),
      time_label: cleanStr(s?.time_label),
    }))
    .filter((s) => s.center_key && s.day_label && s.time_label);

  const slots =
    parsedSlots.length > 0
      ? parsedSlots
      : center_key
        ? [{ center_key, hall_name, day_label, time_label }]
        : [];

  return {
    id: cleanStr(row.id),
    batch_year: Number(row.batch_year),
    class_type: cleanStr(row.class_type) || "Theory",
    title: cleanStr(row.title),
    center_key,
    hall_name,
    day_label,
    time_label,
    fee_label: cleanStr(row.fee_label),
    start_note: cleanStr(row.start_note),
    details: cleanStr(row.details),
    slots,
    class_id: typeof row.class_id === "string" && row.class_id ? row.class_id : null,
    is_featured: Boolean(row.is_featured),
    is_active: row.is_active !== false,
    sort_order: Number(row.sort_order) || 0,
  };
}

export const getPublicTimetable = cache(async (): Promise<TimetableEntry[]> => {
  try {
    return await asService(async (c) => {
      const res = await c.query(
        `select id, batch_year, class_type, title, center_key, hall_name, day_label, time_label,
                fee_label, start_note, details, coalesce(slots, '[]'::jsonb) as slots,
                class_id, is_featured, is_active, sort_order
           from public.timetable_entries
          where is_active = true
          order by batch_year desc, sort_order asc, created_at asc`,
      );
      return (res.rows as Record<string, unknown>[]).map(normalizeEntry);
    });
  } catch {
    return [];
  }
});

export const getAllTimetable = cache(async (): Promise<TimetableEntry[]> => {
  try {
    return await asService(async (c) => {
      const res = await c.query(
        `select id, batch_year, class_type, title, center_key, hall_name, day_label, time_label,
                fee_label, start_note, details, coalesce(slots, '[]'::jsonb) as slots,
                class_id, is_featured, is_active, sort_order
           from public.timetable_entries
          order by batch_year desc, sort_order asc, created_at asc`,
      );
      return (res.rows as Record<string, unknown>[]).map(normalizeEntry);
    });
  } catch {
    return [];
  }
});
