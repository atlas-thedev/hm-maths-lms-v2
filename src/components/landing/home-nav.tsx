"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

const LINKS = [["home", "home"], ["process", "process"], ["teacher", "teacher"], ["centers", "centers"], ["classes", "classes"], ["stories", "stories"], ["gallery", "gallery"], ["support", "support"]] as const;
/** Sections that have a page of their own: the nav goes there instead of scrolling. */
const PAGE_LINKS: Record<string, string> = { gallery: "/gallery" };

/** Floating white pill navbar (cmwithmn-style). */
export function HomeNav({ account }: { account: "guest" | "student" | "admin" }) {
  const t = useT("landing.home.nav");
  const tn = useT("landing.nav");
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const onHome = pathname === "/";
  const [seen, setSeen] = useState("home");
  // On the home page the section in view is active; on /gallery the Gallery link is; elsewhere nothing is.
  const active = onHome ? seen : pathname.startsWith("/gallery") ? "gallery" : "";

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    const obs = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setSeen(e.target.id)), { rootMargin: "-45% 0px -50% 0px" });
    LINKS.forEach(([, id]) => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => { window.removeEventListener("scroll", on); obs.disconnect(); };
  }, [onHome]);

  const cta = account === "admin" ? { href: "/admin", label: tn("admin") }
    : account === "student" ? { href: "/dashboard", label: tn("dashboard") }
    : { href: "/login", label: tn("login") };

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:pt-4">
      <motion.nav initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={cn("pointer-events-auto mx-auto flex max-w-5xl items-center justify-between gap-2 rounded-full border py-1.5 pl-2 pr-1.5 transition-all duration-300",
          scrolled ? "border-black/[0.06] bg-white/85 shadow-[0_10px_40px_-12px_rgba(20,14,10,.18)] backdrop-blur-xl" : "dark-top border-white/10 bg-white/[0.06] text-white backdrop-blur-md")}>
        <Logo tone={scrolled ? "auto" : "dark"} />
        <div className="hidden items-center lg:flex">
          {LINKS.map(([k, id]) => (
            <Link key={k} href={PAGE_LINKS[id] ?? `/#${id}`} aria-current={active === id ? "page" : undefined} className={cn("relative rounded-full px-3 py-2 text-[13px] font-medium transition", active === id ? "text-ink" : scrolled ? "text-slate-500 hover:text-ink" : "text-white/90 hover:text-white")}>
              {active === id && <motion.span layoutId="home-nav" className="absolute inset-0 rounded-full bg-brand-50 ring-1 ring-brand-100" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
              <span className="relative">{t(k)}</span>
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <LanguageSwitcher className={cn("hidden sm:inline-flex", scrolled ? "text-slate-600 hover:bg-slate-100" : "text-white/90 hover:bg-white/10 hover:text-white")} />
          <Link href={cta.href} className="rounded-full bg-brand-500 px-5 py-2.5 text-[13px] font-bold text-white shadow-md shadow-brand-500/25 transition hover:-translate-y-px hover:bg-brand-400">{cta.label}</Link>
          <button type="button" onClick={() => setOpen(true)} aria-label={tn("menu")} className={cn("inline-flex h-10 w-10 items-center justify-center rounded-full lg:hidden", scrolled ? "text-slate-700 hover:bg-slate-100" : "text-white hover:bg-white/10")}>
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, pointerEvents: "none" }} className="pointer-events-auto fixed inset-0 z-50 bg-black/30 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)}>
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="m-3 rounded-3xl bg-white p-5 text-ink shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-3 flex items-center justify-between">
                <Logo />
                <button type="button" onClick={() => setOpen(false)} aria-label={tn("close")} className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-100"><X className="h-5 w-5" /></button>
              </div>
              <div className="grid gap-1">
                {LINKS.map(([k, id], i) => (
                  <motion.div key={k} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}>
                    <Link href={PAGE_LINKS[id] ?? `/#${id}`} onClick={() => setOpen(false)} aria-current={active === id ? "page" : undefined} className={cn("block rounded-2xl px-4 py-3 font-semibold hover:bg-brand-50 hover:text-brand-700", active === id ? "bg-brand-50 text-brand-700" : "text-slate-700")}>{t(k)}</Link>
                  </motion.div>
                ))}
                <Link href="/store" onClick={() => setOpen(false)} className="block rounded-2xl px-4 py-3 font-semibold text-slate-700 hover:bg-brand-50 hover:text-brand-700">{tn("store")}</Link>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
                <LanguageSwitcher className="text-slate-600" />
                <div className="flex gap-2">
                  {account === "guest" && <Link href="/register" className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold">{tn("register")}</Link>}
                  <Link href={cta.href} className="rounded-full bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-brand-500/20">{cta.label}</Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
