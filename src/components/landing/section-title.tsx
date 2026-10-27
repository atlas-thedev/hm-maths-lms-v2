"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { SplitReveal } from "./motion-kit";

export function HexIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-4 w-4", className)} aria-hidden>
      <path d="M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

/** Big gradient section heading (label kept for API compatibility, not rendered). */
export function SectionTitle({ title, subtitle, className, align = "center" }: {
  label: string; title: string; subtitle?: string; className?: string; align?: "center" | "left";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={cn(align === "center" ? "mx-auto text-center" : "", "max-w-3xl px-5", className)}
    >
      <h2 className="text-balance px-1 pb-2 font-display text-[2rem] font-extrabold leading-[1.2] tracking-tight text-ink dark:text-white sm:text-5xl">
        <SplitReveal text={title} wordClassName="bg-gradient-to-r from-teal-800 via-teal-700 to-teal-700 bg-clip-text text-transparent" />
      </h2>
      {subtitle ? <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg">{subtitle}</p> : null}
    </motion.div>
  );
}
