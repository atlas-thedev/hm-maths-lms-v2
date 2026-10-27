import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Sinhala, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import { NavProgress } from "@/components/nav-progress";
import { I18nProvider } from "@/i18n/client";
import { getLocale, getMessages, getT } from "@/i18n/server";
import { headers } from "next/headers";
import { getSession, isStaffRole } from "@/lib/auth";
import { getBrand, getBrandSettings, getCenters, getMaintenanceSettings, getThemeSettings } from "@/lib/settings";
import { centerKeywords } from "@/lib/seo";
import { iconVersion } from "@/lib/brand-icon";
import { themeCss } from "@/lib/theme";
import { MaintenanceScreen } from "@/components/maintenance-screen";
import "./globals.css";
import { BRAND } from "@/config/brand";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const sinhala = Noto_Sans_Sinhala({ subsets: ["sinhala"], weight: ["400", "500", "600", "700", "800"], variable: "--font-sinhala", display: "swap" });

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale, brand, brandSettings, centers] = await Promise.all([getT("common.meta"), getLocale(), getBrand(), getBrandSettings(), getCenters()]);
  const title = t("title");
  const iconV = iconVersion(brandSettings);
  const description = t("description");
  const keywords = [...(t.raw<string[]>("keywords") ?? []), ...centers.flatMap(centerKeywords)];
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: t("titleTemplate") },
    description,
    keywords,
    applicationName: brand.name,
    authors: [{ name: brand.owner, url: SITE_URL }],
    creator: brand.owner,
    publisher: brand.name,
    category: "education",
    formatDetection: { telephone: true, email: false, address: false },
    alternates: { canonical: "./" },   // every page names its own address as the canonical one
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
    openGraph: {
      type: "website",
      siteName: brand.name,
      title,
      description,
      url: "./",
      locale: locale === "si" ? "si_LK" : "en_US",
      alternateLocale: locale === "si" ? ["en_US"] : ["si_LK"],
    },
    twitter: { card: "summary_large_image", title, description },
    // Tab / Google / home-screen icons are made from the uploaded logo by src/app/brand-icon (the ?v= makes browsers reload them after a change).
    icons: {
      icon: [{ url: `/favicon.ico?v=${iconV}`, sizes: "48x48" }, { url: `/icon-192.png?v=${iconV}`, sizes: "192x192", type: "image/png" }],
      apple: [{ url: `/apple-touch-icon.png?v=${iconV}`, sizes: "180x180" }],
    },
    manifest: "/manifest.webmanifest",
    verification: {
      google: brandSettings.googleVerification || undefined,
      other: brandSettings.bingVerification ? { "msvalidate.01": brandSettings.bingVerification } : undefined,
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // lets the app use the full screen on notched phones; bars pad themselves with safe-area insets
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: BRAND.themeColor.light },
    { media: "(prefers-color-scheme: dark)", color: BRAND.themeColor.dark },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, messages, h, theme, maintenance] = await Promise.all([getLocale(), getMessages(), headers(), getThemeSettings(), getMaintenanceSettings()]);
  // Maintenance mode (Developer panel): visitors and students see the maintenance screen; staff keep working.
  // The sign-in page stays open so staff can log in.
  let blocked = false;
  if (maintenance.enabled) {
    const path = h.get("x-pathname") ?? "/";
    if (!path.startsWith("/login")) {
      const { profile } = await getSession();
      blocked = !isStaffRole(profile?.role);
    }
  }
  const css = themeCss(theme);
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>{css ? <style id="hm-theme" dangerouslySetInnerHTML={{ __html: css }} /> : null}</head>
      <body className={`${sans.variable} ${display.variable} ${sinhala.variable} min-h-dvh font-sans`}>
        <I18nProvider locale={locale} messages={messages}>
          <NavProgress />
          <Providers nonce={h.get("x-nonce") ?? undefined} defaultMode={theme.defaultMode} allowToggle={theme.allowToggle}>
            {blocked ? <MaintenanceScreen message={maintenance.message} until={maintenance.until} /> : children}
          </Providers>
        </I18nProvider>
      </body>
    </html>
  );
}
