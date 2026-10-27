import "server-only";
import { createHmac } from "node:crypto";
import { createUser, dataApi, setPassword } from "./core";
import { asService } from "./pg";

const b64 = (s: string | Buffer) => Buffer.from(s).toString("base64url");
/** Short-lived service_role token for PostgREST (signed synchronously with the shared JWT secret). */
function serviceToken() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("JWT_SECRET is not configured (min 32 chars)");
  const now = Math.floor(Date.now() / 1000);
  const data = `${b64(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${b64(JSON.stringify({ role: "service_role", iat: now, exp: now + 600 }))}`;
  return `${data}.${createHmac("sha256", secret).update(data).digest("base64url")}`;
}

/**
 * Service-role client. BYPASSES RLS — only call from server code AFTER verifying the caller
 * (e.g. requireAdmin()) or for tightly scoped operations such as student registration.
 */
export function createAdminClient() {
  return {
    ...dataApi(serviceToken(), { role: "service_role" }),
    auth: {
      admin: {
        async createUser(o: { email: string; password: string; email_confirm?: boolean; user_metadata?: Record<string, unknown> }) {
          const { user, error } = await createUser(o.email, o.password, o.user_metadata ?? {});
          return { data: { user }, error };
        },
        async updateUserById(id: string, o: { password?: string }) {
          const error = o.password ? await setPassword(id, o.password) : null;
          return { data: { user: null }, error };
        },
        async deleteUser(id: string) {
          await asService((c) => c.query("delete from auth.users where id = $1", [id]));
          return { data: null, error: null };
        },
      },
    },
  };
}
