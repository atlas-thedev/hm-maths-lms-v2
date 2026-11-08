"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowUpRight, LifeBuoy, MessageCircle, Send, X } from "lucide-react";
import { WhatsAppIcon } from "@/components/brand-icons";
import { useSite, useT } from "@/i18n/client";
import { cn, whatsappLink } from "@/lib/utils";
import { ChatMessages, Face, request, type Chat } from "./shared";

export function SupportWidget({ accountName }: { accountName: string | null }) {
  const t = useT("support");
  const site = useSite();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [viewerName, setViewerName] = useState(accountName);
  const requestVersion = useRef(0);
  const lastSeen = useRef<string | null>(null);
  const lastSeenChat = useRef<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [screen, setScreen] = useState<"choice" | "chat">("choice");
  const [chat, setChat] = useState<Chat | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [category, setCategory] = useState("slip");
  const [message, setMessage] = useState("");
  const wa = whatsappLink(site.contact.whatsapp, t("whatsappText"));
  const hidden = path.startsWith("/admin") || path.startsWith("/dev");
  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    try { const result = await request<{ chat: Chat | null; accountName: string | null }>("/api/support"); if (version === requestVersion.current) { setChat(result.chat); setViewerName(result.accountName); setLoaded(true); setError(""); } }
    catch { if (version === requestVersion.current) { setLoaded(true); setError(t("error")); } }
  }, [t]);
  useEffect(() => {
    if (!open || screen !== "chat" || hidden || busy) return;
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 8000);
    return () => window.clearInterval(timer);
  }, [open, screen, hidden, busy, load]);
  useEffect(() => {
    if (!chat) { lastSeen.current = null; lastSeenChat.current = null; setUnread(0); return; }
    if (lastSeenChat.current !== chat.conversation.id) { lastSeenChat.current = chat.conversation.id; lastSeen.current = null; setUnread(0); }
    if (open && screen === "chat") { lastSeen.current = chat.messages.at(-1)?.id ?? null; setUnread(0); return; }
    if (!lastSeen.current) return;
    const index = chat.messages.findIndex((m) => m.id === lastSeen.current);
    setUnread(chat.messages.slice(index + 1).filter((m) => m.sender === "staff").length);
  }, [chat, open, screen]);
  useEffect(() => {
    if (open || !chat || hidden) return;
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 30000);
    return () => clearInterval(timer);
  }, [open, !!chat, hidden, load]); // only poll in the background after this tab has opened a chat
  useEffect(() => { setOpen(false); }, [hidden]);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || busy) return;
    setBusy(true); setError(""); ++requestVersion.current;
    try {
      const response = await request<{ chat: Chat }>("/api/support", chat
        ? { action: "send", message }
        : { action: "start", name: viewerName ?? name, contact, category, message });
      setChat(response.chat); setMessage("");
    } catch { setError(t("error")); }
    finally { setBusy(false); }
  }
  if (hidden) return null;
  return <div className={cn("fixed right-4 z-[80] font-sans", path.startsWith("/dashboard") ? "bottom-24 sm:bottom-5" : "bottom-5")}>
    {open ? <section role="dialog" aria-labelledby="support-title" className="flex h-[min(680px,calc(100dvh-7rem))] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-[0_18px_70px_rgba(15,23,42,.25)]">
      <header className="flex shrink-0 items-center gap-3 bg-slate-900 px-5 py-4 text-white">
        {screen === "chat" ? <button type="button" onClick={() => setScreen("choice")} aria-label={t("back")} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20"><ArrowLeft className="h-4 w-4" /></button> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-400 text-slate-900"><LifeBuoy className="h-5 w-5" /></span>}
        <div className="min-w-0 flex-1"><h2 id="support-title" className="font-display text-base font-bold">{t("title")}</h2><p className="text-xs text-slate-300">{t("subtitle")}</p></div>
        <button type="button" onClick={() => setOpen(false)} aria-label={t("close")} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10"><X className="h-5 w-5" /></button>
      </header>
      {screen === "choice" ? <div className="flex-1 overflow-y-auto p-5">
        <p className="text-lg font-bold">{t("choose")}</p><p className="mt-1 text-sm leading-relaxed text-slate-500">{t("chooseHint")}</p>
        <div className="mt-6 space-y-3">
          {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-500 hover:bg-emerald-50"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-600 text-white"><WhatsAppIcon mono className="h-6 w-6" /></span><span className="min-w-0 flex-1"><strong className="block text-sm">{t("whatsapp")}</strong><span className="text-xs text-slate-500">{t("whatsappHint")}</span></span><ArrowUpRight className="h-4 w-4 text-slate-400" /></a>}
          <button type="button" onClick={() => { setLoaded(false); setScreen("chat"); }} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 p-4 text-left transition hover:border-amber-500 hover:bg-amber-50"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-400 text-slate-900"><MessageCircle className="h-6 w-6" /></span><span className="min-w-0 flex-1"><strong className="block text-sm">{t("live")}</strong><span className="text-xs text-slate-500">{t("liveHint")}</span></span><ArrowUpRight className="h-4 w-4 text-slate-400" /></button>
        </div>
      </div> : !loaded ? <div className="grid flex-1 place-items-center text-sm text-slate-500">{t("loading")}</div> : chat ? <>
        <div className="border-b border-slate-100 bg-white px-4 py-3">{chat.agents.length ? <div><p className="mb-2 text-[11px] font-semibold text-emerald-700">● {t("active")}</p><div className="flex flex-wrap gap-3">{chat.agents.map((a) => <div key={a.id} className="flex items-center gap-2"><Face name={a.name} src={a.avatar} size="small" /><span className="text-xs font-semibold">{a.name}</span></div>)}</div></div> : <p className="text-xs leading-relaxed text-slate-500">{t("waiting")}</p>}</div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-4 py-5"><ChatMessages key={chat.conversation.id} chat={chat} /></div>
        <form onSubmit={send} className="shrink-0 border-t border-slate-200 bg-white p-3">
          {chat.conversation.status === "closed" && <p className="mb-2 text-xs text-slate-500">{t("resolved")}</p>}
          {error && <p role="alert" className="mb-2 text-xs text-red-700">{error}</p>}
          <div className="flex items-center gap-2"><input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} aria-label={t("message")} placeholder={t("messagePlaceholder")} className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-amber-500" /><button disabled={busy || !message.trim()} aria-label={t("send")} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-900 text-white disabled:opacity-40"><Send className="h-4 w-4" /></button></div>
        </form>
      </> : <form onSubmit={send} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        <h3 className="text-lg font-bold">{t("startTitle")}</h3>
        {!viewerName && <label className="block text-xs font-semibold text-slate-700">{t("name")}<input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} autoComplete="name" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-amber-500" /></label>}
        <label className="block text-xs font-semibold text-slate-700">{t("contact")}<input value={contact} onChange={(e) => setContact(e.target.value)} maxLength={100} autoComplete="tel" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-amber-500" /></label>
        <label className="block text-xs font-semibold text-slate-700">{t("topic")}<select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="slip">{t("slip")}</option><option value="bug">{t("bug")}</option><option value="other">{t("other")}</option></select></label>
        <label className="block text-xs font-semibold text-slate-700">{t("message")}<textarea value={message} onChange={(e) => setMessage(e.target.value)} required maxLength={2000} rows={3} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-amber-500" /></label>
        <p className="text-xs leading-relaxed text-slate-500">{t("privacy")}</p>{!viewerName && <p className="text-xs leading-relaxed text-slate-500">{t("guestNote")}</p>}
        {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
        <button disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-bold text-white disabled:opacity-50">{busy ? t("sending") : t("start")} <Send className="h-4 w-4" /></button>
      </form>}
    </section> : <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3.5 text-sm font-bold text-white shadow-[0_8px_30px_rgba(15,23,42,.3)] transition hover:bg-slate-800"><MessageCircle className="h-5 w-5 text-amber-400" />{t("title")}{unread > 0 && <span aria-label={t("newMessage")} className="grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-xs text-white">{unread > 99 ? "99+" : unread}</span>}</button>}
  </div>;
}
