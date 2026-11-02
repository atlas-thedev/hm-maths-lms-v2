"use server";

import { revalidatePath } from "next/cache";
import { isOwnerRole, requireAdmin } from "@/lib/auth";
import type { ActionState } from "@/lib/types";
import { getT } from "@/i18n/server";
import { DELIVERY_STATUSES } from "./data";

const m = async (k: string, v?: Record<string, string | number>) => (await getT("errors.delivery"))(k, v);
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const isStatus = (s: string) => (DELIVERY_STATUSES as readonly string[]).includes(s);
const done = () => { revalidatePath("/admin/deliveries"); revalidatePath("/admin", "layout"); revalidatePath("/dashboard", "layout"); };

/**
 * One parcel: change its status and/or details. Only fields present in the form are written, so a status
 * button never wipes the tracking number (the old Store "Shipped" button did).
 */
export async function updateDeliveryAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const id = str(fd, "id");
  if (!UUID_RE.test(id)) return { error: await m("notFound") };
  const patch: Record<string, string | null> = {};
  const status = str(fd, "status");
  if (status) { if (!isStatus(status)) return { error: await m("status") }; patch.status = status; }
  for (const [k, max] of [["courier", 60], ["tracking_no", 80], ["note", 300], ["phone", 30], ["address", 600]] as const) {
    if (fd.has(k)) patch[k] = str(fd, k).slice(0, max) || null;
  }
  if (fd.has("method")) { const v = str(fd, "method"); if (v !== "post" && v !== "class") return { error: await m("status") }; patch.method = v; }
  if (!Object.keys(patch).length) return { error: await m("nothing") };
  const { error } = await db.from("deliveries").update(patch).eq("id", id);
  if (error) return { error: await m("failed") };
  done();
  return { ok: true, message: patch.status ? await m(`set.${patch.status}`) : await m("saved") };
}

/** Several parcels at once (the checkboxes): same new status, optionally the same courier. */
export async function bulkDeliveryAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireAdmin();
  const ids = str(fd, "ids").split(",").filter((x) => UUID_RE.test(x)).slice(0, 500);
  const status = str(fd, "status");
  if (!ids.length) return { error: await m("pickSome") };
  if (!isStatus(status)) return { error: await m("status") };
  const patch: Record<string, string> = { status };
  const courier = str(fd, "courier").slice(0, 60);
  if (courier) patch.courier = courier;
  const { error } = await db.from("deliveries").update(patch).in("id", ids);
  if (error) return { error: await m("failed") };
  done();
  return { ok: true, message: await m("bulkDone", { n: ids.length }) };
}

/** "No tute this month" for a class (skips its waiting parcels), or undo it (brings them back). */
export async function tuteSkipAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db, user } = await requireAdmin();
  const classId = str(fd, "class_id"), month = str(fd, "month");
  if (!UUID_RE.test(classId) || !MONTH_RE.test(month)) return { error: await m("failed") };
  const skip = str(fd, "skip") === "1";
  const { error } = skip
    ? await db.from("tute_skips").upsert({ class_id: classId, month, note: str(fd, "note").slice(0, 200) || null, created_by: user.id }, { onConflict: "class_id,month" })
    : await db.from("tute_skips").delete().eq("class_id", classId).eq("month", month);
  if (error) return { error: await m("failed") };
  done();
  return { ok: true, message: await m(skip ? "skipped" : "unskipped") };
}

/** Owner: a class that never posts a printed tute (its waiting parcels are skipped), or turn posting back on. */
export async function postsTutesAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { db, profile } = await requireAdmin();
  if (!isOwnerRole(profile.role)) return { error: await m("ownerOnly") };
  const classId = str(fd, "class_id");
  if (!UUID_RE.test(classId)) return { error: await m("failed") };
  const on = str(fd, "on") === "1";
  const { error } = await db.from("classes").update({ posts_tutes: on }).eq("id", classId);
  if (error) return { error: await m("failed") };
  if (!on) await db.from("deliveries").update({ status: "skipped" }).eq("class_id", classId).eq("kind", "class_tute").in("status", ["to_pack", "packed"]);
  done();
  return { ok: true, message: await m(on ? "postsOn" : "postsOff") };
}
