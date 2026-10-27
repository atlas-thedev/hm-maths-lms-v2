import { MESSAGES } from "@/i18n/messages";
import type { Locale } from "@/i18n/config";

/** Namespaces whose text can be edited from the Developer panel (staff screens and error messages stay as written). */
export const EDITABLE_NS = ["landing", "common", "auth", "portal"] as const;
export type EditableNs = (typeof EDITABLE_NS)[number];

export interface TextEntry { path: string; def: string }

function flat(node: unknown, prefix: string, out: TextEntry[]) {
  if (typeof node === "string") { out.push({ path: prefix, def: node }); return; }
  if (Array.isArray(node)) { node.forEach((v, i) => flat(v, `${prefix}.${i}`, out)); return; }
  if (node && typeof node === "object") for (const [k, v] of Object.entries(node as Record<string, unknown>)) flat(v, prefix ? `${prefix}.${k}` : k, out);
}

const cache: Partial<Record<Locale, TextEntry[]>> = {};
/** Every editable string of one language with its built-in default. */
export function allTextEntries(locale: Locale): TextEntry[] {
  if (cache[locale]) return cache[locale]!;
  const out: TextEntry[] = [];
  for (const ns of EDITABLE_NS) flat((MESSAGES[locale] as Record<string, unknown>)[ns], ns, out);
  // the keyword lists are strings in a list → one comma-separated entry each (see build-messages setPath)
  return (cache[locale] = out.filter((e) => !/\.towns\.|\.centers\.items\.|^common\.meta\.keywords\.\d+$/.test(e.path)));
}

export const defaultFor = (locale: Locale, path: string) => allTextEntries(locale).find((e) => e.path === path)?.def;

/** {name} placeholders a replacement must keep ({centers…} tokens may be dropped: they are conveniences). */
export const requiredVars = (def: string) => [...def.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((v) => !v.startsWith("centers") && v !== "centerCount");
export const missingVars = (def: string, next: string) => requiredVars(def).filter((v) => !next.includes(`{${v}}`));
