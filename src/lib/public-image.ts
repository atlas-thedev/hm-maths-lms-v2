import "server-only";
import fs from "node:fs";
import path from "node:path";

/** Returns the public URL if the file exists in /public, else null (so optional photos can be dropped in later). */
export function publicImage(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  try {
    return fs.existsSync(path.join(process.cwd(), "public", url)) ? url : null;
  } catch {
    return null;
  }
}
