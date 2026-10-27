"use server";

import { randomInt } from "node:crypto";
import { BRAND } from "@/config/brand";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth";
import { createAdminClient } from "@/lib/db/admin";
import { asService } from "@/lib/db/pg";
import { getLandingStatsSettings, recordAuditLog, saveLandingStatsSettings } from "@/lib/settings";
import type { ActionState } from "@/lib/types";
import { normalizeMobile } from "@/lib/utils";
import { getT } from "@/i18n/server";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true" || fd.get(k) === "1";

export async function createStaffAccountAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { user, profile } = await requireOwner();
  const t = await getT("admin.owner");
  const fullName = str(fd, "full_name");
  const email = str(fd, "email").toLowerCase();
  const rawMobile = str(fd, "mobile");
  const mobile = rawMobile ? normalizeMobile(rawMobile) : null;
  const password = String(fd.get("password") ?? "");
  const role = str(fd, "role") === "owner" ? "owner" : "admin";

  if (fullName.length < 2) return { error: t("errors.nameRequired") };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: t("errors.emailInvalid") };
  if (rawMobile && !mobile) return { error: t("errors.mobileInvalid") };
  if (password.length < 8) return { error: t("errors.passwordShort") };

  const existing = await asService(async (c) =>
    (await c.query("select id from auth.users where lower(email) = $1 limit 1", [email])).rows[0],
  );
  if (existing) return { error: t("errors.emailExists") };
  if (mobile) {
    const mobTaken = await asService(async (c) =>
      (await c.query("select id from public.profiles where mobile = $1 limit 1", [mobile])).rows[0],
    );
    if (mobTaken) return { error: t("errors.mobileExists") };
  }

  await asService((c) =>
    c.query("insert into public.admin_emails (email) values ($1) on conflict do nothing", [email]),
  );

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, mobile: mobile ?? "" },
  });
  if (error || !data?.user) {
    return { error: t("errors.createFailed") };
  }

  await asService((c) =>
    c.query(
      "update public.profiles set full_name = $2, mobile = $3, role = $4, student_id = null where id = $1",
      [data.user!.id, fullName, mobile, role],
    ),
  );

  await recordAuditLog({
    actorId: user.id,
    actorName: profile.full_name,
    actorRole: profile.role,
    category: "staff",
    action: "admin_created",
    targetId: data.user.id,
    summary: `${fullName} (${email}) · ${role}`,
    details: { email, mobile, role },
  });

  revalidatePath("/admin/owner", "layout");
  revalidatePath("/admin/students");
  return { ok: true, message: t("messages.staffCreated", { name: fullName, email }) };
}

export async function changeStaffRoleAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { user, profile } = await requireOwner();
  const t = await getT("admin.owner");
  const id = str(fd, "id");
  const nextRole = str(fd, "role");
  if (!["student", "admin", "owner"].includes(nextRole)) return { error: t("errors.invalidRole") };
  if (id === user.id) return { error: t("errors.ownRole") };

  const target = await asService(async (c) =>
    (
      await c.query(
        `select p.id, p.full_name, p.role, p.student_id, p.al_year, u.email
           from public.profiles p
           join auth.users u on u.id = p.id
          where p.id = $1 limit 1`,
        [id],
      )
    ).rows[0] as { id: string; full_name: string; role: string; student_id: string | null; al_year: number | null; email: string } | undefined,
  );
  if (!target) return { error: t("errors.notFound") };
  if (target.role === "developer" && profile.role !== "developer") return { error: t("errors.developerLocked") };

  await asService(async (c) => {
    if (nextRole === "student") {
      await c.query("delete from public.admin_emails where lower(email) = lower($1)", [target.email]);
      await c.query(
        `update public.profiles
            set role = 'student',
                student_id = coalesce(student_id, public.generate_student_id(coalesce(al_year, extract(year from now())::int)))
          where id = $1`,
        [id],
      );
    } else {
      await c.query("insert into public.admin_emails (email) values (lower($1)) on conflict do nothing", [target.email]);
      await c.query("update public.profiles set role = $2 where id = $1", [id, nextRole]);
    }
  });

  await recordAuditLog({
    actorId: user.id,
    actorName: profile.full_name,
    actorRole: profile.role,
    category: "staff",
    action: nextRole === "student" ? "admin_demoted" : "admin_promoted",
    targetId: id,
    studentId: id,
    studentName: target.full_name,
    studentCode: target.student_id,
    summary: `${target.full_name} (${target.email}): ${target.role} → ${nextRole}`,
    details: { email: target.email, prev_role: target.role, new_role: nextRole },
  });

  revalidatePath("/admin/owner", "layout");
  revalidatePath("/admin/students");
  return { ok: true, message: t("messages.roleUpdated", { name: target.full_name, role: nextRole }) };
}

export async function resetStaffPasswordAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { user, profile } = await requireOwner();
  const t = await getT("admin.owner");
  const id = str(fd, "id");
  const customPw = String(fd.get("password") ?? "").trim();
  if (id === user.id) return { error: t("errors.ownRole") };

  const target = await asService(async (c) =>
    (await c.query("select full_name, role from public.profiles where id = $1 limit 1", [id])).rows[0] as
      | { full_name: string; role: string }
      | undefined,
  );
  if (!target) return { error: t("errors.notFound") };
  if (target.role === "developer" && profile.role !== "developer") return { error: t("errors.developerLocked") };

  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const newPassword =
    customPw.length >= 8
      ? customPw
      : Array.from({ length: 10 }, () => alphabet[randomInt(alphabet.length)]).join("");

  const { error } = await createAdminClient().auth.admin.updateUserById(id, { password: newPassword });
  if (error) return { error: t("errors.resetFailed") };

  await recordAuditLog({
    actorId: user.id,
    actorName: profile.full_name,
    actorRole: profile.role,
    category: "staff",
    action: "password_reset",
    targetId: id,
    summary: `Reset password for ${target.full_name} (${target.role})`,
  });

  return { ok: true, message: t("messages.passwordReset", { name: target.full_name, temp: newPassword }) };
}

export async function saveLandingStatsAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { user, profile } = await requireOwner();
  const t = await getT("admin.owner");
  const current = await getLandingStatsSettings();
  const rawAb = str(fd, "ab_results") || current.abResults || "+500";
  const abResults = rawAb.startsWith("+") ? rawAb : `+${rawAb}`;
  const subscribers = str(fd, "subscribers") || current.subscribers;
  const videos = str(fd, "videos") || current.videos;

  await saveLandingStatsSettings({ abResults, subscribers, videos }, user.id);
  await recordAuditLog({
    actorId: user.id,
    actorName: profile.full_name,
    actorRole: profile.role,
    category: "settings",
    action: "landing_stats_updated",
    summary: `Landing stats: A/B ${abResults} · Subs ${subscribers} · Videos ${videos}`,
    details: { abResults, subscribers, videos },
  });

  revalidatePath("/");
  revalidatePath("/admin/owner", "layout");
  return { ok: true, message: t("messages.landingSaved") };
}
