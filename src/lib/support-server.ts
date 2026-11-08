import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import { signedUrl, safeObjectPath } from "@/lib/db/storage";
import { rateLimit, clientIp } from "@/lib/security";
import type { NextRequest } from "next/server";

export const SUPPORT_COOKIE = "hm_support";
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");
export const validToken = (token?: string) => !!token && /^[\w-]{43}$/.test(token);
export const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export const clean = (v: unknown, max: number) => typeof v === "string" && v.length <= max ? v.trim() : "";

/** Mutation endpoints accept only same-origin JSON; the browser never supplies staff identities. */
export function sameOrigin(req: NextRequest) {
  try {
    const origin = new URL(req.headers.get("origin") ?? "");
    const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").split(",")[0].trim();
    const protocol = (req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "")).split(",")[0].trim();
    return origin.host === host && origin.protocol === `${protocol}:` && req.headers.get("content-type")?.split(";")[0] === "application/json";
  } catch { return false; }
}
export async function allowed(action: string, max: number, windowMs: number) {
  return rateLimit(`support:${action}:${await clientIp()}`, max, windowMs);
}
export async function bodyJson(req: NextRequest): Promise<Record<string, unknown> | null> {
  if (Number(req.headers.get("content-length") ?? 0) > 8192) return null;
  const s = await req.text();
  if (s.length > 8192) return null;
  try { const data = JSON.parse(s); return data && typeof data === "object" && !Array.isArray(data) ? data : null; } catch { return null; }
}

export async function conversationFor(c: PoolClient, userId: string | null, token?: string, lock = false) {
  if (userId) return (await c.query(`select * from public.support_conversations where user_id = $1${lock ? " for update" : ""}`, [userId])).rows[0] ?? null;
  if (!validToken(token)) return null;
  return (await c.query(`select * from public.support_conversations where guest_token_hash = $1 and user_id is null${lock ? " for update" : ""}`, [tokenHash(token!)])).rows[0] ?? null;
}

async function avatar(path: string | null) {
  return path && safeObjectPath("avatars", path) ? signedUrl("avatars", path, 900 - Math.floor(Date.now() / 1000) % 300) : null;
}
/** Only the staff name/avatar is shared with the visitor, not profile contact or role information. */
export async function messagePage(c: PoolClient, conversationId: string, before: string | null = null, staffView = false) {
  const rows = (await c.query(`select m.id, m.sender, m.sender_name, m.staff_id, m.body, m.created_at, p.avatar_path
    from (select * from public.support_messages where conversation_id = $1
      and ($2::uuid is null or (created_at, id) < (select created_at, id from public.support_messages where conversation_id=$1 and id=$2))
      order by created_at desc, id desc limit 201) m
    left join public.profiles p on p.id = m.staff_id order by m.created_at desc, m.id desc`, [conversationId, before])).rows;
  const hasMore = rows.length > 200;
  const avatars = new Map<string, Promise<string | null>>();
  const photo = (path: string | null) => {
    if (!path) return Promise.resolve(null);
    if (!avatars.has(path)) avatars.set(path, avatar(path));
    return avatars.get(path)!;
  };
  return { hasMore, messages: await Promise.all(rows.slice(0, 200).reverse().map(async (m) => ({ id: m.id, sender: m.sender, staffId: staffView ? m.staff_id : null, name: m.sender_name, body: m.body, createdAt: m.created_at, avatar: m.sender === "staff" ? await photo(m.avatar_path) : null }))) };
}
export async function chatData(c: PoolClient, conversation: Record<string, any>, staffView = false) {
  const page = await messagePage(c, conversation.id, null, staffView);
  const agents = (await c.query(`select p.id, p.full_name, p.avatar_path from public.support_agents a
    join public.profiles p on p.id=a.staff_id where a.conversation_id=$1 and a.last_seen_at > now() - interval '45 seconds'
    and p.role in ('admin','owner','developer') order by a.last_seen_at desc`, [conversation.id])).rows;
  return {
    conversation: { id: conversation.id, name: conversation.visitor_name, contact: conversation.contact, category: conversation.category, status: conversation.status, updatedAt: conversation.updated_at },
    ...page,
    agents: await Promise.all(agents.map(async (a) => ({ id: tokenHash(a.id).slice(0, 16), name: a.full_name, avatar: await avatar(a.avatar_path) }))),
  };
}
