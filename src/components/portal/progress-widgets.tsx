"use client";

import { useId } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Award, BadgeCheck, BookOpenCheck, CircleCheckBig, Crown, Flame, Gem, Lock, MapPin, Medal, Rocket, Star, Target, TrendingUp, Trophy, Zap,
  type LucideIcon,
} from "lucide-react";
import { useT } from "@/i18n/client";
import { CountUp } from "@/components/motion";
import { cn } from "@/lib/utils";
import { STREAK_KEYS, nextMilestone, type BadgeKey, type StreakKey, type Streaks } from "@/lib/papers";
import { IconTile } from "@/components/ui/icon-tile";
import { MetricTile, ProgressBar } from "@/components/ui/blocks";
import { asTone, toneSolid, type Tone } from "@/components/ui/tone";
import { cardVariants } from "@/components/ui/card";

/** Animated circular percentage ring. */
export function ScoreRing({ value, size = 132, stroke = 12, label, sub }: { value: number; size?: number; stroke?: number; label?: string; sub?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const id = `ring-${useId().replace(/:/g, "")}`;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-teal-100 dark:stroke-white/10" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round" stroke={`url(#${id})`}
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c - (c * v) / 100 }}
          transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }} />
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" style={{ stopColor: "hsl(var(--brand-600))" }} /><stop offset="1" style={{ stopColor: "hsl(var(--brand-400))" }} /></linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display text-2xl font-extrabold leading-none"><CountUp value={v} decimals={v % 1 ? 1 : 0} suffix="%" /></span>
        {label && <span className="mt-1 text-[11px] font-semibold text-muted-foreground">{label}</span>}
        {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}

/** Icon + theme tone for each streak (colours come from src/theme/theme.css). */
export const STREAK_META: Record<StreakKey, { icon: LucideIcon; tone: Tone }> = {
  top3: { icon: Crown, tone: "warning" },
  top10: { icon: Trophy, tone: "brand" },
  score75: { icon: Star, tone: "highlight" },
  pass50: { icon: CircleCheckBig, tone: "success" },
  improve: { icon: TrendingUp, tone: "info" },
  attend: { icon: Flame, tone: "danger" },
};

/** Performance streaks: top 3 / top 10 / 75+ / 50+ / improving / weekly papers. */
export function StreakPanel({ streaks, className }: { streaks: Streaks; className?: string }) {
  const t = useT("portal.streak");
  return (
    <div className={cn(cardVariants({ padding: "md" }), className)}>
      <div className="mb-4">
        <p className="font-display text-lg font-bold">{t("title")}</p>
        <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3">
        {STREAK_KEYS.map((k, i) => {
          const { icon: Icon, tone } = STREAK_META[k];
          const v = streaks[k];
          const goal = nextMilestone(v.current);
          const on = v.current > 0;
          return (
            <motion.div key={k} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              title={t(`types.${k}.rule`)}
              className={cn("relative overflow-hidden min-w-0 rounded-2xl border p-3 sm:p-3.5 transition", on ? cn("border-transparent shadow-lift", toneSolid[tone]) : "border-dashed bg-muted/40")}>
              {on && <div className="pointer-events-none absolute -right-5 -top-5 h-16 w-16 rounded-full bg-white/20 blur-xl" />}
              <div className="relative flex items-center gap-2.5">
                <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", on ? "bg-white/20" : "bg-muted text-muted-foreground")}>
                  <Icon className={cn("h-[18px] w-[18px]", on && k === "attend" && "animate-flicker")} />
                </span>
                <p className={cn("min-w-0 text-xs font-semibold leading-tight", !on && "text-muted-foreground")}>{t(`types.${k}.name`)}</p>
              </div>
              <p className="relative mt-3 font-display text-3xl font-extrabold leading-none"><CountUp value={v.current} /></p>
              <p className={cn("relative mt-1 text-[11px]", on ? "text-white/95" : "text-muted-foreground")}>{t(`types.${k}.rule`)}</p>
              <div className={cn("relative mt-2.5 h-1.5 overflow-hidden rounded-full", on ? "bg-white/25" : "bg-muted")}>
                <motion.span className={cn("block h-full rounded-full", on ? "bg-white" : "bg-muted-foreground/30")}
                  initial={{ width: 0 }} animate={{ width: `${Math.min(100, (v.current / goal) * 100)}%` }} transition={{ duration: 0.9 }} />
              </div>
              <p className={cn("relative mt-1.5 flex flex-wrap justify-between gap-x-2 gap-y-1 text-[11px] font-medium", on ? "text-white/90" : "text-muted-foreground")}>
                <span>{t("best", { n: v.best })}</span><span>{t("next", { n: goal })}</span>
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

const BADGE_ICONS: Record<BadgeKey, { icon: LucideIcon; tone: Tone }> = {
  premium: { icon: BadgeCheck, tone: "info" },
  firstPaper: { icon: Rocket, tone: "brand" },
  streak3: { icon: Flame, tone: "danger" },
  streak5: { icon: Zap, tone: "brand" },
  streak10: { icon: Gem, tone: "highlight" },
  score90: { icon: Star, tone: "warning" },
  fullMarks: { icon: Target, tone: "success" },
  top10: { icon: Medal, tone: "brand" },
  townChampion: { icon: MapPin, tone: "success" },
  champion: { icon: Crown, tone: "warning" },
  papers10: { icon: BookOpenCheck, tone: "highlight" },
  hot10: { icon: Trophy, tone: "danger" },
  pass50x5: { icon: CircleCheckBig, tone: "success" },
  score75x3: { icon: Award, tone: "highlight" },
  improve3: { icon: TrendingUp, tone: "info" },
};

export function Achievements({ items }: { items: { key: BadgeKey; unlocked: boolean }[] }) {
  const t = useT("portal.badges");
  const done = items.filter((i) => i.unlocked).length;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{t("progress", { n: done, total: items.length })}</span>
        <ProgressBar value={done} max={Math.max(1, items.length)} className="h-1.5 w-32" label={t("progress", { n: done, total: items.length })} />
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {items.map(({ key, unlocked }, i) => {
          const { icon: Icon, tone } = BADGE_ICONS[key];
          return (
            <motion.div key={key} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}
              title={t(`${key}.hint`)} className={cn("group flex flex-col items-center rounded-2xl border p-3 text-center transition", unlocked ? "border-border/80 bg-card shadow-soft hover:-translate-y-0.5 hover:shadow-lift" : "border-dashed bg-muted/40")}>
              <IconTile icon={unlocked ? Icon : Lock} tone={unlocked ? tone : "neutral"} variant={unlocked ? "solid" : "soft"} size="lg" />
              <span className={cn("mt-2 line-clamp-2 text-[11px] font-semibold leading-tight", !unlocked && "text-muted-foreground")}>{t(`${key}.name`)}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/** Small rank card: "#3 of 120 · Panadura". */
export function RankTile({ icon = "trophy", label, rank, of, href, tone = "brand" }: { icon?: "trophy" | "pin" | "star"; label: string; rank: number | null; of?: number | null; href?: string; tone?: Tone | "blue" | "sky" | "amber" }) {
  const t = useT("portal.ranks");
  const Icon = icon === "pin" ? MapPin : icon === "star" ? Star : Trophy;
  return <MetricTile icon={Icon} tone={tone} label={label} value={rank ? `#${rank}` : "—"} sub={rank && of ? t("of", { n: of }) : undefined} href={href} />;
}
