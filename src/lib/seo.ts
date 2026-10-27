import type { Center } from "@/lib/centers";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** URL slug of a center: "Nugegoda" → "nugegoda". */
export const centerSlug = (c: Pick<Center, "key">) => c.key.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const ONLINE_SLUG = "online";

export const absolute = (path: string) => (/^https?:\/\//.test(path) ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`);

/** Escapes a JSON-LD blob for safe use inside <script type="application/ld+json">. */
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");

/** Search phrases for one center, in English and Sinhala. */
export function centerKeywords(c: Center): string[] {
  return [
    `combined maths class ${c.en}`, `A/L combined maths ${c.en}`, `combined maths tuition ${c.en}`, `Hasitha Madusanka ${c.en}`,
    `${c.si} සංයුක්ත ගණිත පන්ති`, `${c.si} උසස් පෙළ සංයුක්ත ගණිතය`,
  ];
}
