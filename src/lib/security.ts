import "server-only";
import { headers } from "next/headers";

/** Only same-site relative paths ("/x"). Rejects "//evil", "/\evil", schemes and control characters. */
export function safeNext(next: string | null | undefined): string | null {
  const v = String(next ?? "");
  if (!/^\/(?![/\\])/.test(v) || /[\u0000-\u001f\\]/.test(v) || v.length > 500) return null;
  return v;
}

/** Real client IP. Nginx resolves it from Cloudflare's CF-Connecting-IP (trusted only from Cloudflare ranges) into X-Real-IP. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip") || "unknown";
}

/**
 * In-memory fixed-window rate limiter (single Node process on the VPS).
 * Returns true when the call is allowed.
 */
const buckets = new Map<string, { n: number; reset: number }>();
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size > 50_000) for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k);
  const b = buckets.get(key);
  if (!b || b.reset < now) { buckets.set(key, { n: 1, reset: now + windowMs }); return true; }
  b.n += 1;
  return b.n <= max;
}
