import type { Metadata } from "next";
import { CenterPageBody } from "@/components/landing/center-page";
import { getBrand, getCenters, getSiteData } from "@/lib/settings";
import { siteGraph } from "@/lib/seo-graph";
import { absolute, centerKeywords, centerSlug, jsonLd } from "@/lib/seo";
import { getLocale, getT } from "@/i18n/server";
import { centerLabel } from "@/lib/centers";

export async function generateMetadata(): Promise<Metadata> {
  const [t, centers] = await Promise.all([getT("landing.seo"), getCenters()]);
  return {
    title: t("hubTitle"), description: t("hubDesc"), keywords: centers.flatMap(centerKeywords),
    alternates: { canonical: "/combined-maths-classes" },
    openGraph: { title: t("hubTitle"), description: t("hubDesc"), url: "/combined-maths-classes" },
  };
}

export default async function CombinedMathsHub() {
  const [t, brand, centers, locale, site] = await Promise.all([getT("landing.seo"), getBrand(), getCenters(), getLocale(), getSiteData()]);
  const graph = siteGraph({
    brand, centers, site, description: t("hubDesc"),
    extra: [
      { "@type": "CollectionPage", name: t("hubTitle"), url: absolute("/combined-maths-classes"), description: t("hubDesc"), isPartOf: { "@id": `${absolute("/")}#website` } },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: brand.name, item: absolute("/") }, { "@type": "ListItem", position: 2, name: t("hubTitle"), item: absolute("/combined-maths-classes") }] },
      { "@type": "ItemList", name: t("hubTitle"), itemListElement: centers.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: centerLabel(c, locale), url: absolute(`/combined-maths-classes/${centerSlug(c)}`) })) },
    ],
  });
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({ "@context": "https://schema.org", "@graph": graph }) }} />
      <CenterPageBody center={null} centers={centers} classes={[]} />
    </>
  );
}
