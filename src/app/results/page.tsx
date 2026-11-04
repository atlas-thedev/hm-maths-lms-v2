import { PublicShell } from "@/components/landing/public-shell";
import { ResultsBoard } from "@/components/landing/results-board";
import { getLocale, getT } from "@/i18n/server";
import { getBrand, getSiteData, getTopResults } from "@/lib/settings";
import { jsonLd } from "@/lib/seo";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const [t, s, brand] = await Promise.all([getT("landing"), getTopResults(), getBrand()]);
  const title = t("resultsPage.metaTitle");
  const description = t("resultsPage.metaDescription", { brand: brand.name, count: s.results.filter((r) => r.enabled).length });
  return {
    title, description,
    alternates: { canonical: "/results" },
    openGraph: { type: "website", title, description, url: "/results" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ResultsPage() {
  const [locale, settings, brand, SITEDATA, t] = await Promise.all([
    getLocale(), getTopResults(), getBrand(), getSiteData(), getT("landing"),
  ]);
  // Structured data so the results can appear as a list in Google.
  const published = settings.results.filter((r) => r.enabled && r.name);
  const graph = published.length
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: t("resultsPage.metaTitle"),
        numberOfItems: published.length,
        itemListElement: published.slice(0, 50).map((r, i) => ({
          "@type": "ListItem", position: i + 1,
          item: {
            "@type": "Person", name: r.name,
            description: [r.year, r.district, r.grade].filter(Boolean).join(" · "),
            url: `${SITE_URL}/results`,
          },
        })),
      }
    : null;

  return (
    <PublicShell>
      {graph ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(graph) }} /> : null}
      <ResultsBoard settings={settings} locale={locale} whatsapp={SITEDATA.contact.whatsapp} brandName={brand.name} />
    </PublicShell>
  );
}
