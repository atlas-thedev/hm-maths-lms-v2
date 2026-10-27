import { requireDeveloper } from "@/lib/auth";
import { getBrandSettings, getSiteText } from "@/lib/settings";
import { defaultFor } from "@/lib/site-text";
import { MESSAGES } from "@/i18n/messages";
import { PageHeader } from "@/components/ui";
import { publicImage } from "@/lib/public-image";
import { SITE } from "@/content/site";
import { SITE_URL } from "@/lib/seo";
import { BrandForm, SeoForm } from "./brand-forms";

export const metadata = { title: "Brand & SEO" };
export const dynamic = "force-dynamic";

const keywordsOf = (l: "en" | "si") => ((MESSAGES[l].common as { meta: { keywords: string[] } }).meta.keywords ?? []).join(", ");

export default async function DevBrandPage() {
  await requireDeveloper();
  const [brand, text] = await Promise.all([getBrandSettings(), getSiteText()]);
  const seo = (l: "en" | "si") => ({
    title: text[l]["common.meta.title"] ?? defaultFor(l, "common.meta.title") ?? "",
    description: text[l]["common.meta.description"] ?? defaultFor(l, "common.meta.description") ?? "",
    keywords: text[l]["common.meta.keywords"] ?? keywordsOf(l),
  });
  return (
    <div className="space-y-8">
      <PageHeader title="Brand & SEO" sticker="cool-ducks" description="The site's name, logo and home-page pictures, and how it looks on Google. Changes are live on the next page load." />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <BrandForm initial={brand} builtIn={{ teacher: publicImage(SITE.teacherImage) ?? SITE.youtube.avatar ?? null, hero: "/images/hasitha-hero.webp", group: publicImage(SITE.galleryImage) }} />
        <SeoForm en={seo("en")} si={seo("si")} brand={brand.name} url={SITE_URL.replace(/^https?:\/\//, "")} />
      </div>
    </div>
  );
}
