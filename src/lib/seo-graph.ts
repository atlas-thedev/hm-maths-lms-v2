import type { SiteData } from "@/lib/site-data";
import type { Brand } from "@/lib/settings";
import type { Center } from "@/lib/centers";
import { absolute, centerSlug, SITE_URL } from "@/lib/seo";

/** schema.org graph shared by the home page and the center pages (same @ids, so Google sees one organisation). */
export function siteGraph(o: {
  brand: Brand; centers: Center[]; site: SiteData; description: string;
  faq?: { q: string; a: string }[];
  classes?: { id: string; title: string; description: string | null; fee: number; isFree: boolean }[];
  extra?: Record<string, unknown>[];
}) {
  const { brand, centers, site: SITE } = o;
  const phone = `+94${SITE.contact.phone.replace(/\D/g, "").replace(/^0/, "")}`;
  const sameAs = [SITE.social.youtube, SITE.social.facebook, SITE.social.tiktok, SITE.social.instagram].filter(Boolean);
  const org = `${SITE_URL}/#org`;
  return [
    { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: `${SITE_URL}/`, name: brand.name, inLanguage: ["si-LK", "en"], publisher: { "@id": org } },
    {
      "@type": ["EducationalOrganization", "LocalBusiness"], "@id": org, name: brand.name, alternateName: [`${brand.owner} Combined Maths`, `${brand.owner} A/L Combined Mathematics`],
      url: `${SITE_URL}/`, logo: { "@type": "ImageObject", url: absolute(brand.logo.image ?? "/icon-512.png"), width: 512, height: 512 },
      image: [absolute("/opengraph-image.jpg")], description: o.description, telephone: phone, priceRange: "LKR",
      sameAs, founder: { "@id": `${SITE_URL}/#teacher` },
      contactPoint: [{ "@type": "ContactPoint", telephone: phone, contactType: "customer support", areaServed: "LK", availableLanguage: ["Sinhala", "English"] }],
      areaServed: [{ "@type": "Country", name: "Sri Lanka" }, ...centers.map((c) => ({ "@type": "City", name: c.en }))],
      address: { "@type": "PostalAddress", addressLocality: centers[0]?.en ?? "Panadura", addressRegion: "Western Province", addressCountry: "LK" },
      location: centers.map((c) => ({
        "@type": "Place", name: `${brand.name} ${c.en}${c.venueEn ? ` (${c.venueEn})` : ""}`, url: `${SITE_URL}/combined-maths-classes/${centerSlug(c)}`,
        address: { "@type": "PostalAddress", addressLocality: c.en, addressCountry: "LK" },
        ...(c.lat !== null && c.lon !== null ? { geo: { "@type": "GeoCoordinates", latitude: c.lat, longitude: c.lon } } : {}),
      })),
      knowsAbout: ["Combined Mathematics", "G.C.E. Advanced Level", "Pure Mathematics", "Applied Mathematics", "A/L Mathematics past papers"],
    },
    {
      "@type": "Person", "@id": `${SITE_URL}/#teacher`, name: brand.owner, alternateName: "හසිත මධුසංක", jobTitle: "A/L Combined Mathematics Teacher",
      honorificSuffix: "B.Sc", worksFor: { "@id": org }, sameAs, image: absolute(SITE.youtube.avatar ?? "/images/hasitha-yt.webp"),
    },
    ...(o.classes ?? []).map((c) => ({
      "@type": "Course", name: c.title, description: c.description?.replace(/\s+/g, " ").slice(0, 300) || `${c.title}: G.C.E. A/L Combined Mathematics by ${brand.owner}.`,
      provider: { "@id": org }, educationalLevel: "G.C.E. Advanced Level", inLanguage: ["si", "en"], url: absolute(c.isFree ? "/dashboard/free-zone" : `/dashboard/store/class/${c.id}`),
      offers: { "@type": "Offer", category: c.isFree ? "Free" : "Paid", price: c.isFree ? 0 : c.fee, priceCurrency: "LKR", availability: "https://schema.org/InStock", url: absolute(`/dashboard/store/class/${c.id}`) },
    })),
    ...(o.faq?.length ? [{ "@type": "FAQPage", "@id": `${SITE_URL}/#faq`, mainEntity: o.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }] : []),
    ...(o.extra ?? []),
  ];
}
