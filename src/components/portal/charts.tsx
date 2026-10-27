"use client";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { EmptyNote } from "@/components/ui/misc";

/** Vertical bar chart of percentages (0–100). */
export function ResultsChart({ data, emptyLabel, emptyHint }: { data: { label: string; value: number; title: string }[]; emptyLabel: string; emptyHint?: string }) {
  const ticks = [100, 75, 50, 25, 0];
  if (!data.length) return <EmptyNote icon={BarChart3} title={emptyLabel} description={emptyHint} />;
  return (
    <div className="pb-5">
    {/* The in-view trigger sits on the chart box: the bars start at zero height, which the browser can't "see" scrolling in. */}
    <motion.div className="relative h-56 pl-8" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
      {ticks.map((v) => (
        <div key={v} className="absolute left-8 right-0 border-t border-dashed border-slate-200 dark:border-slate-800" style={{ top: `${100 - v}%` }}>
          <span className="absolute -left-8 -top-2 w-6 text-right text-[10px] font-medium text-slate-500 dark:text-slate-400">{v}</span>
        </div>
      ))}
      <div className="relative flex h-full items-end gap-3 px-2">
          {data.map((d, i) => (
            <div key={i} className="group relative flex h-full flex-1 flex-col justify-end" title={`${d.title}: ${d.value}%`}>
              <motion.div variants={{ hidden: { height: 0 }, show: { height: `${Math.max(2, d.value)}%` } }}
                transition={{ delay: i * 0.08, duration: 0.8, ease: "easeOut" }}
                className="relative mx-auto w-full max-w-[38px] rounded-t-lg bg-gradient-to-t from-teal-700 to-teal-500">
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[11px] font-bold text-slate-800 dark:text-slate-200">{d.value}</span>
              </motion.div>
              <span className="absolute -bottom-5 left-1/2 w-full -translate-x-1/2 truncate text-center text-[10px] font-medium text-slate-500 dark:text-slate-400">{d.label}</span>
            </div>
          ))}
        </div>
    </motion.div>
    </div>
  );
}

/** Semicircle gauge (0–100). */
export function Gauge({ value, label }: { value: number; label: string }) {
  const r = 70, c = Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <motion.div className="relative mx-auto w-full max-w-[220px]" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }}>
      <svg viewBox="0 0 180 100" className="w-full">
        <path d="M20 90 A70 70 0 0 1 160 90" fill="none" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="14" strokeLinecap="round" />
        <motion.path d="M20 90 A70 70 0 0 1 160 90" fill="none" stroke="url(#gauge)" strokeWidth="14" strokeLinecap="round"
          strokeDasharray={c} variants={{ hidden: { strokeDashoffset: c }, show: { strokeDashoffset: c - (c * v) / 100 } }}
          transition={{ duration: 1.2, ease: "easeOut" }} />
        <defs>
          <linearGradient id="gauge" x1="0" x2="1"><stop offset="0" style={{ stopColor: "hsl(var(--brand-600))" }} /><stop offset="1" style={{ stopColor: "hsl(var(--brand-400))" }} /></linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-x-0 bottom-1 text-center">
        <p className="font-display text-2xl font-bold text-slate-900 dark:text-white">{Math.round(v)}%</p>
        <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{label}</p>
      </div>
    </motion.div>
  );
}
