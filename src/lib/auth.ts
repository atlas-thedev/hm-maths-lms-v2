import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/db/server";
import type { Profile } from "@/lib/types";
import { safeNext } from "@/lib/security";

/** Cached per request: the signed-in user + profile (or nulls). */
export const getSession = cache(async () => {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { db, user: null, profile: null as Profile | null };
  const { data: profile } = await db.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return { db, user, profile: (profile as Profile | null) ?? null };
});

export async function requireUser() {
  const s = await getSession();
  if (!s.user) {
    // Keep the page the user was on so they come straight back after signing in.
    let back = "";
    try { const u = new URL((await headers()).get("referer") ?? ""); back = u.pathname + u.search; } catch { /* no referer */ }
    const safe = safeNext(back);
    redirect(safe && !safe.startsWith("/login") ? `/login?next=${encodeURIComponent(safe)}` : "/login");
  }
  // Signed in but no profile row → database script not run yet, or profile was deleted.
  if (!s.profile) redirect("/account-issue");
  return { db: s.db, user: s.user, profile: s.profile };
}

/** Roles, lowest to highest: student < admin < owner < developer. Each helper includes the roles above it. */
export const isStaffRole = (role?: string | null): boolean => role === "admin" || role === "owner" || role === "developer";
export const isOwnerRole = (role?: string | null): boolean => role === "owner" || role === "developer";
export const isDeveloperRole = (role?: string | null): boolean => role === "developer";

/**
 * Who may delete whose account (never your own):
 *   students → any admin, owner or developer · admins → owner, developer · owners and developers → developer.
 */
export function canDeleteAccount(actorRole?: string | null, targetRole?: string | null): boolean {
  if (!isStaffRole(actorRole)) return false;
  if (targetRole === "student") return true;
  if (targetRole === "admin") return isOwnerRole(actorRole);
  return isDeveloperRole(actorRole);
}

export async function requireAdmin() {
  const s = await requireUser();
  if (!isStaffRole(s.profile.role)) redirect("/dashboard");
  return s;
}

export async function requireOwner() {
  const s = await requireUser();
  if (!isOwnerRole(s.profile.role)) redirect(isStaffRole(s.profile.role) ? "/admin" : "/dashboard");
  return s;
}

export async function requireDeveloper() {
  const s = await requireUser();
  if (!isDeveloperRole(s.profile.role)) redirect(isStaffRole(s.profile.role) ? "/admin" : "/dashboard");
  return s;
}
