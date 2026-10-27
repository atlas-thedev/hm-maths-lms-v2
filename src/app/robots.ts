import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: "*",
      // /api/ is private, except the public pictures (gallery, class banners) that search engines should be able to fetch
      allow: ["/", "/api/storage/public/"],
      disallow: ["/admin", "/dashboard", "/dev", "/api/", "/auth/", "/account-issue", "/maintenance"],
    }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
