import { type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { hmacHex } from "@/lib/db/jwt";
import { safeObjectPath } from "@/lib/db/storage";
import { serveFile } from "@/lib/db/serve-file";

export const dynamic = "force-dynamic";

/** Private file download via a short-lived signed link (created only after an RLS check). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ bucket: string; path: string[] }> }) {
  const { bucket, path } = await params;
  const name = path.map(decodeURIComponent).join("/");
  const exp = Number(req.nextUrl.searchParams.get("exp"));
  const sig = req.nextUrl.searchParams.get("sig") ?? "";
  if (!exp || exp < Date.now() / 1000) return new Response("Link expired", { status: 403 });
  const expect = await hmacHex(`${bucket}/${name}:${exp}`);
  if (sig.length !== expect.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return new Response("Forbidden", { status: 403 });
  const full = safeObjectPath(bucket, name);
  if (!full) return new Response("Bad request", { status: 400 });
  return serveFile(full, { download: req.nextUrl.searchParams.get("download") === "1", cache: "private, max-age=60" });
}
