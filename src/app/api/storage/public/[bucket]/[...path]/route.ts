import { type NextRequest } from "next/server";
import { asService } from "@/lib/db/pg";
import { safeObjectPath } from "@/lib/db/storage";
import { serveFile } from "@/lib/db/serve-file";

/** Files in public buckets (class banners). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ bucket: string; path: string[] }> }) {
  const { bucket, path } = await params;
  const name = path.map(decodeURIComponent).join("/");
  const [b] = await asService(async (c) => (await c.query("select public from storage.buckets where id = $1", [bucket])).rows);
  if (!b?.public) return new Response("Not found", { status: 404 });
  const full = safeObjectPath(bucket, name);
  if (!full) return new Response("Bad request", { status: 400 });
  return serveFile(full, { cache: "public, max-age=86400" });
}
