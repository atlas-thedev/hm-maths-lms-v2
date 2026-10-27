import "server-only";
import { Pool, type PoolClient } from "pg";
import type { Claims } from "./jwt";

const g = globalThis as unknown as { __hmPool?: Pool };
export function pool() {
  g.__hmPool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 10, idleTimeoutMillis: 30_000 });
  return g.__hmPool;
}

/**
 * Runs `fn` inside a transaction as the given database role with the JWT claims applied,
 * exactly like PostgREST does — so every RLS policy (incl. storage.objects) is enforced.
 */
export async function asRole<T>(claims: Claims | null, fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await pool().connect();
  const role = claims?.role ?? "anon";
  try {
    await c.query("begin");
    await c.query(`set local role ${role === "service_role" ? "service_role" : role === "authenticated" ? "authenticated" : "anon"}`);
    await c.query("select set_config('request.jwt.claims', $1, true), set_config('request.jwt.claim.sub', $2, true)",
      [JSON.stringify(claims ?? { role: "anon" }), claims?.sub ?? ""]);
    const out = await fn(c);
    await c.query("commit");
    return out;
  } catch (e) {
    await c.query("rollback").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

export const asService = <T>(fn: (c: PoolClient) => Promise<T>) => asRole({ role: "service_role" }, fn);
