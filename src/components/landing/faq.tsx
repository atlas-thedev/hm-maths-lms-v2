"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

type QA = { q: string; a: string };

/** Questions & answers (landing.faq). `bare` drops the section heading/padding for use inside the portal. */
export function Faq({ bare = false }: { bare?: boolean }) {
  const t = useT("landing.faq");
  const items = t.raw<QA[]>("items") ?? [];
  const [open, setOpen] = useState<number | null>(0);
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, 5);

  return (
    <section id="support" className={cn("relative scroll-mt-24", !bare && "py-14 sm:py-20")}>
      {!bare && (
        <div className="mx-auto max-w-2xl px-5 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">{t("label")}</p>
          <h2 className="mt-2 text-balance font-display text-[1.75rem] font-bold leading-tight tracking-tight text-ink sm:text-4xl">{t("title")}</h2>
        </div>
      )}
      <div className={cn("max-w-3xl space-y-3", !bare && "container mt-10")}>
        {shown.map((it, i) => {
          const isOpen = open === i;
          return (
            <div key={i}
              className={cn("overflow-hidden rounded-2xl border transition-colors", isOpen ? "border-brand-200 bg-white shadow-md dark:border-brand-500/40 dark:bg-card" : "border-slate-200/80 bg-white hover:border-brand-200 dark:border-white/10 dark:bg-card")}>
              <button type="button" onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5">
                <span className="font-display text-[15px] font-semibold text-ink dark:text-white sm:text-base">{it.q}</span>
                <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full transition", isOpen ? "rotate-45 bg-brand-500 text-white" : "bg-brand-50 text-brand-700 dark:bg-white/5 dark:text-brand-300")}>
                  <Plus className="h-4 w-4" />
                </span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                    <p className="px-5 pb-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:px-6">{it.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
        {items.length > 5 && (
          <div className="pt-4 text-center">
            <button type="button" onClick={() => setAll((v) => !v)}
              className="rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:border-brand-300 hover:text-brand-700 dark:bg-white/5 dark:text-white">
              {all ? t("less") : t("more")}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
