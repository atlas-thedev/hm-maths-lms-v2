"use client";
import { useEffect, useRef, useState } from "react";
import { initials } from "@/lib/utils";
import { useT } from "@/i18n/client";

export type Chat = {
  conversation: { id: string; name: string; contact: string; category: string; status: "open" | "closed"; updatedAt: string };
  hasMore: boolean;
  messages: { id: string; sender: "visitor" | "staff"; staffId: string | null; name: string; body: string; createdAt: string; avatar: string | null }[];
  agents: { id: string; name: string; avatar: string | null }[];
};
export async function request<T>(url: string, data?: object): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...(data ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) } : {}) });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json();
}
export function Face({ name, src, size = "normal", themed = false }: { name: string; src: string | null; size?: "normal" | "small"; themed?: boolean }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  const classes = size === "small" ? "h-8 w-8 text-[10px]" : "h-10 w-10 text-xs";
  return src && !broken
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={src} alt="" onError={() => setBroken(true)} className={`${classes} shrink-0 rounded-full object-cover ${themed ? "" : "ring-2 ring-white"}`} />
    : <span aria-hidden className={`${classes} grid shrink-0 place-items-center rounded-full font-bold ${themed ? "bg-brand-500/15 text-primary-text" : "bg-slate-200 text-slate-700"}`}>{initials(name)}</span>;
}
export function ChatMessages({ chat, staffId }: { chat: Chat; staffId?: string }) {
  const t = useT("support");
  const end = useRef<HTMLDivElement>(null);
  const [history, setHistory] = useState(chat.messages);
  const [hasMore, setHasMore] = useState(chat.hasMore);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  // Retain previously loaded messages when the live 200-message window advances.
  useEffect(() => { setHistory((prev) => { const ids = new Set(prev.map((m) => m.id)); const latest = new Map(chat.messages.map((m) => [m.id, m])); return [...prev.map((m) => latest.get(m.id) ?? m), ...chat.messages.filter((m) => !ids.has(m.id))]; }); }, [chat.messages]);
  const last = history.at(-1)?.id;
  useEffect(() => { const scroller = end.current?.parentElement?.parentElement; if (scroller) scroller.scrollTop = scroller.scrollHeight; }, [chat.conversation.id, last]);
  async function earlier() {
    if (!history.length || busy) return;
    setBusy(true); setError(false);
    const before = encodeURIComponent(history[0].id);
    const url = staffId ? `/api/support/admin?id=${encodeURIComponent(chat.conversation.id)}&before=${before}` : `/api/support?before=${before}`;
    try {
      const d = await request<{ older: { messages: Chat["messages"]; hasMore: boolean } | null }>(url);
      if (!d.older) throw new Error("Chat not found");
      setHistory((prev) => { const ids = new Set(prev.map((m) => m.id)); return [...d.older!.messages.filter((m) => !ids.has(m.id)), ...prev]; });
      setHasMore(d.older.hasMore);
    } catch { setError(true); }
    finally { setBusy(false); }
  }
  return <div className="space-y-4" aria-live="polite" aria-relevant="additions text">
    {hasMore && <div className="text-center"><button type="button" onClick={earlier} disabled={busy} className={`rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${staffId ? "border-slate-200 bg-white text-slate-700" : "border-border bg-card text-foreground"}`}>{busy ? t("loading") : t("earlier")}</button>{error && <p role="alert" className={`mt-2 text-xs ${staffId ? "text-red-700" : "text-destructive-soft-foreground"}`}>{t("error")}</p>}</div>}
    {history.map((m) => {
      const mine = staffId ? m.sender === "staff" && m.staffId === staffId : m.sender === "visitor";
      return <div key={m.id} data-testid="support-message" className={`flex items-start gap-2 ${mine ? "justify-end" : "justify-start"}`}>
        {!mine && m.sender === "staff" && <span data-testid="support-message-avatar" className="mt-5 shrink-0"><Face name={m.name} src={m.avatar} size="small" themed={!staffId} /></span>}
        <div className={`min-w-0 max-w-[85%] ${mine ? "text-right" : "text-left"}`}>
          <p className={`mb-1 truncate text-[11px] font-semibold ${staffId ? "text-slate-500" : "text-muted-foreground"}`}>{mine ? t("you") : m.name}</p>
          <p data-testid="support-message-bubble" className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${staffId ? (mine ? "rounded-br-sm bg-slate-900 text-white" : "rounded-bl-sm bg-white text-slate-800 shadow-sm ring-1 ring-slate-200") : (mine ? "rounded-br-sm bg-brand-500 text-[#141414]" : "rounded-bl-sm bg-card text-card-foreground shadow-sm")}`}>{m.body}</p>
          <time dateTime={m.createdAt} className={`mt-1 block text-[10px] ${staffId ? "text-slate-400" : "text-muted-foreground"}`}>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
        </div>
      </div>;
    })}<div ref={end} />
  </div>;
}
