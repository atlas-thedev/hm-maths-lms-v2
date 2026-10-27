"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

const LINKS = [
  ["features", "/#features"],
  ["how", "/#how"],
  ["story", "/#story"],
  ["classes", "/#classes"],
  ["testimonials", "/#testimonials"],
  ["support", "/#support"],
] as const;

/** Floating glass navbar. `account` = where the main button should lead. */
export function LandingNav({ account }: { account: "guest" | "student" | "admin" }) {
  const t = useT("landing.nav");
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    const obs = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: "-45% 0px -50% 0px" });
    LINKS.forEach(([, href]) => { const el = document.getElementById(href.slice(2)); if (el) obs.observe(el); });
    return () => { window.removeEventListener("scroll", on); obs.disconnect(); };
  }, []);

  const cta = account === "admin" ? { href: "/admin", label: t("admin") }
    : account === "student" ? { href: "/dashboard", label: t("dashboard") }
    : { href: "/login", label: t("login") };

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-6 sm:pt-4">
      <motion.nav
        initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "pointer-events-auto mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-2xl border py-2 pl-3 pr-2 transition-all duration-300",
          scrolled ? "border-white/70 bg-white/80 shadow-lift backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70" : "border-transparent bg-white/40 backdrop-blur-md dark:bg-white/5",
        )}
      >
        <Logo />
        <div className="hidden items-center gap-0.5 lg:flex">
          {LINKS.map(([k, href]) => {
            const on = active === href.slice(2);
            return (
              <Link key={k} href={href} className={cn("relative rounded-xl px-3.5 py-2 text-[13px] font-semibold transition", on ? "text-teal-700 dark:text-teal-300" : "text-slate-600 hover:text-ink dark:text-slate-300 dark:hover:text-white")}>
                {on && <motion.span layoutId="landing-nav" className="absolute inset-0 rounded-xl bg-teal-50 dark:bg-teal-500/10" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
                <span className="relative">{t(k)}</span>
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5">
          <LanguageSwitcher className="hidden sm:inline-flex" />
          {account === "guest" && <Link href="/register" className="hidden rounded-xl px-4 py-2.5 text-[13px] font-semibold text-teal-700 transition hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-white/5 md:inline-flex">{t("register")}</Link>}
          <Link href={cta.href} className="group inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-700 to-teal-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-md shadow-teal-600/25 transition hover:-translate-y-px hover:shadow-lg hover:shadow-teal-600/30">
            {cta.label} <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </Link>
          <button type="button" onClick={() => setOpen(true)} aria-label={t("menu")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-teal-50 dark:text-slate-200 dark:hover:bg-white/10 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, pointerEvents: "none" }}
            className="pointer-events-auto fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)}>
            <motion.div initial={{ y: -20, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="m-3 rounded-3xl border border-white/70 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-slate-950" onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <Logo />
                <button type="button" onClick={() => setOpen(false)} aria-label={t("close")} className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-teal-50 dark:text-slate-300 dark:hover:bg-white/10">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid gap-1">
                {[...LINKS, ["store", "/store"] as const].map(([k, href], i) => (
                  <motion.div key={k} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}>
                    <Link href={href} onClick={() => setOpen(false)} className="block rounded-2xl px-4 py-3 text-base font-semibold text-slate-700 hover:bg-teal-50 hover:text-teal-700 dark:text-slate-200 dark:hover:bg-white/5">{t(k)}</Link>
                  </motion.div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between gap-2 border-t pt-4">
                <LanguageSwitcher />
                <div className="flex gap-2">
                  {account === "guest" && <Link href="/register" className="rounded-xl border border-teal-200 px-4 py-2.5 text-sm font-semibold text-teal-700">{t("register")}</Link>}
                  <Link href={cta.href} className="rounded-xl bg-gradient-to-r from-teal-700 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white">{cta.label}</Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
