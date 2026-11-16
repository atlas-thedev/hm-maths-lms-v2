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
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");
  const filtered = items.filter((item) => filter === "all" || item.status === filter);
  const unreadCount = items.filter((i) => i.unread).length;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-sm font-bold text-primary"><LifeBuoy className="h-4 w-4" /> {t("live")}</p>
        <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{t("inbox")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("inboxSubtitle")}</p>
      </div>
      {unreadCount > 0 && (
        <span className="inline-flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-600 dark:text-red-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          {unreadCount} {t("newMessage")}
        </span>
      )}
    </div>
    <div ref={panel} className={cn("grid scroll-mt-20 overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-soft md:min-h-[640px] md:grid-cols-[320px_1fr]", selected ? "h-[calc(100dvh-9rem)] min-h-[340px] md:h-auto" : "min-h-[640px]")}>
      <div className={cn("flex flex-col border-border bg-card md:border-r", selected && "hidden md:flex")}>
        <div className="space-y-3 border-b border-border p-4">
          <div className="flex items-center justify-between">
            <span className="font-display text-base font-bold">{t("inbox")}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{filtered.length}</span>
          </div>
          <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPageSize(150); }} maxLength={100} aria-label={t("search")} placeholder={t("search")} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20" />
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1 text-xs font-semibold">
            {(["all", "open", "closed"] as const).map((tab) => (
              <button key={tab} type="button" onClick={() => setFilter(tab)} className={cn("rounded-lg py-1.5 transition", filter === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                {tab === "all" ? "All" : t(tab)}
              </button>
            ))}
          </div>
        </div>
        <div className="max-h-[70vh] flex-1 overflow-y-auto divide-y divide-border/60">
          {!loaded ? <p className="p-5 text-sm text-muted-foreground">{t("loading")}</p> : !filtered.length ? <p className="p-5 text-sm text-muted-foreground">{t("inboxEmpty")}</p> : filtered.map((item) => <button key={item.id} type="button" onClick={() => select(item.id)} className={cn("w-full px-4 py-3.5 text-left transition hover:bg-accent/50", selected === item.id && "border-l-4 border-l-primary bg-primary/10")}>
            <span className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">{item.name}</span>{item.unread && <span title={t("newMessage")} aria-label={t("newMessage")} className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500 ring-2 ring-red-500/20" />}</span>
            <span className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-bold", item.status === "open" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground")}>{item.status === "open" ? t("open") : t("closed")}</span><span>· {t(item.category)}</span></span>
            {item.preview && <span className="mt-1.5 block truncate text-xs text-muted-foreground/80">{item.preview}</span>}
          </button>)}
          {items.length >= pageSize && pageSize < 1000 && <button type="button" onClick={() => setPageSize((n) => Math.min(1000, n + 150))} className="w-full p-4 text-center text-sm font-semibold text-primary hover:bg-primary/5">{t("moreChats")}</button>}
        </div>
      </div>
      <div className={cn("flex min-h-0 min-w-0 flex-col bg-background/40 md:min-h-[640px]", !selected && "hidden md:flex")}>
        {!selected ? <div className="grid flex-1 place-items-center p-6 text-center text-sm text-muted-foreground"><div><div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-muted"><MessageCircle className="h-7 w-7 text-muted-foreground" /></div><p className="font-medium">{t("selectChat")}</p></div></div> : !chat ? <div className="grid flex-1 place-items-center p-6 text-sm text-muted-foreground"><div>{error || t("loading")}<button onClick={() => select(null)} className="ml-3 font-bold text-primary">{t("back")}</button></div></div> : <>
          <div className="border-b border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <button onClick={() => select(null)} aria-label={t("back")} className="rounded-xl p-2 hover:bg-accent md:hidden"><ArrowLeft className="h-5 w-5" /></button>
              <Face name={chat.conversation.name} src={null} themed />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="break-words font-display text-base font-bold">{chat.conversation.name}</h2>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", chat.conversation.status === "open" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground")}>{chat.conversation.status === "open" ? t("open") : t("closed")}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{t(chat.conversation.category)}</p>
                <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {items.find((x) => x.id === selected)?.studentId && <span className="rounded-md bg-muted px-2 py-0.5 font-mono">{t("studentId")}: {items.find((x) => x.id === selected)?.studentId}</span>}
                  {chat.conversation.contact && <span className="rounded-md bg-muted px-2 py-0.5 break-all">{t("contact")}: {chat.conversation.contact}</span>}
                </div>
              </div>
            </div>
            {chat.agents.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />{t("active")}</span>{chat.agents.map((a) => <span key={a.id} className="flex items-center gap-1.5 rounded-full bg-muted py-0.5 pl-0.5 pr-2 text-xs font-semibold"><Face name={a.name} src={a.avatar} size="small" themed />{a.name}</span>)}</div>}
            <div className="mt-3 flex flex-wrap gap-2">
              {chat.conversation.status === "open" ? <>
                <button disabled={busy} onClick={() => void act(joined ? "leave" : "join")} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-brand-400 disabled:opacity-50">{joined ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}{joined ? t("leave") : t("join")}</button>
                <button disabled={busy} onClick={() => void act("close")} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-bold transition hover:bg-accent disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />{t("closeChat")}</button>
              </> : <button disabled={busy} onClick={() => void act("reopen")} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-bold transition hover:bg-accent disabled:opacity-50"><RotateCcw className="h-4 w-4" />{t("reopen")}</button>}
              <button disabled={busy} onClick={() => { if (window.confirm(t("deleteConfirm"))) void act("delete"); }} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-destructive transition hover:bg-destructive/10 disabled:opacity-50"><Trash2 className="h-4 w-4" />{t("deleteChat")}</button>
            </div>
            {chat.conversation.status === "open" && <p className="mt-2 text-xs text-muted-foreground">{joined ? t("joined") : t("joinHint")}</p>}
          </div>
          <div className="h-[420px] min-h-0 flex-1 overflow-y-auto bg-muted/25 p-4"><ChatMessages key={chat.conversation.id} chat={chat} staffId={staffId} /></div>
          <form onSubmit={(e) => { e.preventDefault(); if (message.trim()) void act("send"); }} className="border-t border-border bg-card p-3">{error && <p role="alert" className="mb-2 text-xs text-destructive">{error}</p>}<div className="flex gap-2"><input value={message} onChange={(e) => setMessage(e.target.value)} disabled={!joined || busy || chat.conversation.status !== "open"} maxLength={2000} aria-label={t("message")} placeholder={t("messagePlaceholder")} className="h-11 min-w-0 flex-1 rounded-2xl border border-input bg-background px-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60" /><button disabled={!joined || busy || !message.trim() || chat.conversation.status !== "open"} aria-label={t("send")} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-500 text-white shadow-sm transition hover:bg-brand-400 disabled:opacity-40"><Send className="h-4 w-4" /></button></div></form>
        </>}
      </div>
    </div>
  </div>;
}
