"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, LifeBuoy, LogIn, LogOut, MessageCircle, RotateCcw, Send, Trash2 } from "lucide-react";
import { useT } from "@/i18n/client";
import { ChatMessages, Face, request, type Chat } from "@/components/support/shared";
import { cn } from "@/lib/utils";

type Item = { id: string; name: string; contact: string; category: "slip" | "bug" | "other"; status: "open" | "closed"; updatedAt: string; studentId: string | null; unread: boolean; preview: string | null };
export function SupportInbox({ staffId }: { staffId: string }) {
  const t = useT("support");
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [chat, setChat] = useState<Chat | null>(null);
  const [joined, setJoined] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(150);
  const listVersion = useRef(0);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selected && window.matchMedia("(max-width: 767px)").matches) panel.current?.scrollIntoView({ block: "start" });
  }, [selected]);
  useEffect(() => { const timer = window.setTimeout(() => setQuery(search), 350); return () => clearTimeout(timer); }, [search]);
  const list = useCallback(async () => {
    const version = ++listVersion.current;
    try { const d = await request<{ chats: Item[] }>(`/api/support/admin?q=${encodeURIComponent(query)}&limit=${pageSize}`); if (version === listVersion.current) { setItems(d.chats); setLoaded(true); } }
    catch { if (version === listVersion.current) { setLoaded(true); setError(t("error")); } }
  }, [t, query, pageSize]);
  useEffect(() => { void list(); const n = window.setInterval(() => { if (document.visibilityState === "visible") void list(); }, 10000); return () => clearInterval(n); }, [list]);
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    const refresh = async () => { try { const d = await request<{ chat: Chat | null }>(`/api/support/admin?id=${encodeURIComponent(selected)}`); if (!cancelled) { setChat(d.chat); setError(""); if (d.chat?.conversation.status === "closed") setJoined(false); } } catch { if (!cancelled) setError(t("error")); } };
    void refresh(); const n = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 6000);
    return () => { cancelled = true; clearInterval(n); };
  }, [selected, t]);
  useEffect(() => {
    if (!selected || !joined) return;
    let cancelled = false;
    const beat = async () => { if (document.visibilityState !== "visible") return; try { const d = await request<{ chat: Chat }>("/api/support/admin", { id: selected, action: "heartbeat" }); if (!cancelled) setChat(d.chat); } catch { if (!cancelled) { setJoined(false); setError(t("error")); } } };
    const onVisible = () => { if (document.visibilityState === "visible") void beat(); };
    document.addEventListener("visibilitychange", onVisible);
    const n = window.setInterval(() => void beat(), 12000);
    return () => { cancelled = true; clearInterval(n); document.removeEventListener("visibilitychange", onVisible); void request("/api/support/admin", { id: selected, action: "leave" }).catch(() => {}); };
  }, [selected, joined, t]);
  async function act(action: string) {
    if (!selected || busy) return;
    setBusy(true); setError("");
    try {
      const d = await request<{ chat?: Chat; deleted?: boolean }>("/api/support/admin", { id: selected, action, ...(action === "send" ? { message } : {}) });
      if (d.deleted) { select(null); void list(); return; }
      if (!d.chat) throw new Error("Chat unavailable");
      setChat(d.chat);
      if (action === "join") setJoined(true);
      if (action === "leave" || action === "close") setJoined(false);
      if (action === "send") setMessage("");
      void list();
    } catch { setError(t("error")); }
    finally { setBusy(false); }
  }
  function select(id: string | null) { setJoined(false); setSelected(id); setChat(null); setMessage(""); setError(""); }
  const input = "rounded-xl border border-slate-200 bg-white text-slate-900";
  return <div className="space-y-5">
    <div><p className="flex items-center gap-2 text-sm font-bold text-primary"><LifeBuoy className="h-4 w-4" /> {t("live")}</p><h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{t("inbox")}</h1><p className="mt-1 text-sm text-muted-foreground">{t("inboxSubtitle")}</p></div>
    <div ref={panel} className={cn("grid scroll-mt-20 overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm md:min-h-[620px] md:grid-cols-[300px_1fr]", selected ? "h-[calc(100dvh-9rem)] min-h-[300px] md:h-auto" : "min-h-[620px]")}>
      <div className={cn("border-slate-200 md:border-r", selected && "hidden md:block")}>
        <div className="border-b border-slate-200 px-4 py-4 font-bold">{t("inbox")}<input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPageSize(150); }} maxLength={100} aria-label={t("search")} placeholder={t("search")} className="mt-3 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal outline-none focus:border-amber-500" /></div>
        <div className="max-h-[70vh] overflow-y-auto">
          {!loaded ? <p className="p-5 text-sm text-slate-500">{t("loading")}</p> : !items.length ? <p className="p-5 text-sm text-slate-500">{t("inboxEmpty")}</p> : items.map((item) => <button key={item.id} type="button" onClick={() => select(item.id)} className={cn("w-full border-b border-slate-100 px-4 py-4 text-left hover:bg-slate-50", selected === item.id && "bg-amber-50")}>
            <span className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-sm font-bold">{item.name}</span>{item.unread && <span title={t("newMessage")} aria-label={t("newMessage")} className="h-2.5 w-2.5 rounded-full bg-red-600" />}</span>
            <span className="mt-1 block text-xs text-slate-500">{t(item.category)} · {item.status === "open" ? t("open") : t("closed")}</span><span className="mt-1 block truncate text-xs text-slate-400">{item.preview}</span>
          </button>)}
          {items.length >= pageSize && pageSize < 1000 && <button type="button" onClick={() => setPageSize((n) => Math.min(1000, n + 150))} className="w-full p-4 text-center text-sm font-semibold text-amber-800 hover:bg-amber-50">{t("moreChats")}</button>}
        </div>
      </div>
      <div className={cn("flex min-h-0 min-w-0 flex-col md:min-h-[620px]", !selected && "hidden md:flex")}>
        {!selected ? <div className="grid flex-1 place-items-center p-6 text-center text-sm text-slate-400"><div><MessageCircle className="mx-auto mb-3 h-10 w-10" />{t("selectChat")}</div></div> : !chat ? <div className="grid flex-1 place-items-center p-6 text-sm text-slate-500"><div>{error || t("loading")}<button onClick={() => select(null)} className="ml-3 font-bold text-amber-700">{t("back")}</button></div></div> : <>
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-start gap-3"><button onClick={() => select(null)} aria-label={t("back")} className="rounded-lg p-2 hover:bg-slate-100 md:hidden"><ArrowLeft className="h-5 w-5" /></button><Face name={chat.conversation.name} src={null} /><div className="min-w-0 flex-1"><h2 className="break-words font-bold">{chat.conversation.name}</h2><p className="mt-0.5 text-xs text-slate-500">{t(chat.conversation.category)} · {chat.conversation.status === "open" ? t("open") : t("closed")}</p>{items.find((x) => x.id === selected)?.studentId && <p className="mt-1 text-xs text-slate-500">{t("studentId")}: {items.find((x) => x.id === selected)?.studentId}</p>}{chat.conversation.contact && <p className="mt-1 break-words text-xs text-slate-500">{t("contact")}: {chat.conversation.contact}</p>}</div></div>
            {chat.agents.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-xs text-emerald-700">● {t("active")}</span>{chat.agents.map((a) => <span key={a.id} className="flex items-center gap-1 text-xs font-semibold"><Face name={a.name} src={a.avatar} size="small" />{a.name}</span>)}</div>}
            <div className="mt-3 flex flex-wrap gap-2">{chat.conversation.status === "open" ? <><button disabled={busy} onClick={() => void act(joined ? "leave" : "join")} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{joined ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}{joined ? t("leave") : t("join")}</button><button disabled={busy} onClick={() => void act("close")} className={cn(input, "inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold disabled:opacity-50")}><CheckCircle2 className="h-4 w-4" />{t("closeChat")}</button></> : <button disabled={busy} onClick={() => void act("reopen")} className={cn(input, "inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold disabled:opacity-50")}><RotateCcw className="h-4 w-4" />{t("reopen")}</button>}<button disabled={busy} onClick={() => { if (window.confirm(t("deleteConfirm"))) void act("delete"); }} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-4 w-4" />{t("deleteChat")}</button></div>
            {chat.conversation.status === "open" && <p className="mt-2 text-xs text-slate-500">{joined ? t("joined") : t("joinHint")}</p>}
          </div>
          <div className="h-[420px] min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4"><ChatMessages key={chat.conversation.id} chat={chat} staffId={staffId} /></div>
          <form onSubmit={(e) => { e.preventDefault(); if (message.trim()) void act("send"); }} className="border-t border-slate-200 p-3">{error && <p role="alert" className="mb-2 text-xs text-red-700">{error}</p>}<div className="flex gap-2"><input value={message} onChange={(e) => setMessage(e.target.value)} disabled={!joined || busy || chat.conversation.status !== "open"} maxLength={2000} aria-label={t("message")} placeholder={t("messagePlaceholder")} className={cn(input, "h-11 min-w-0 flex-1 px-3 text-sm outline-none focus:border-amber-500 disabled:bg-slate-100")} /><button disabled={!joined || busy || !message.trim() || chat.conversation.status !== "open"} aria-label={t("send")} className="grid h-11 w-11 place-items-center rounded-xl bg-slate-900 text-white disabled:opacity-40"><Send className="h-4 w-4" /></button></div></form>
        </>}
      </div>
    </div>
  </div>;
}
