"use client";
import { createContext, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, type Locale } from "./config";
import { makeT, type Messages } from "./translate";
import { DEFAULT_SITE_DATA, type SiteData } from "@/lib/site-data";

const Ctx = createContext<{ locale: Locale; messages: Messages } | null>(null);

export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: Messages; children: React.ReactNode }) {
  return <Ctx.Provider value={{ locale, messages }}>{children}</Ctx.Provider>;
}

export function useLocale() {
  return useContext(Ctx)?.locale ?? DEFAULT_LOCALE;
}

/** Client-side translator. `const t = useT("auth"); t("login.title")` */
export function useT(ns?: string) {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useT must be used inside <I18nProvider>");
  return useMemo(() => makeT(ctx.messages, ns), [ctx.messages, ns]);
}

/** Brand name / logo chosen in the Developer panel (delivered with the translations). */
export function useBrand() {
  const b = (useContext(Ctx)?.messages.__brand ?? {}) as { name?: string; fullName?: string; owner?: string; logoUrl?: string; logoDarkUrl?: string; logoOnTile?: boolean };
  return { name: b.name ?? "HM Maths", fullName: b.fullName ?? "HM Maths", owner: b.owner ?? "", logoUrl: b.logoUrl || null, logoDarkUrl: b.logoDarkUrl || null, logoOnTile: b.logoOnTile ?? false };
}

/** Keys of every center a student or class can belong to ("Online" last). Comes from the Developer panel → Centers. */
export function useTownKeys(): string[] {
  const towns = (useContext(Ctx)?.messages.common as { towns?: Record<string, string> } | undefined)?.towns ?? {};
  return Object.keys(towns);
}

/** Contact details, social links, channels, bank accounts and featured videos (Developer panel → Contact & links). */
export function useSite(): SiteData {
  return (useContext(Ctx)?.messages.__site as SiteData | undefined) ?? DEFAULT_SITE_DATA;
}
