import { WEEK_DAYS } from "@/lib/constants";

export type LivePlatform = "youtube" | "zoom" | "meet" | "teams" | "other";

/** Detect where a live link points to, to show the right join button. */
export function livePlatform(url: string | null | undefined): LivePlatform | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (/(^|\.)youtube\.com$|^youtu\.be$|youtube-nocookie\.com$/.test(host)) return "youtube";
    if (/(^|\.)zoom\.us$/.test(host)) return "zoom";
    if (host === "meet.google.com") return "meet";
    if (/teams\.(microsoft|live)\.com$/.test(host)) return "teams";
    return "other";
  } catch {
    return null;
  }
}

/** "16:00" / "16:00:00" → "4:00 PM" */
export function formatClock(time: string | null | undefined): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** "16:00" + 120 → "18:00" */
export function addMinutesToClock(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = (h * 60 + m + minutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** "1h 30m" style length. */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`;
}

/** Days in Monday-first order. */
export const sortDays = (days: number[]) => WEEK_DAYS.filter((d) => days.includes(d));

/**
 * Human timetable, e.g. "Every Wed & Sat · 4:00 PM – 6:00 PM".
 * `dayNames` = 7 short names indexed by day number (0 = Sunday), `every` = translated "Every {days}".
 * Falls back to / appends the free-text `schedule` note.
 */
export function scheduleLabel(
  cls: { schedule_days?: number[] | null; start_time?: string | null; duration_minutes?: number | null; schedule?: string | null },
  dayNames: string[],
  every: (days: string) => string,
  and: string,
): string | null {
  const days = sortDays(cls.schedule_days ?? []);
  let auto: string | null = null;
  if (days.length) {
    const names = days.map((d) => dayNames[d] ?? String(d));
    const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} ${and} ${names[names.length - 1]}` : names[0];
    auto = every(list);
    if (cls.start_time) {
      const end = cls.duration_minutes ? ` – ${formatClock(addMinutesToClock(cls.start_time, cls.duration_minutes))}` : "";
      auto += ` · ${formatClock(cls.start_time)}${end}`;
    }
  }
  const note = cls.schedule?.trim() || null;
  return [auto, note].filter(Boolean).join(" · ") || null;
}
