import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getBrandSettings } from "@/lib/settings";
import { safeObjectPath } from "@/lib/db/storage";

/**
 * The browser-tab icon, home-screen icons and Google's icon, made from the logo uploaded in Developer panel → Brand
 * (with the built-in mark when there is none). next.config.ts rewrites /favicon.ico, /icon-192.png, /icon-512.png and
 * /apple-touch-icon.png here.
 */
const FILES: Record<string, { size: number; type: "ico" | "png"; apple?: boolean; fallback: string }> = {
  "favicon.ico": { size: 48, type: "ico", fallback: "default-favicon.ico" },
  "icon-192.png": { size: 192, type: "png", fallback: "default-192.png" },
  "icon-512.png": { size: 512, type: "png", fallback: "default-512.png" },
  "apple-touch-icon.png": { size: 180, type: "png", apple: true, fallback: "default-apple.png" },
};
const CACHE = "public, max-age=3600";

async function readLogo(url: string): Promise<Buffer | null> {
  try {
    const m = /^\/api\/storage\/public\/([^/]+)\/(.+)$/.exec(url);
    if (m) { const full = safeObjectPath(m[1], decodeURIComponent(m[2])); return full ? await readFile(full) : null; }
    if (url.startsWith("https://")) { const r = await fetch(url, { signal: AbortSignal.timeout(5000) }); return r.ok ? Buffer.from(await r.arrayBuffer()) : null; }
  } catch { /* fall through to the built-in icon */ }
  return null;
}

/** A PNG wrapped in an .ico container (what /favicon.ico has to be for Google and old browsers). */
function ico(png: Buffer, size: number) {
  const head = Buffer.alloc(22);
  head.writeUInt16LE(1, 2); head.writeUInt16LE(1, 4);
  head[6] = size; head[7] = size; head.writeUInt16LE(1, 10); head.writeUInt16LE(32, 12);
  head.writeUInt32LE(png.length, 14); head.writeUInt32LE(22, 18);
  return Buffer.concat([head, png]);
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const spec = FILES[(await params).file];
  if (!spec) return new Response("Not found", { status: 404 });
  const brand = await getBrandSettings();
  const source = brand.logoUrl ? await readLogo(brand.logoOnTile && brand.logoDarkUrl ? brand.logoDarkUrl : brand.logoUrl) : null;
  if (!source) {
    const buf = await readFile(path.join(process.cwd(), "public/brand", spec.fallback));
    return new Response(new Uint8Array(buf), { headers: { "content-type": spec.type === "ico" ? "image/x-icon" : "image/png", "cache-control": CACHE } });
  }
  const { size } = spec;
  const pad = brand.logoOnTile ? Math.round(size * 0.18) : spec.apple ? Math.round(size * 0.1) : 0;
  const inner = await sharp(source).resize(size - pad * 2, size - pad * 2, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const base = sharp({ create: { width: size, height: size, channels: 4, background: brand.logoOnTile ? "#111214" : spec.apple ? "#ffffff" : { r: 0, g: 0, b: 0, alpha: 0 } } });
  const png = await base.composite([{ input: inner, gravity: "centre" }]).png().toBuffer();
  const body = spec.type === "ico" ? ico(png, size) : png;
  return new Response(new Uint8Array(body), { headers: { "content-type": spec.type === "ico" ? "image/x-icon" : "image/png", "cache-control": CACHE } });
}
