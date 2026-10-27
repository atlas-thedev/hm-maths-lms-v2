import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifyJwt } from "@/lib/db/jwt";
import { revokeSession } from "@/lib/db/core";

/** Signs the user out (revokes the session + clears the cookie) with a plain 303 to the home page. */
async function logout(req: NextRequest) {
  await revokeSession(await verifyJwt(req.cookies.get(SESSION_COOKIE)?.value)).catch(() => {});
  const response = new NextResponse(null, { status: 303, headers: { Location: "/", "Cache-Control": "no-store" } });
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
export const POST = logout;
export const GET = logout;
