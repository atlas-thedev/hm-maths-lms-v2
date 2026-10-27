/**
 * Minimal HS256 JWT sign/verify on Web Crypto — works in the Edge middleware and in Node.
 * The same secret is configured in PostgREST (jwt-secret), so a session token is also the
 * database credential: PostgREST switches to the token's `role` and RLS sees `sub` via auth.uid().
 */
export type Claims = { sub?: string; role: "anon" | "authenticated" | "service_role"; email?: string; sid?: string; iat?: number; exp?: number };

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64url = (s: string) => {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

let keyPromise: Promise<CryptoKey> | null = null;
function key() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("JWT_SECRET is not configured (min 32 chars)");
  keyPromise ??= crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  return keyPromise;
}

export async function signJwt(claims: Claims, ttlSeconds = 60 * 60 * 24 * 30): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const body = { iat: now, exp: now + ttlSeconds, ...claims };
  const head = b64url(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = b64url(enc.encode(JSON.stringify(body)));
  const sig = await crypto.subtle.sign("HMAC", await key(), enc.encode(`${head}.${payload}`));
  return `${head}.${payload}.${b64url(sig)}`;
}

export async function verifyJwt(token: string | undefined | null): Promise<Claims | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await key(), fromB64url(parts[2]), enc.encode(`${parts[0]}.${parts[1]}`));
    if (!ok) return null;
    const claims = JSON.parse(new TextDecoder().decode(fromB64url(parts[1]))) as Claims;
    if (claims.exp && claims.exp < Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}

/** HMAC signature for short-lived file links (hex). */
export async function hmacHex(data: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await key(), enc.encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export const SESSION_COOKIE = "hm_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days — "keep me signed in"
