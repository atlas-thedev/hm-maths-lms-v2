"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Crown, Medal, Trophy } from "lucide-react";
import { PremiumMark } from "@/components/premium-badge";
import { cardVariants } from "@/components/ui/card";
import { cn, initials } from "@/lib/utils";

export type BoardRow = {
  key: string;
  rank: number;
  name: string;
  sub?: string;
  main: string;
  mainLabel?: string;
  side?: string;
  isMe?: boolean;
  /** Premium Verified ✓ next to the name. */
  premium?: boolean;
  /** Small note after the name, e.g. "(2nd attempt)". */
  note?: string;
};

const PODIUM = [
  { ring: "from-medal-gold-from to-medal-gold-to", h: "h-28 sm:h-32", text: "text-medal-gold-text" },
  { ring: "from-medal-silver-from to-medal-silver-to", h: "h-20 sm:h-24", text: "text-medal-silver-text" },
  { ring: "from-medal-bronze-from to-medal-bronze-to", h: "h-16 sm:h-20", text: "text-medal-bronze-text" },
];

export function RankMedal({ rank, className }: { rank: number; className?: string }) {
  if (rank <= 3) {
    const Icon = rank === 1 ? Crown : rank === 2 ? Trophy : Medal;
    return (
      <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br text-white shadow-md", PODIUM[rank - 1].ring, className)}>
        <Icon className="h-4 w-4" />
      </span>
    );
  }
  return <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted font-display text-sm font-bold text-muted-foreground", className)}>{rank}</span>;
}

function Avatar({ name, rank, big }: { name: string; rank: number; big?: boolean }) {
  return (
    <span className={cn("relative grid shrink-0 place-items-center rounded-full bg-gradient-to-br p-[3px] shadow-lg", rank <= 3 ? PODIUM[rank - 1].ring : "from-brand-400 to-brand-600", big ? "h-16 w-16 sm:h-20 sm:w-20" : "h-14 w-14 sm:h-16 sm:w-16")}>
      <span className="grid h-full w-full place-items-center rounded-full bg-card font-display text-base font-bold text-primary sm:text-lg">{initials(name)}</span>
    </span>
  );
}

/**
 * Animated leaderboard: the top 3 on a podium, then the next places as a list (up to `max` students in
 * all), plus the signed-in student's own row under "Your position" when they are further down.
 */
export function Leaderboard({ rows, emptyLabel, youLabel, premiumLabel, meLabel, max = 10 }: {
  rows: BoardRow[]; emptyLabel: string; youLabel: string; premiumLabel: string; meLabel: string; max?: number;
}) {
  if (!rows.length) {
    return <div className={cn(cardVariants({ variant: "outline" }), "border-dashed p-10 text-center text-sm text-muted-foreground")}>{emptyLabel}</div>;
  }
  const top = rows.filter((r) => r.rank <= 3).slice(0, 3);
  const rest = rows.filter((r) => !top.includes(r)).slice(0, Math.max(0, max - top.length));
  const me = rows.find((r) => r.isMe);
  const meOutside = me && !top.includes(me) && !rest.includes(me) ? me : null;
  const order = [1, 0, 2]; // 2nd, 1st, 3rd visual order
  const Row = ({ r, i }: { r: BoardRow; i: number }) => (
    <motion.li initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 15) * 0.035 }} data-testid="board-row"
      className={cn("flex items-center gap-3 rounded-2xl border bg-card px-3 py-2.5 shadow-soft transition hover:-translate-y-px hover:shadow-lift sm:px-4",
        r.isMe ? "border-primary/40 bg-accent/70 ring-2 ring-primary/20" : "border-border/80 dark:border-white/10")}>
      <RankMedal rank={r.rank} />
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-brand-soft text-xs font-bold text-primary">{initials(r.name)}</span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
          <span className="truncate">{r.name}</span>
          {r.premium && <PremiumMark label={premiumLabel} />}
          {r.note && <span className="shrink-0 text-[11px] font-normal text-muted-foreground">{r.note}</span>}
          {r.isMe && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">{youLabel}</span>}
        </p>
        {r.sub && <p className="truncate text-xs text-muted-foreground">{r.sub}</p>}
      </div>
      {r.side && <span className="hidden text-xs text-muted-foreground sm:block">{r.side}</span>}
      <div className="text-right">
        <p className="font-display text-base font-bold">{r.main}</p>
        {r.mainLabel && <p className="text-[10px] text-muted-foreground">{r.mainLabel}</p>}
      </div>
    </motion.li>
  );
  return (
    <div className="space-y-5">
      {top.length >= 1 && (
        <div className="relative overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-b from-accent via-card to-card p-4 pt-6 shadow-soft">
          <div className="pointer-events-none absolute inset-0 bg-dots opacity-40" />
          <div className="relative grid grid-cols-3 items-end gap-2 sm:gap-4">
            {order.map((i) => {
              const r = top[i];
              if (!r) return <div key={`empty-${i}`} />;
              const p = PODIUM[Math.min(i, 2)];
              return (
                <motion.div key={r.key} style={{ gridColumnStart: order.indexOf(i) + 1 }}
                  initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.12, type: "spring", stiffness: 160, damping: 18 }}
                  className="flex min-w-0 flex-col items-center text-center">
                  {i === 0 && <Crown className="mb-1 h-6 w-6 animate-bounce text-medal-gold-to" />}
                  <Avatar name={r.name} rank={i + 1} big={i === 0} />
                  <p className={cn("mt-2 flex w-full items-center justify-center gap-1 text-sm font-semibold", r.isMe && "text-primary")}>
                    <span className="truncate">{r.name}</span>{r.premium && <PremiumMark label={premiumLabel} />}
                  </p>
                  {r.note && <p className="w-full truncate text-[10px] text-muted-foreground">{r.note}</p>}
                  {r.sub && <p className="w-full truncate text-[11px] text-muted-foreground">{r.sub}</p>}
                  <p className={cn("mt-1 font-display text-lg font-bold", p.text)}>{r.main}</p>
                  <div className={cn("mt-2 grid w-full place-items-center rounded-t-2xl bg-gradient-to-b font-display text-3xl font-extrabold text-white/90 shadow-inner", p.ring, p.h)}>{r.rank}</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
      {rest.length > 0 && <ol className="space-y-2">{rest.map((r, i) => <Row key={r.key} r={r} i={i} />)}</ol>}
      {meOutside && (
        <div className="space-y-2" data-testid="board-me">
          <p className="px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{meLabel}</p>
          <ol><Row r={meOutside} i={0} /></ol>
        </div>
      )}
    </div>
  );
}

/** Link-based filter pills with an animated active indicator. */
export function FilterTabs({ items, active, id }: { items: { value: string; label: string; href: string }[]; active: string; id: string }) {
  return (
    <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto rounded-2xl border border-border/80 bg-card/80 p-1 shadow-soft backdrop-blur">
      {items.map((it) => {
        const on = it.value === active;
        return (
          <Link key={it.value} href={it.href} scroll={false}
            className={cn("relative shrink-0 rounded-xl px-3.5 py-1.5 text-sm font-semibold transition", on ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
            {on && <motion.span layoutId={`tab-${id}`} className="absolute inset-0 rounded-xl bg-gradient-brand shadow-md shadow-primary/25" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
            <span className="relative">{it.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
