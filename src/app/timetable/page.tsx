import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { PublicShell } from "@/components/landing/public-shell";
import { TimetableView } from "@/components/landing/timetable-view";
import { getCenters, getSiteData } from "@/lib/settings";
import { getPublicTimetable } from "@/lib/timetable";
import { getT } from "@/i18n/server";
import { defaultOgImages, OG_IMAGE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT("landing.timetablePage");
  const title = t("title");
  const description = t("subtitle");
  return {
    title,
    description,
    alternates: { canonical: "/timetable" },
    openGraph: { type: "website", title, description, url: "/timetable", images: defaultOgImages(title) },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE_URL] },
  };
}

export default async function TimetablePage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const [entries, centers, siteData, t, sp] = await Promise.all([
    getPublicTimetable(),
    getCenters(),
    getSiteData(),
    getT("landing.timetablePage"),
    searchParams,
  ]);
  const initialYear = /^\d{4}$/.test(sp.year ?? "") ? Number(sp.year) : null;

  return (
    <PublicShell>
      <section className="relative overflow-hidden bg-landing-hero pb-20 pt-32 text-white sm:pb-24 sm:pt-40">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-brand-500/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-brand-600/15 blur-3xl" />
        <div className="container relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-brand-100 backdrop-blur-md">
            <CalendarDays className="h-3.5 w-3.5" /> {t("badge")}
          </span>
          <h1 className="mt-4 max-w-3xl font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
            {t("subtitle")}
          </p>
        </div>
      </section>

      <main className="container relative -mt-10 pb-20 sm:-mt-12">
        <TimetableView
          entries={entries}
          centers={centers}
          initialYear={initialYear}
          whatsappNumber={siteData.contact.whatsapp}
          phoneNumber={siteData.contact.phone}
        />
      </main>
    </PublicShell>
  );
}
