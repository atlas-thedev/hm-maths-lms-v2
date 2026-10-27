import "server-only";
import type { NextRequest } from "next/server";

/** Client IP (behind Cloudflare) and browser string, trimmed for logging. */
export const clientMeta = (req: NextRequest) => ({
  ip: (req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? "").trim().slice(0, 64) || null,
  ua: (req.headers.get("user-agent") ?? "").slice(0, 300) || null,
});
