import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifyJwt } from "./jwt";

// Behind Nginx request.url carries the internal host (127.0.0.1:3000) — build the public URL
// from the forwarded headers instead (middleware responses need an absolute Location).
function redirectTo(request: NextRequest, location: string) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  const proto = (request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "")).split(",")[0].trim();
  return NextResponse.redirect(new URL(location, `${proto}://${host}`));
}

const dev = process.env.NODE_ENV !== "production";

/**
 * Per-request Content-Security-Policy with a script nonce (no 'unsafe-inline' for scripts).
 * Next.js reads the nonce from the request header and stamps it on its own scripts; 'strict-dynamic'
 * lets those trusted scripts load the YouTube IFrame API. Everything else is same-origin.
 */
function csp(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://i.ytimg.com https://img.youtube.com",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-src https://www.youtube-nocookie.com https://www.youtube.com",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // Not on plain-http setups (local tests): the browser would try https and every navigation would fail.
    ...(dev || process.env.COOKIE_INSECURE === "1" ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

function next(request: NextRequest) {
  // API routes set their own headers (files are served with a sandboxing CSP).
  if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.next();
  const nonce = btoa(crypto.randomUUID());
  const policy = csp(nonce);
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("x-pathname", request.nextUrl.pathname); // read by the root layout (maintenance mode)
  headers.set("content-security-policy", policy);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set("Content-Security-Policy", policy);
  return res;
}

const PROTECTED = ["/dashboard", "/admin", "/dev"];
const AUTH_PAGES = ["/login", "/register"];

/** Edge-safe gate: verifies the session token signature/expiry (no DB call, nothing to refresh). */
export async function updateSession(request: NextRequest) {
  const claims = await verifyJwt(request.cookies.get(SESSION_COOKIE)?.value);
  const signedIn = claims?.role === "authenticated" && !!claims.sub;
  const path = request.nextUrl.pathname;
  // Only redirect page loads. A server-action POST that gets redirected would be re-sent to
  // /login with the original action id → "Server Action was not found". The action's
  // requireUser()/requireAdmin() redirects to /login properly instead.
  const isPageLoad = request.method === "GET" || request.method === "HEAD";

  if (!signedIn && isPageLoad && PROTECTED.some((p) => path === p || path.startsWith(p + "/"))) {
    return redirectTo(request, `/login?next=${encodeURIComponent(path + request.nextUrl.search)}`);
  }
  if (signedIn && isPageLoad && AUTH_PAGES.includes(path)) {
    return redirectTo(request, "/dashboard");
  }
  return next(request);
}
