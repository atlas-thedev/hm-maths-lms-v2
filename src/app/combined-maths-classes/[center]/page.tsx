import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CenterPageBody } from "@/components/landing/center-page";
import { getSession } from "@/lib/auth";
import { centerLabel, centerVenue, type Center } from "@/lib/centers";
import { getBrand, getCenters, getSiteData } from "@/lib/settings";
import { siteGraph } from "@/lib/seo-graph";
import { absolute, centerKeywords, centerSlug, jsonLd, ONLINE_SLUG } from "@/lib/seo";
import { interpolate } from "@/i18n/translate";
import { getLocale, getT } from "@/i18n/server";
import type { ClassRow } from "@/lib/types";

async function resolve(slug: string): Promise<{ center: Center | null; centers: Center[]; online: boolean } | null> {
  const centers = await getCenters();
  if (slug === ONLINE_SLUG) return { center: null, centers, online: true };
  const center = centers.find((c) => centerSlug(c) === slug);
  return center ? { center, centers, online: false } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ center: string }> }): Promise<Metadata> {
  const { center: slug } = await params;
  const found = await resolve(slug);
  if (!found) return {};
  const [t, locale] = await Promise.all([getT("landing.seo"), getLocale()]);
  const town = found.center ? centerLabel(found.center, locale) : "";
  const title = found.center ? t("centerTitle", { town }) : t("onlineTitle");
  const description = found.center ? t("centerDesc", { town }) : t("onlineDesc");
  const url = `/combined-maths-classes/${slug}`;
  return {
    title, description, alternates: { canonical: url },
    keywords: found.center ? centerKeywords(found.center) : ["online combined maths class", "online A/L combined maths Sri Lanka", "ඔන්ලයින් සංයුක්ත ගණිත පන්ති"],
    openGraph: { title, description, url },
  };
}

export default async function CenterPage({ params }: { params: Promise<{ center: string }> }) {
  const { center: slug } = await params;
  const found = await resolve(slug);
  if (!found) notFound();
  const { center, centers, online } = found;
  const [{ db }, t, brand, locale, site] = await Promise.all([getSession(), getT("landing.seo"), getBrand(), getLocale(), getSiteData()]);
  const { data } = await db.from("classes").select("*").eq("is_active", true).eq("town", center ? center.key : "Online").order("target_year").order("title");
  const classes = (data ?? []) as ClassRow[];

  const town = center ? centerLabel(center, locale) : "";
  const venue = center ? centerVenue(center, locale) : "";
  const vars = { town, venue: venue ? ` (${venue})` : "" };
  const title = center ? t("centerTitle", vars) : t("onlineTitle");
  const description = center ? t("centerDesc", vars) : t("onlineDesc");
  const url = absolute(`/combined-maths-classes/${slug}`);
  const graph = siteGraph({
    brand, centers, site, description,
    faq: (t.raw<{ q: string; a: string }[]>("faq") ?? []).map((f) => ({ q: interpolate(f.q, vars), a: interpolate(f.a, vars) })),
    classes: classes.map((c) => ({ id: c.id, title: c.title, description: c.description, fee: Number(c.fee), isFree: c.is_free })),
    extra: [
      { "@type": "WebPage", name: title, url, description, isPartOf: { "@id": `${absolute("/")}#website` }, about: { "@id": `${absolute("/")}#org` }, inLanguage: locale === "si" ? "si-LK" : "en" },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: brand.name, item: absolute("/") },
        { "@type": "ListItem", position: 2, name: t("hubTitle"), item: absolute("/combined-maths-classes") },
        { "@type": "ListItem", position: 3, name: center ? town : t("online"), item: url },
      ] },
    ],
  });
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({ "@context": "https://schema.org", "@graph": graph }) }} />
      <CenterPageBody center={center} centers={centers} classes={classes} online={online} />
    </>
  );
}
