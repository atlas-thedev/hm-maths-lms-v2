"use server";

import { revalidatePath } from "next/cache";
import { requireDeveloper } from "@/lib/auth";
import { createAdminClient } from "@/lib/db/admin";
import { asService } from "@/lib/db/pg";
import {
  recordAuditLog, saveAccessSettings, saveAnnouncementSettings, saveMaintenanceSettings, saveThemeSettings,
  type AnnouncementSettings,
} from "@/lib/settings";
import { DEFAULT_THEME, normalizeTheme } from "@/lib/theme";
import type { ActionState } from "@/lib/types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const on = (fd: FormData, k: string) => ["on", "true", "1"].includes(String(fd.get(k) ?? ""));

async function log(summary: string, details: Record<string, unknown> = {}) {
  const { user, profile } = await requireDeveloper();
  await recordAuditLog({ actorId: user.id, actorName: profile.full_name, actorRole: profile.role, category: "settings", action: "settings_changed", summary, details });
}

/** Everything (all pages, every visitor) picks up the change on the next page load. */
const refreshAll = () => revalidatePath("/", "layout");

// ─── Theme ───
export async function saveThemeAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireDeveloper();
  const theme = normalizeTheme({
    brand: str(fd, "brand").toLowerCase(),
    radius: Number(str(fd, "radius")),
    defaultMode: str(fd, "defaultMode"),
    allowToggle: on(fd, "allowToggle"),
    buttons: str(fd, "buttons"),
  });
  await saveThemeSettings(theme, user.id);
  await log(`Theme → ${theme.brand} · ${theme.buttons} buttons · radius ${theme.radius} · ${theme.defaultMode}${theme.allowToggle ? "" : " (locked)"}`, { ...theme });
  refreshAll();
  return { ok: true, message: "Theme saved, every page now uses it." };
}

export async function resetThemeAction(): Promise<ActionState> {
  const { user } = await requireDeveloper();
  await saveThemeSettings(DEFAULT_THEME, user.id);
  await log("Theme reset to the built-in HM orange");
  refreshAll();
  return { ok: true, message: "Theme reset to default." };
}

// ─── Site controls ───
export async function saveMaintenanceAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireDeveloper();
  const until = str(fd, "until");
  const next = { enabled: on(fd, "enabled"), message: str(fd, "message").slice(0, 600), until: until ? new Date(until).toISOString() : "" };
  if (until && Number.isNaN(Date.parse(until))) return { error: "That date/time isn't valid." };
  await saveMaintenanceSettings(next, user.id);
  await log(`Maintenance mode ${next.enabled ? "ON" : "off"}`, { ...next });
  refreshAll();
  return { ok: true, message: next.enabled ? "Maintenance mode is ON, students now see the maintenance screen." : "Maintenance mode is off." };
}

export async function saveAnnouncementAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireDeveloper();
  const link = str(fd, "link");
  if (link && !link.startsWith("/") && !/^https?:\/\//.test(link)) return { error: "Link must start with / or https://" };
  const tone = str(fd, "tone") as AnnouncementSettings["tone"];
  const audience = str(fd, "audience") as AnnouncementSettings["audience"];
  const next: AnnouncementSettings = {
    enabled: on(fd, "enabled"), text: str(fd, "text").slice(0, 300), link,
    tone: ["info", "success", "warning", "danger", "brand"].includes(tone) ? tone : "info",
    audience: audience === "students" || audience === "staff" ? audience : "all",
  };
  if (next.enabled && !next.text) return { error: "Write the announcement text first." };
  await saveAnnouncementSettings(next, user.id);
  await log(`Announcement ${next.enabled ? `ON: "${next.text}"` : "off"}`, { ...next });
  refreshAll();
  return { ok: true, message: next.enabled ? "Announcement is live." : "Announcement hidden." };
}

export async function saveAccessAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireDeveloper();
  const next = { registrationOpen: on(fd, "registrationOpen"), registrationClosedMessage: str(fd, "registrationClosedMessage").slice(0, 400) };
  await saveAccessSettings(next, user.id);
  await log(`Sign-ups ${next.registrationOpen ? "open" : "closed"}`, { ...next });
  refreshAll();
  return { ok: true, message: next.registrationOpen ? "Sign-ups are open." : "Sign-ups are closed." };
}

// ─── Users & sessions ───
export async function signOutAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireDeveloper();
  const scope = str(fd, "scope");
  const roleFilter = scope === "students" ? "and p.role = 'student'" : "";
  const n = await asService(async (c) => (await c.query(
    `update auth.sessions s set revoked_at = now()
       from public.profiles p
      where p.id = s.user_id and s.revoked_at is null and s.user_id <> $1 ${roleFilter}`, [user.id],
  )).rowCount ?? 0);
  await log(`Signed out ${scope === "students" ? "all students" : "everyone except me"} (${n} sessions)`);
  return { ok: true, message: `Done, ${n} session(s) signed out.` };
}

export async function createDeveloperAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireDeveloper();
  const fullName = str(fd, "full_name");
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (fullName.length < 2) return { error: "Enter a name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid e-mail." };
  if (password.length < 10) return { error: "Use at least 10 characters for a developer password." };
  const exists = await asService(async (c) => (await c.query("select id from auth.users where lower(email) = $1", [email])).rows[0]);
  if (exists) {
    await asService((c) => c.query("update public.profiles set role = 'developer', student_id = null where id = $1", [exists.id]));
    await log(`${email} promoted to developer`);
    revalidatePath("/dev/users");
    return { ok: true, message: `${email} already had an account, it is now a developer (password unchanged).` };
  }
  await asService((c) => c.query("insert into public.admin_emails (email) values ($1) on conflict do nothing", [email]));
  const { data, error } = await createAdminClient().auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } });
  if (error || !data?.user) return { error: "Couldn't create the account." };
  await asService((c) => c.query("update public.profiles set full_name = $2, role = 'developer', student_id = null where id = $1", [data.user!.id, fullName]));
  await log(`Developer account created: ${fullName} (${email})`);
  revalidatePath("/dev/users");
  return { ok: true, message: `Developer account created for ${email}.` };
}

export async function removeDeveloperAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireDeveloper();
  const id = str(fd, "id");
  if (id === user.id) return { error: "You can't remove your own developer access." };
  await asService((c) => c.query("update public.profiles set role = 'owner' where id = $1 and role = 'developer'", [id]));
  await log("Developer access removed (account kept as owner)", { id });
  revalidatePath("/dev/users");
  return { ok: true, message: "Developer access removed, the account is now an owner." };
}

// ─── Tools ───
export async function clearCacheAction(): Promise<ActionState> {
  await requireDeveloper();
  refreshAll();
  await log("Cleared page cache");
  return { ok: true, message: "Page cache cleared." };
}
