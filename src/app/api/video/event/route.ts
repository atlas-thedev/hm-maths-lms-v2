import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/db/server";
import { asService } from "@/lib/db/pg";
import { recordAuditLog } from "@/lib/settings";
import { clientMeta } from "@/lib/request-meta";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The player reports a watermark tamper or open developer tools. Students only; at most once a minute per kind. */
export async function POST(req: NextRequest) {
  let body: { kind?: string; lessonId?: string | null } = {};
  try { body = await req.json(); } catch { /* beacon with no body */ }
  const kind = body.kind === "tamper" || body.kind === "devtools" ? body.kind : null;
  if (!kind) return new NextResponse(null, { status: 400 });
  const lessonId = body.lessonId && UUID_RE.test(body.lessonId) ? body.lessonId : null;

  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return new NextResponse(null, { status: 401 });
  const { data: profile } = await db.from("profiles").select("role, full_name, student_id").eq("id", user.id).maybeSingle();
  if (profile?.role !== "student") return new NextResponse(null, { status: 204 });

  const { ip, ua } = clientMeta(req);
  const fresh = await asService(async (c) => {
    const recent = await c.query(`select 1 from public.video_events where student_id = $1 and kind = $2 and created_at > now() - interval '1 minute' limit 1`, [user.id, kind]);
    if (recent.rowCount) return false;
    await c.query(`insert into public.video_events (student_id, lesson_id, kind, ip, user_agent) values ($1, $2, $3, $4, $5)`, [user.id, lessonId, kind, ip, ua]);
    return true;
  });
  // Developer tools are only logged; removing the watermark also goes in the owner's activity log (once an hour).
  if (fresh && kind === "tamper") {
    const logged = await asService((c) => c.query(`select 1 from public.admin_audit_logs where actor_id = $1 and action = 'video_tamper' and created_at > now() - interval '1 hour' limit 1`, [user.id]));
    if (!logged.rowCount) {
      await recordAuditLog({
        actorId: user.id, actorName: profile.full_name, actorRole: "student", category: "student", action: "video_tamper",
        studentId: user.id, studentName: profile.full_name, studentCode: profile.student_id,
        summary: "Removed or hid the video watermark",
      });
    }
  }
  return new NextResponse(null, { status: 204 });
}
