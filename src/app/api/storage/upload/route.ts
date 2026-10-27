import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifyJwt } from "@/lib/db/jwt";
import { loadUser } from "@/lib/db/core";
import { bucketApi } from "@/lib/db/storage";

export const dynamic = "force-dynamic";

/** Uploads one file. Bucket limits + storage.objects RLS policies decide what is allowed. */
export async function POST(req: NextRequest) {
  const claims = await verifyJwt((await cookies()).get(SESSION_COOKIE)?.value);
  if (!claims || !(await loadUser(claims))) return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  const fd = await req.formData().catch(() => null);
  const bucket = String(fd?.get("bucket") ?? "");
  const path = String(fd?.get("path") ?? "");
  const file = fd?.get("file");
  if (!bucket || !path || !(file instanceof Blob)) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const { data, error } = await bucketApi(claims, bucket).upload(path, file, { contentType: file.type, upsert: fd?.get("upsert") === "1" });
  if (error) return NextResponse.json({ error: error.message }, { status: Number(error.statusCode) || 400 });
  return NextResponse.json({ path: data!.path });
}
