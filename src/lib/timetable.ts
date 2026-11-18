import "server-only";
import { cache } from "react";
import { asService } from "@/lib/db/pg";

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
  class_id: string | null;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
}

export const getPublicTimetable = cache(async (): Promise<TimetableEntry[]> => {
  try {
    return await asService(async (c) =>
      (await c.query(
        `select id, batch_year, class_type, title, center_key, hall_name, day_label, time_label,
                fee_label, start_note, details, class_id, is_featured, is_active, sort_order
           from public.timetable_entries
          where is_active = true
          order by batch_year desc, sort_order asc, created_at asc`,
      )).rows as TimetableEntry[],
    );
  } catch {
    return [];
  }
});

export const getAllTimetable = cache(async (): Promise<TimetableEntry[]> => {
  try {
    return await asService(async (c) =>
      (await c.query(
        `select id, batch_year, class_type, title, center_key, hall_name, day_label, time_label,
                fee_label, start_note, details, class_id, is_featured, is_active, sort_order
           from public.timetable_entries
          order by batch_year desc, sort_order asc, created_at asc`,
      )).rows as TimetableEntry[],
    );
  } catch {
    return [];
  }
});
