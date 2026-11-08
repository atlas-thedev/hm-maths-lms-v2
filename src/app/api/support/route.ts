import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { asService } from "@/lib/db/pg";
import { allowed, bodyJson, chatData, clean, conversationFor, isUuid, messagePage, newToken, sameOrigin, SUPPORT_COOKIE, tokenHash, validToken } from "@/lib/support-server";

export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(req: NextRequest) {
  if (!await allowed("read", 180, 60_000)) return json({ error: "Please try again shortly." }, 429);
  const { user, profile } = await getSession();
  const token = req.cookies.get(SUPPORT_COOKIE)?.value;
  const before = req.nextUrl.searchParams.get("before");
  if (before && !isUuid(before)) return json({ error: "Invalid message." }, 400);
  try {
    const data = await asService(async (c) => { const conv = await conversationFor(c, user?.id ?? null, token); return conv ? (before ? messagePage(c, conv.id, before) : chatData(c, conv)) : null; });
    return before ? json({ older: data }) : json({ chat: data, accountName: profile?.full_name ?? null });
  } catch (e) { console.error("Support chat read", e); return json({ error: "Chat is temporarily unavailable." }, 503); }
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "Invalid request." }, 403);
  if (!await allowed("write", 35, 60_000)) return json({ error: "Too many messages. Please wait a moment." }, 429);
  const input = await bodyJson(req);
  if (!input || !["start", "send"].includes(String(input.action))) return json({ error: "Invalid request." }, 400);
  const { user, profile } = await getSession();
  const existingToken = req.cookies.get(SUPPORT_COOKIE)?.value;
  let token = validToken(existingToken) ? existingToken! : "";
  if (input.action === "start" && !user && !token) token = newToken();
  const message = clean(input.message, 2000);
  if (!message) return json({ error: "Please enter a message (up to 2000 characters)." }, 400);
  const name = user ? Array.from(profile?.full_name?.trim() ?? "").slice(0, 100).join("") : clean(input.name, 100);
  const contact = clean(input.contact, 100);
  const category = input.category;
  if (input.action === "start" && (!name || !["slip", "bug", "other"].includes(String(category)) || (input.contact != null && typeof input.contact !== "string") || (typeof input.contact === "string" && input.contact.length > 100))) return json({ error: "Please enter your name and choose a topic." }, 400);
  if (user && !profile) return json({ error: "Please sign in again." }, 401);
  try {
    const result = await asService(async (c) => {
      // Serialize starts/sends for a given identity across all application instances.
      const identity = user ? `user:${user.id}` : `guest:${tokenHash(token)}`;
      await c.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [identity]);
      let conv = await conversationFor(c, user?.id ?? null, token, true);
      if (!conv && input.action === "start") {
        if (!await allowed("start", 6, 15 * 60_000)) return { error: "Too many new chats. Please try again later.", status: 429 };
        conv = (await c.query(`insert into public.support_conversations (user_id, guest_token_hash, visitor_name, contact, category)
          values ($1,$2,$3,$4,$5) returning *`, [user?.id ?? null, user ? null : tokenHash(token), name, contact, category])).rows[0];
      }
      if (!conv) return { error: "Start a chat first.", status: 404 };
      await c.query("insert into public.support_messages (conversation_id, sender, sender_name, body, created_at) values ($1,'visitor',$2,$3,clock_timestamp())", [conv.id, conv.visitor_name, message]);
      conv = (await c.query("update public.support_conversations set status='open', updated_at=clock_timestamp(), last_visitor_at=clock_timestamp() where id=$1 returning *", [conv.id])).rows[0];
      return { chat: await chatData(c, conv), status: 200 };
    });
    const response = json(result, result.status);
    if (!user && result.status === 200) response.cookies.set(SUPPORT_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" && process.env.COOKIE_INSECURE !== "1", path: "/api/support", maxAge: 60 * 60 * 24 * 90 });
    return response;
  } catch (e) { console.error("Support chat write", e); return json({ error: "Chat is temporarily unavailable." }, 503); }
}
