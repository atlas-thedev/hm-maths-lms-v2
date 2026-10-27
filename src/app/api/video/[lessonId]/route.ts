import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/db/server";
import { asService } from "@/lib/db/pg";
import { clientMeta } from "@/lib/request-meta";
import { recordAuditLog } from "@/lib/settings";
import { youtubeId } from "@/lib/youtube";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_STORE = { "Cache-Control": "no-store" };
/** A student opening more different recordings than this within an hour is almost certainly scraping them. */
const MAX_RECORDINGS_PER_HOUR = 30;

/**
 * The YouTube id of a recording, handed out only to someone who may watch it (row-level security decides, exactly like
 * the lesson page) and only when the player asks — so it is not in the page's HTML. Every request is logged.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  if (!UUID_RE.test(lessonId)) return NextResponse.json({ error: "bad request" }, { status: 400, headers: NO_STORE });
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "sign in" }, { status: 401, headers: NO_STORE });

  const { data: lesson } = await db.from("lessons").select("youtube_url").eq("id", lessonId).maybeSingle();
  const id = youtubeId(lesson?.youtube_url as string | null | undefined);
  if (!id) return NextResponse.json({ error: "not found" }, { status: 404, headers: NO_STORE });

  const { data: profile } = await db.from("profiles").select("role, full_name, student_id").eq("id", user.id).maybeSingle();
  if (profile?.role === "student") {
    const { ip, ua } = clientMeta(req);
    const blocked = await asService(async (c) => {
      const r = await c.query(
        `select count(distinct lesson_id)::int as n, bool_or(lesson_id = $2::uuid) as seen
           from public.video_events where student_id = $1 and kind = 'play' and created_at > now() - interval '1 hour'`,
        [user.id, lessonId],
      );
      const { n, seen } = r.rows[0] as { n: number; seen: boolean | null };
      if (n >= MAX_RECORDINGS_PER_HOUR && !seen) {
        const flagged = await c.query(`select 1 from public.video_events where student_id = $1 and kind = 'limit' and created_at > now() - interval '1 hour' limit 1`, [user.id]);
        await c.query(`insert into public.video_events (student_id, lesson_id, kind, ip, user_agent) values ($1, $2, 'limit', $3, $4)`, [user.id, lessonId, ip, ua]);
        return { n, firstTime: flagged.rowCount === 0 };
      }
      await c.query(`insert into public.video_events (student_id, lesson_id, kind, ip, user_agent) values ($1, $2, 'play', $3, $4)`, [user.id, lessonId, ip, ua]);
      return null;
    });
    if (blocked) {
      if (blocked.firstTime) {
        await recordAuditLog({
          actorId: user.id, actorName: profile.full_name, actorRole: "student", category: "student", action: "video_limit",
          studentId: user.id, studentName: profile.full_name, studentCode: profile.student_id,
          summary: `Opened ${blocked.n}+ different recordings within an hour`,
        });
      }
      return NextResponse.json({ error: "limit" }, { status: 429, headers: NO_STORE });
    }
  }
  return NextResponse.json({ id }, { headers: NO_STORE });
}
