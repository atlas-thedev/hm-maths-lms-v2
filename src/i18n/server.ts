import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import { buildMessages } from "./build-messages";
import { getBrand, getCenters, getFaqs, getSiteData, getSiteText } from "@/lib/settings";
import { makeT } from "./translate";
import { formatDate, formatDateTime, formatMonth, formatTime } from "@/lib/utils";
import { scheduleLabel } from "@/lib/schedule";

export const getLocale = cache(async (): Promise<Locale> => {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(c)) return c;
  const accept = (await headers()).get("accept-language");
  if (!accept) return "en";   // crawlers and link previews send no language: give them English (the page titles carry Sinhala keywords too)
  return /^si\b/i.test(accept) ? "si" : DEFAULT_LOCALE;
});

/** Translations with the Developer-panel changes applied (site text, brand name, centers). Cached per request by getT / layout. */
export const getMessages = cache(async () => {
  const locale = await getLocale();
  const [brand, centers, text, site, faqs] = await Promise.all([getBrand(), getCenters(), getSiteText(), getSiteData(), getFaqs()]);
  return buildMessages(locale, {
    brand: { name: brand.name, fullName: brand.fullName, owner: brand.owner, logoUrl: brand.logo.image ?? "", logoDarkUrl: brand.logo.dark ?? "", logoOnTile: brand.logo.onTile },
    centers, site, overrides: text[locale], onlineLabel: { en: "Online", si: "ඔන්ලයින්" }, faqs,
  });
});

/** Server-side translator. `const t = await getT("portal"); t("dashboard.title")` */
export async function getT(ns?: string) {
  return makeT(await getMessages(), ns);
}

/** Locale-aware date formatters for server components. */
export async function getFormat() {
  const locale = await getLocale();
  const months = (await getT("common")).raw<string[]>("months");
  return {
    locale,
    month: (m: string) => formatMonth(m, months),
    dateTime: (iso: string | null | undefined) => formatDateTime(iso, locale),
    date: (iso: string | null | undefined) => formatDate(iso, locale),
    time: (iso: string | null | undefined) => formatTime(iso, locale),
  };
}

/** Translated weekly timetable label for a class ("Every Wed · 4:00 PM – 6:00 PM"). */
export async function getScheduleLabel() {
  const t = await getT("common.schedule");
  const days = t.raw<string[]>("days") ?? [];
  return (cls: Parameters<typeof scheduleLabel>[0]) => scheduleLabel(cls, days, (d) => t("every", { days: d }), t("and"));
}
