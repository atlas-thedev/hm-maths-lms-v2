"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/db/admin";
import { townKeys } from "@/lib/centers";
import { getCenters } from "@/lib/settings";
import type { ActionState } from "@/lib/types";
import { getT } from "@/i18n/server";
import { currentMonth, normalizeMobile, shiftMonth } from "@/lib/utils";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function submitEnrollmentAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db, user } = await requireUser();
  const t = await getT("errors.student");
  const classId = String(fd.get("class_id") ?? "");
  const month = String(fd.get("month") ?? "");
  const slip = String(fd.get("slip_url") ?? "");
  const bankRef = String(fd.get("bank_ref") ?? "").trim().slice(0, 80) || null;

  if (!MONTH_RE.test(month)) return { error: t("selectMonth") };
  const cur = currentMonth();
  if (month > shiftMonth(cur, 1) || month < shiftMonth(cur, -36)) return { error: t("monthUnavailable") };
  if (!slip.startsWith(`${user.id}/`)) return { error: t("slipFirst") };

  const { data: cls } = await db.from("classes").select("id, is_free, is_active").eq("id", classId).maybeSingle();
  if (!cls || !cls.is_active) return { error: t("classUnavailable") };
  if (cls.is_free) return { error: t("classFree") };

  // One slip at a time per class: a pending slip must be reviewed or withdrawn first.
  const { data: pending } = await db.from("enrollments").select("id")
    .eq("student_id", user.id).eq("class_id", classId).eq("status", "pending").limit(1);
  if (pending?.length) return { error: t("pendingExists") };

  const { data: existing } = await db.from("enrollments").select("id, status")
    .eq("student_id", user.id).eq("class_id", classId).eq("month", month).maybeSingle();
  if (existing?.status === "approved") return { error: t("alreadyAccess") };

  const { error } = existing
    ? await db.from("enrollments").update({ slip_url: slip, bank_ref: bankRef, status: "pending", admin_note: null }).eq("id", existing.id)
    : await db.from("enrollments").insert({ student_id: user.id, class_id: classId, month, slip_url: slip, bank_ref: bankRef, status: "pending" });
  if (error) return { error: t("slipFailed") };

  revalidatePath("/dashboard", "layout");
  return { ok: true, message: t("slipSubmitted") };
}

/** Student withdraws their own pending slip so they can send a new one. */
export async function withdrawEnrollmentAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db, user } = await requireUser();
  const t = await getT("errors.student");
  const id = String(fd.get("id") ?? "");
  const { data, error } = await db.from("enrollments").delete()
    .eq("id", id).eq("student_id", user.id).eq("status", "pending").select("slip_url");
  if (error || !data?.length) return { error: t("withdrawFailed") };
  const slip = data[0].slip_url as string | null;
  if (slip?.startsWith(`${user.id}/`)) await createAdminClient().storage.from("bank-slips").remove([slip]);
  revalidatePath("/dashboard", "layout");
  revalidatePath("/admin", "layout");
  return { ok: true, message: t("withdrawn") };
}

export async function createOrderAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db, user } = await requireUser();
  const t = await getT("errors.student");
  const productId = String(fd.get("product_id") ?? "");
  const quantity = Math.max(1, Math.min(20, Number(fd.get("quantity") ?? 1) || 1));
  const address = String(fd.get("delivery_address") ?? "").trim();
  const slip = String(fd.get("slip_url") ?? "");
  if (address.length < 10) return { error: t("address") };
  if (!slip.startsWith(`${user.id}/`)) return { error: t("slipFirst") };
  const { data: product } = await db.from("products").select("id, is_active").eq("id", productId).maybeSingle();
  if (!product?.is_active) return { error: t("itemUnavailable") };
  const { error } = await db.from("orders").insert({ student_id: user.id, product_id: productId, quantity, delivery_address: address.slice(0, 500), slip_url: slip });
  if (error) return { error: t("orderFailed") };
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: t("orderPlaced") };
}

const optionalMobile = z.string().trim().max(20).optional().default("")
  .transform((v) => (v ? normalizeMobile(v) : ""))
  .refine((v) => v !== null, "mobile");

const profileSchema = (towns: string[]) => z.object({
  full_name: z.string().trim().min(3).max(120),
  school: z.string().trim().max(120).optional().default(""),
  district: z.string().trim().max(60).optional().default(""),
  town: z.string().refine((v) => towns.includes(v)),
  address: z.string().trim().min(8).max(300),
  city: z.string().trim().min(2).max(80),
  postal_code: z.string().trim().regex(/^(\d{5})?$/).optional().default(""),
  whatsapp: optionalMobile,
  guardian_mobile: optionalMobile,
});

export async function updateProfileAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db, user } = await requireUser();
  const t = await getT("errors.student");
  const parsed = profileSchema(townKeys(await getCenters())).safeParse(Object.fromEntries(fd));
  if (!parsed.success) {
    const bad = parsed.error.issues[0]?.path[0];
    if (bad === "whatsapp" || bad === "guardian_mobile") return { error: t("mobileInvalid"), fieldErrors: { [bad]: t("mobileInvalid") } };
    return { error: t("profileInvalid") };
  }
  const d = parsed.data;
  const { error } = await db.from("profiles")
    .update({
      full_name: d.full_name, school: d.school || null, district: d.district || null, town: d.town,
      address: d.address, city: d.city, postal_code: d.postal_code || null,
      whatsapp: d.whatsapp || null, guardian_mobile: d.guardian_mobile || null,
    })
    .eq("id", user.id);
  if (error) return { error: t("profileFailed") };
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: t("profileSaved") };
}

/** Profile photo: the browser uploads to the private "avatars" bucket, then this saves the path. */
export async function setAvatarAction(path: string | null): Promise<ActionState> {
  const { db, user, profile } = await requireUser();
  const t = await getT("errors.student");
  if (path !== null && !new RegExp(`^${user.id}/[A-Za-z0-9_.-]{1,100}\\.(jpg|jpeg|png|webp)$`).test(path)) return { error: t("photoFailed") };
  const { error } = await db.from("profiles").update({ avatar_path: path }).eq("id", user.id);
  if (error) return { error: t("photoFailed") };
  if (profile.avatar_path && profile.avatar_path !== path) await db.storage.from("avatars").remove([profile.avatar_path]);
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: t(path ? "photoSaved" : "photoRemoved") };
}

export async function markNotificationsReadAction(): Promise<boolean> {
  const { db } = await requireUser();
  const { error } = await db.rpc("mark_notifications_read", {});
  return !error;
}
