import { NextResponse, type NextRequest } from "next/server";
import { getSession, isStaffRole } from "@/lib/auth";
import { asService } from "@/lib/db/pg";
import { allowed, bodyJson, chatData, clean, isUuid, messagePage, sameOrigin } from "@/lib/support-server";

export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(req: NextRequest) {
  const { user, profile } = await getSession();
  if (!user || !isStaffRole(profile?.role)) return json({ error: "Forbidden." }, 403);
  if (!await allowed("admin-read", 240, 60_000)) return json({ error: "Please try again shortly." }, 429);
  const id = req.nextUrl.searchParams.get("id");
  if (id && !isUuid(id)) return json({ error: "Invalid chat." }, 400);
  const before = req.nextUrl.searchParams.get("before");
  if (before && (!id || !isUuid(before))) return json({ error: "Invalid message." }, 400);
  try {
    return json(await asService(async (c) => {
      if (id) {
        const conv = (await c.query("select * from public.support_conversations where id=$1", [id])).rows[0];
        return before ? { older: conv ? await messagePage(c, conv.id, before, true) : null } : conv ? { chat: await chatData(c, conv, true) } : { chat: null };
      }
      if (req.nextUrl.searchParams.get("count") === "1") {
        const row = (await c.query(`select count(*)::int as count from public.support_conversations
          where status='open' and last_visitor_at is not null and (staff_read_at is null or last_visitor_at > staff_read_at)`)).rows[0];
        return { count: row.count };
      }
      const search = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
      const pageSize = Math.floor(Math.min(1000, Math.max(150, Number(req.nextUrl.searchParams.get("limit")) || 150)));
      const chats = (await c.query(`select c.id, c.visitor_name as name, c.contact, c.category, c.status, c.updated_at as "updatedAt",
        (c.last_visitor_at is not null and (c.staff_read_at is null or c.last_visitor_at > c.staff_read_at)) as unread,
        p.student_id as "studentId",
        (select body from public.support_messages m where m.conversation_id=c.id order by m.created_at desc, m.id desc limit 1) as preview
        from public.support_conversations c left join public.profiles p on p.id=c.user_id
        where $1 = '' or position(lower($1) in lower(c.visitor_name)) > 0 or position(lower($1) in lower(c.contact)) > 0 or position(lower($1) in lower(coalesce(p.student_id, ''))) > 0
        order by (c.status='open') desc, c.updated_at desc, c.id desc limit $2`, [search, pageSize])).rows;
      return { chats };
    }));
  } catch (e) { console.error("Support admin read", e); return json({ error: "Chat is temporarily unavailable." }, 503); }
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "Invalid request." }, 403);
  const { user, profile } = await getSession();
  if (!user || !profile || !isStaffRole(profile.role)) return json({ error: "Forbidden." }, 403);
  if (!await allowed("admin-write", 100, 60_000)) return json({ error: "Please try again shortly." }, 429);
  const input = await bodyJson(req);
  if (!input || !isUuid(input.id) || !["join", "heartbeat", "leave", "send", "close", "reopen", "delete"].includes(String(input.action))) return json({ error: "Invalid request." }, 400);
  const action = String(input.action), id = input.id;
  const message = clean(input.message, 2000);
  if (action === "send" && !message) return json({ error: "Please enter a message (up to 2000 characters)." }, 400);
  try {
    const result = await asService(async (c) => {
      let conv = (await c.query("select * from public.support_conversations where id=$1 for update", [id])).rows[0];
      if (!conv) return { error: "Chat not found.", status: 404 };
      if (action === "delete") {
        await c.query("delete from public.support_conversations where id=$1", [id]);
        return { deleted: true, status: 200 };
      }
      if (action === "close") {
        conv = (await c.query("update public.support_conversations set status='closed', updated_at=clock_timestamp() where id=$1 returning *", [id])).rows[0];
        await c.query("delete from public.support_agents where conversation_id=$1", [id]);
      } else if (action === "reopen") {
        conv = (await c.query("update public.support_conversations set status='open', updated_at=clock_timestamp() where id=$1 returning *", [id])).rows[0];
      } else if (action === "leave") {
        await c.query("delete from public.support_agents where conversation_id=$1 and staff_id=$2", [id, user.id]);
      } else if (conv.status !== "open") return { error: "This chat is closed. Reopen it first.", status: 409 };
      else if (action === "join") {
        await c.query(`insert into public.support_agents (conversation_id, staff_id, last_seen_at) values ($1,$2,clock_timestamp())
          on conflict (conversation_id, staff_id) do update set last_seen_at=clock_timestamp()`, [id, user.id]);
        conv = (await c.query("update public.support_conversations set staff_read_at=clock_timestamp() where id=$1 returning *", [id])).rows[0];
      } else {
        const joined = (await c.query("select 1 from public.support_agents where conversation_id=$1 and staff_id=$2 and last_seen_at > now() - interval '45 seconds'", [id, user.id])).rowCount;
        if (!joined) return { error: "Join the chat first.", status: 409 };
        await c.query("update public.support_agents set last_seen_at=clock_timestamp() where conversation_id=$1 and staff_id=$2", [id, user.id]);
        if (action === "send") await c.query("insert into public.support_messages (conversation_id, sender, staff_id, sender_name, body, created_at) values ($1,'staff',$2,$3,$4,clock_timestamp())", [id, user.id, profile.full_name.slice(0, 120) || "Admin", message]);
        conv = (await c.query(`update public.support_conversations set staff_read_at=clock_timestamp(), updated_at=case when $2='send' then clock_timestamp() else updated_at end where id=$1 returning *`, [id, action])).rows[0];
      }
      return { chat: await chatData(c, conv, true), status: 200 };
    });
    return json(result, result.status);
  } catch (e) { console.error("Support admin write", e); return json({ error: "Chat is temporarily unavailable." }, 503); }
}
