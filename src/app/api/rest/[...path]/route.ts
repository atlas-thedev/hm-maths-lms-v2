import { type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifyJwt } from "@/lib/db/jwt";
import { loadUser } from "@/lib/db/core";

export const dynamic = "force-dynamic";
const REST = () => process.env.POSTGREST_URL || "http://127.0.0.1:3001";
const PASS_REQ = ["accept", "content-type", "prefer", "range", "range-unit", "accept-profile", "content-profile"];
const PASS_RES = ["content-type", "content-range", "preference-applied", "location"];

/** Same-origin proxy to PostgREST that attaches the user's session token (browser never sees it). */
async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const claims = await verifyJwt(token);
  const headers: Record<string, string> = {};
  for (const h of PASS_REQ) { const v = req.headers.get(h); if (v) headers[h] = v; }
  // Only a live session (not signed out, password unchanged) is forwarded; anything else is anonymous.
  if (claims?.role === "authenticated" && token && (await loadUser(claims))) headers.authorization = `Bearer ${token}`;
  const url = `${REST()}/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer();
  const res = await fetch(url, { method: req.method, headers, body, cache: "no-store" });
  const out = new Headers({ "cache-control": "no-store" });
  for (const h of PASS_RES) { const v = res.headers.get(h); if (v) out.set(h, v); }
  return new Response(res.body, { status: res.status, headers: out });
}
export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE, proxy as PUT };
