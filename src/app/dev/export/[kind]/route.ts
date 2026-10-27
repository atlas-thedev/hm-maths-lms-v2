import { NextResponse } from "next/server";
import { isDeveloperRole, getSession } from "@/lib/auth";
import { asService } from "@/lib/db/pg";
import { recordAuditLog } from "@/lib/settings";
import { EXPORTS } from "./exports";

const cell = (v: unknown) => {
  if (v === null || v === undefined) return "";
  const s = v instanceof Date ? v.toISOString() : String(v);
  // Quote everything; neutralise spreadsheet formulas.
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

/** GET /dev/export/<kind> → CSV download (developer only). */
export async function GET(_req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const { user, profile } = await getSession();
  if (!user || !isDeveloperRole(profile?.role)) return new NextResponse("Not allowed", { status: 403 });
  const exp = EXPORTS[kind];
  if (!exp) return new NextResponse("Unknown export", { status: 404 });
  const { rows, fields } = await asService(async (c) => {
    const r = await c.query(exp.sql);
    return { rows: r.rows as Record<string, unknown>[], fields: r.fields.map((f) => f.name) };
  });
  const csv = "﻿" + [fields.map(cell).join(","), ...rows.map((r) => fields.map((f) => cell(r[f])).join(","))].join("\r\n");
  await recordAuditLog({ actorId: user.id, actorName: profile!.full_name, actorRole: profile!.role, category: "settings", action: "settings_changed", summary: `Exported ${exp.title} (${rows.length} rows)` });
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="hm-maths-${exp.file}-${day}.csv"`, "cache-control": "no-store" },
  });
}
