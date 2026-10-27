import type { MetadataRoute } from "next";
import { getBrand, getBrandSettings } from "@/lib/settings";
import { iconVersion } from "@/lib/brand-icon";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const brand = await getBrand();
  const v = `?v=${iconVersion(await getBrandSettings())}`;
  return {
    name: brand.fullName,
    short_name: brand.name,
    description: brand.description,
    start_url: "/",
    display: "standalone",
    background_color: brand.appBackground,
    theme_color: brand.appBackground,
    icons: [
      { src: `/icon-192.png${v}`, sizes: "192x192", type: "image/png" },
      { src: `/icon-512.png${v}`, sizes: "512x512", type: "image/png" },
      { src: `/icon-512.png${v}`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
