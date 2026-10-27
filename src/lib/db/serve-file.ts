import "server-only";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";

const TYPES: Record<string, string> = {
  ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export async function serveFile(full: string, opts: { download?: boolean; cache: string; type?: string }) {
  let size = 0;
  try { const s = await stat(full); if (!s.isFile()) throw new Error(); size = s.size; } catch {
    return new Response("Not found", { status: 404 });
  }
  const name = path.basename(full);
  const known = TYPES[path.extname(full).toLowerCase()];
  const type = known ?? "application/octet-stream";
  const download = opts.download || !known; // anything unexpected is only ever downloaded, never rendered
  const stream = Readable.toWeb(createReadStream(full)) as ReadableStream;
  return new Response(stream, {
    headers: {
      "content-type": type,
      "content-length": String(size),
      "cache-control": opts.cache,
      "x-content-type-options": "nosniff",
      // Files can never run script on our origin (images are sandboxed; PDFs open in the browser's viewer).
      ...(type === "application/pdf" ? { "content-security-policy": "default-src 'none'; object-src 'none'; frame-ancestors 'self'" }
        : { "content-security-policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox" }),
      "cross-origin-resource-policy": "same-origin",
      "content-disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(name)}`,
    },
  });
}
