import "server-only";
import { RestClient } from "./rest";
import { asService } from "./pg";
import { bucketApi } from "./storage";
import { signJwt, type Claims } from "./jwt";

/** The user fields the app needs from auth.users. */
export type AppUser = { id: string; email: string; user_metadata: Record<string, unknown>; created_at?: string };
type AuthErr = { message: string; code?: string; status?: number };

const REST_URL = () => process.env.POSTGREST_URL || "http://127.0.0.1:3001";
const noStoreFetch: typeof fetch = (input, init) => fetch(input, { ...init, cache: "no-store" });

export function restClient(token: string | null) {
  return new RestClient(REST_URL(), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    fetch: noStoreFetch,
  });
}

const toUser = (r: { id: string; email: string; raw_user_meta_data: Record<string, unknown>; created_at?: Date }): AppUser =>
  ({ id: r.id, email: r.email, user_metadata: r.raw_user_meta_data ?? {}, created_at: r.created_at?.toISOString() });

/** Checks email + password against auth.users (bcrypt via pgcrypto). */
export async function verifyPassword(email: string, password: string): Promise<AppUser | null> {
  const rows = await asService(async (c) => (await c.query(
    `update auth.users set last_sign_in_at = now()
       where lower(email) = lower($1) and encrypted_password = extensions.crypt($2, encrypted_password)
     returning id, email, raw_user_meta_data, created_at`, [email.trim(), password])).rows);
  return rows[0] ? toUser(rows[0]) : null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Loads a user for a session token. Rejects tokens issued before the last password change and
 * tokens whose session was signed out (auth.sessions.revoked_at). Tokens from before sessions
 * existed carry no "sid"; they are still accepted until they expire.
 */
export async function loadUser(claims: Claims | null): Promise<AppUser | null> {
  if (!claims?.sub || claims.role !== "authenticated" || !UUID_RE.test(claims.sub)) return null;
  if (claims.sid !== undefined && !UUID_RE.test(claims.sid)) return null;
  const sid = claims.sid ?? null;
  const rows = await asService(async (c) => (await c.query(
    `select u.id, u.email, u.raw_user_meta_data, u.created_at, extract(epoch from u.password_changed_at)::bigint as pwd,
            s.id as session_id, s.revoked_at, s.last_seen_at < now() - interval '15 minutes' as stale
       from auth.users u left join auth.sessions s on s.id = $2::uuid and s.user_id = u.id
      where u.id = $1`, [claims.sub, sid])).rows);
  const r = rows[0];
  if (!r) return null;
  if (claims.iat && Number(r.pwd) > claims.iat + 1) return null;
  if (sid) {
    if (!r.session_id || r.revoked_at) return null;
    if (r.stale) await asService((c) => c.query("update auth.sessions set last_seen_at = now() where id = $1", [sid]));
  }
  return toUser(r);
}

/** Signs out one session (logout). */
export async function revokeSession(claims: Claims | null) {
  if (!claims?.sid || !UUID_RE.test(claims.sid)) return;
  await asService((c) => c.query("update auth.sessions set revoked_at = now() where id = $1 and revoked_at is null", [claims.sid]));
}

export async function setPassword(userId: string, password: string): Promise<AuthErr | null> {
  if (password.length < 6) return { message: "Password should be at least 6 characters" };
  const n = await asService(async (c) => (await c.query(
    `update auth.users set encrypted_password = extensions.crypt($2, extensions.gen_salt('bf')),
       password_changed_at = now(), updated_at = now() where id = $1`, [userId, password])).rowCount);
  if (!n) return { message: "User not found" };
  // A new password signs out every existing session (all devices).
  await asService((c) => c.query("update auth.sessions set revoked_at = now() where user_id = $1 and revoked_at is null", [userId]));
  return null;
}

export async function createUser(email: string, password: string, meta: Record<string, unknown>): Promise<{ user: AppUser | null; error: AuthErr | null }> {
  try {
    const rows = await asService(async (c) => (await c.query(
      `insert into auth.users (email, encrypted_password, raw_user_meta_data)
       values (lower($1), extensions.crypt($2, extensions.gen_salt('bf')), $3)
       returning id, email, raw_user_meta_data, created_at`, [email.trim(), password, JSON.stringify(meta ?? {})])).rows);
    return { user: toUser(rows[0]), error: null };
  } catch (e) {
    const err = e as { code?: string; message: string };
    if (err.code === "23505") return { user: null, error: { message: "A user with this email address has already been registered", code: "email_exists" } };
    return { user: null, error: { message: err.message } };
  }
}

/** New login: records a session row and signs a token that points at it. */
export async function sessionToken(u: AppUser) {
  const sid = await asService(async (c) => (await c.query(
    "insert into auth.sessions (user_id) values ($1) returning id", [u.id])).rows[0].id as string);
  return signJwt({ sub: u.id, role: "authenticated", email: u.email, sid });
}

/** Shared shape of the server clients: table queries, rpc and file buckets. */
export function dataApi(token: string | null, claims: Claims | null) {
  const rest = restClient(token);
  return {
    from: rest.from.bind(rest),
    rpc: rest.rpc.bind(rest),
    storage: { from: (bucket: string) => bucketApi(claims, bucket) },
  };
}
