import { NextResponse } from "next/server";
import { getSession, isStaffRole } from "@/lib/auth";
import { formatMonth } from "@/lib/utils";
import { getDeliveries, itemLabel, parseDeliveryFilter } from "../data";

const cell = (v: unknown) => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  // Quote everything; neutralise spreadsheet formulas.
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

/** GET /admin/deliveries/export?<same filters as the page> → CSV of the parcels (staff only). */
export async function GET(req: Request) {
  const { db, user, profile } = await getSession();
  if (!user || !isStaffRole(profile?.role)) return new NextResponse("Not allowed", { status: 403 });
  const sp = Object.fromEntries(new URL(req.url).searchParams.entries());
  const rows = await getDeliveries(db, parseDeliveryFilter(sp), 5000);
  const head = ["Name", "Student ID", "Phone", "Address", "Item", "Type", "Method", "Status", "Courier", "Tracking no", "Posted", "Delivered", "Note"];
  const lines = rows.map((r) => [
    r.profiles?.full_name, r.profiles?.student_id, r.phone ?? r.profiles?.mobile, r.address?.replace(/\n/g, ", "),
    itemLabel(r, (m) => formatMonth(m)), r.kind === "order" ? "Tute book" : "Class tute", r.method === "class" ? "At class" : "Post",
    r.status, r.courier, r.tracking_no, r.posted_at?.slice(0, 10), r.delivered_at?.slice(0, 10), r.note,
  ].map(cell).join(","));
  const csv = "﻿" + [head.map(cell).join(","), ...lines].join("\r\n");
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="hm-maths-deliveries-${day}.csv"`, "cache-control": "no-store" },
  });
}
