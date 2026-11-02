"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { SectionTitle } from "./section-title";

type QA = { q: string; a: string };

export function Faq({ bare = false }: { bare?: boolean }) {
  const t = useT("landing.faq");
  const items = t.raw<QA[]>("items") ?? [];
  const [open, setOpen] = useState<number | null>(0);
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, 5);

  return (
    <section id="support" className={cn("relative scroll-mt-24", !bare && "py-14 sm:py-24")}>
      {!bare && <SectionTitle label={t("label")} title={t("title")} />}
      <div className={cn("max-w-3xl space-y-3", !bare && "container mt-12")}>
        {shown.map((it, i) => {
          const isOpen = open === i;
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 5) * 0.05 }}
              className={cn("overflow-hidden rounded-2xl border transition-colors", isOpen ? "border-teal-300 bg-white shadow-lift dark:border-teal-500/40 dark:bg-slate-900" : "border-teal-100 bg-white/80 shadow-soft hover:border-teal-200 dark:border-white/10 dark:bg-slate-900/70")}>
              <button type="button" onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5">
                <span className="font-display text-[15px] font-semibold text-ink dark:text-white sm:text-base">{it.q}</span>
                <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full transition", isOpen ? "rotate-45 bg-gradient-to-br from-teal-700 to-teal-600 text-white" : "bg-teal-50 text-teal-700 dark:bg-white/5 dark:text-teal-300")}>
                  <Plus className="h-4 w-4" />
                </span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
                    <p className="px-5 pb-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:px-6">{it.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
        {items.length > 5 && (
          <div className="pt-4 text-center">
            <button type="button" onClick={() => setAll((v) => !v)}
              className="rounded-xl border border-teal-200 bg-white px-6 py-2.5 text-sm font-semibold text-teal-700 shadow-sm transition hover:-translate-y-px hover:border-teal-400 dark:bg-white/5 dark:text-teal-200">
              {all ? t("less") : t("more")}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
