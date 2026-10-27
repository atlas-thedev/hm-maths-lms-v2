export const LOCALES = ["en", "si"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "si";
export const LOCALE_COOKIE = "hm_locale";
export const LOCALE_LABELS: Record<Locale, string> = { en: "English", si: "සිංහල" };
export const isLocale = (v: unknown): v is Locale => typeof v === "string" && (LOCALES as readonly string[]).includes(v);
