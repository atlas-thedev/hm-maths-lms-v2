import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const TZ = "Asia/Colombo";

/** Current month in Sri Lanka time as "YYYY-MM". */
export function currentMonth(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit" }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  return `${y}-${m}`;
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Dates are always formatted with en-LK numerals; month names come from the i18n files (common.months). */
const dateLocale = (_locale?: string) => "en-LK";

/** "2026-10" → "October 2026". Pass `monthNames` (12 items, from common.months) to localise. */
export function formatMonth(month: string, monthNames?: string[]): string {
  const [y, m] = month.split("-").map(Number);
  const name = monthNames?.[m - 1];
  if (name) return `${name} ${y}`;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-LK", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function formatLKR(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  return `LKR ${n.toLocaleString("en-LK", { maximumFractionDigits: 0 })}`;
}

export function formatDateTime(iso: string | null | undefined, locale?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(dateLocale(locale), {
    timeZone: TZ, weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export function formatTime(iso: string | null | undefined, locale?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(dateLocale(locale), { timeZone: TZ, hour: "numeric", minute: "2-digit" });
}

export function formatDate(iso: string | null | undefined, locale?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(dateLocale(locale), { timeZone: TZ, day: "numeric", month: "short", year: "numeric" });
}

/** Convert a Sri Lanka local datetime-local value ("2026-10-06T18:30") to an ISO string. */
export function colomboLocalToISO(local: string | null | undefined): string | null {
  if (!local) return null;
  // Sri Lanka is UTC+05:30 with no DST.
  const d = new Date(`${local.length === 16 ? local + ":00" : local}+05:30`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO → "YYYY-MM-DDTHH:mm" in Sri Lanka time (for datetime-local inputs). */
export function isoToColomboLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 330 * 60 * 1000);
  return d.toISOString().slice(0, 16);
}

/** Old "HM-MATHS-2027-1234" (any spacing/dashes) → "20271234"; anything else unchanged. */
export function toStudentId(input: string): string {
  const m = input.trim().match(/^HM[\s-]*MATHS[\s-]*(\d{4})[\s-]*(\d{4})$/i);
  return m ? m[1] + m[2] : input.trim();
}

/** Normalise Sri Lankan mobile numbers to 07XXXXXXXX. Returns null if invalid. */
export function normalizeMobile(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  let local = digits;
  if (digits.startsWith("94") && digits.length === 11) local = "0" + digits.slice(2);
  else if (digits.length === 9 && digits.startsWith("7")) local = "0" + digits;
  return /^07\d{8}$/.test(local) ? local : null;
}

/** Old (9 digits + V/X) or new (12 digits) Sri Lankan NIC, or a birth-certificate number. */
export function normalizeNic(input: string): string | null {
  const v = input.trim().toUpperCase().replace(/\s/g, "");
  if (/^\d{9}[VX]$/.test(v) || /^\d{12}$/.test(v) || /^[A-Z0-9/-]{4,20}$/.test(v)) return v;
  return null;
}

export const STUDENT_EMAIL_DOMAIN = "students.hmmaths.lk";
export const mobileToEmail = (mobile: string) => `${mobile}@${STUDENT_EMAIL_DOMAIN}`;

export function whatsappLink(mobile: string | null | undefined, text: string): string | null {
  if (!mobile) return null;
  const n = normalizeMobile(mobile);
  if (!n) return null;
  return `https://wa.me/94${n.slice(1)}?text=${encodeURIComponent(text)}`;
}

export function initials(name: string | null | undefined) {
  return (name ?? "?").split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join("");
}

const MIME_EXT: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export function safeFileName(name: string, mime?: string) {
  const fromName = name.includes(".") ? name.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const ext = (mime && MIME_EXT[mime]) || (["pdf", "jpg", "jpeg", "png", "webp"].includes(fromName) ? fromName : "bin");
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}
