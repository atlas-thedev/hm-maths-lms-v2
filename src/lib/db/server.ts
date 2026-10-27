import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_MAX_AGE, verifyJwt } from "./jwt";
import { dataApi, loadUser, revokeSession, sessionToken, setPassword, verifyPassword, type AppUser } from "./core";

const cookieOpts = {
  httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: SESSION_MAX_AGE,
  secure: process.env.NODE_ENV === "production" && process.env.COOKIE_INSECURE !== "1",
};

/** Request-scoped client bound to the signed-in user's session cookie. All queries go through RLS. */
export async function createClient() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value ?? null;
  const claims = await verifyJwt(token);
  // Checked against the database up front (expired password / signed-out session → anonymous),
  // so no query in this request runs with a revoked token.
  let current: AppUser | null = claims?.role === "authenticated" ? await loadUser(claims) : null;
  const valid = current ? token : null;
  const setSession = (t: string | null) => {
    try {
      if (t) store.set(SESSION_COOKIE, t, cookieOpts);
      else store.set(SESSION_COOKIE, "", { ...cookieOpts, maxAge: 0 });
    } catch {
      // Server Components cannot set cookies — only actions/route handlers sign in or out.
    }
  };
  // Queries made after signIn/signOut in the same request use the new session.
  let api = dataApi(valid, valid ? claims : null);
  const useToken = async (t: string | null) => { api = dataApi(t, t ? await verifyJwt(t) : null); };

  return {
    from: ((...a: Parameters<typeof api.from>) => api.from(...a)) as typeof api.from,
    rpc: ((...a: Parameters<typeof api.rpc>) => api.rpc(...a)) as typeof api.rpc,
    storage: { from: (bucket: string) => api.storage.from(bucket) },
    auth: {
      async getUser() {
        return { data: { user: current }, error: current ? null : { message: "Auth session missing!" } };
      },
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        try {
          const user = await verifyPassword(email, password);
          if (!user) return { data: { user: null, session: null }, error: { message: "Invalid login credentials", code: "invalid_credentials", status: 400 } };
          const t = await sessionToken(user);
          setSession(t);
          await useToken(t);
          current = user;
          return { data: { user, session: { access_token: t } }, error: null };
        } catch (e) {
          return { data: { user: null, session: null }, error: { message: (e as Error).message, code: "service_error", status: 500 } };
        }
      },
      async updateUser({ password }: { password: string }) {
        const u = current ?? (valid ? await loadUser(claims) : null);
        if (!u) return { data: { user: null }, error: { message: "Auth session missing!" } };
        const err = await setPassword(u.id, password);
        if (err) return { data: { user: null }, error: err };
        // Sessions issued before the change are now invalid — issue a fresh one for this browser.
        await new Promise((r) => setTimeout(r, 1100));
        const t = await sessionToken(u);
        setSession(t);
        await useToken(t);
        return { data: { user: u }, error: null };
      },
      async signOut() {
        if (valid) await revokeSession(claims).catch(() => {});
        setSession(null);
        await useToken(null);
        current = null;
        return { error: null };
      },
    },
  };
}
