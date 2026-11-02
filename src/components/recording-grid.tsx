"use client";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, Play, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ChipButton, ChipGroup } from "@/components/ui/blocks";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

export type RecordingItem = {
  id: string; href: string; title: string; description: string | null;
  week: number;
  /** Small label under the thumbnail, e.g. "Week 2" or "October 2026 · Week 2". */
  tag: string;
  thumb: string | null; date: string | null; isNew: boolean;
};

/**
 * Recordings as a thumbnail grid (newest first, as the server sorts them). With more than one week, a row of
 * week chips filters the grid instead of splitting it into one short row per week.
 */
export function RecordingGrid({ items, filter = true }: { items: RecordingItem[]; filter?: boolean }) {
  const t = useT("portal.classroom");
  const [week, setWeek] = useState<number | null>(null);
  const weeks = useMemo(() => {
    const counts = new Map<number, number>();
    for (const i of items) counts.set(i.week, (counts.get(i.week) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0] - b[0]);
  }, [items]);
  const shown = week === null ? items : items.filter((i) => i.week === week);

  return (
    <div className="space-y-4">
      {filter && weeks.length > 1 && (
        <ChipGroup>
          <ChipButton active={week === null} onClick={() => setWeek(null)}>
            {t("allWeeks")} <Count n={items.length} active={week === null} />
          </ChipButton>
          {weeks.map(([w, n]) => (
            <ChipButton key={w} active={week === w} onClick={() => setWeek(w)}>
              {t("week", { n: w })} <Count n={n} active={week === w} />
            </ChipButton>
          ))}
        </ChipGroup>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 sm:gap-5">
        {shown.map((r) => <RecordingCard key={r.id} r={r} />)}
      </div>
    </div>
  );
}

function Count({ n, active }: { n: number; active: boolean }) {
  return <span className={cn("rounded-full px-1.5 text-[11px] font-bold tabular-nums", active ? "bg-white/25" : "bg-muted text-muted-foreground")}>{n}</span>;
}

function RecordingCard({ r }: { r: RecordingItem }) {
  const t = useT("portal.classroom");
  return (
    <Link href={r.href} data-testid="recording-card"
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/10">
      <div className="relative aspect-video overflow-hidden bg-muted">
        {r.thumb ? (
          <Image src={r.thumb} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 400px" className="object-cover transition duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="grid h-full place-items-center"><PlayCircle className="h-10 w-10 text-muted-foreground/60" /></div>
        )}
        {/* Play button: always visible on touch screens, on hover with a mouse. */}
        <span className="absolute inset-0 grid place-items-center bg-black/10 transition [@media(hover:hover)]:bg-black/0 [@media(hover:hover)]:group-hover:bg-black/25">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-black shadow-lg transition [@media(hover:hover)]:scale-90 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:scale-100 [@media(hover:hover)]:group-hover:opacity-100">
            <Play className="ml-0.5 h-5 w-5 fill-black" />
          </span>
        </span>
        {r.isNew && <span className="absolute left-2.5 top-2.5 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold uppercase text-primary-foreground shadow">{t("new")}</span>}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="success">{t("video")}</Badge>
          <Badge variant="secondary">{r.tag}</Badge>
        </div>
        <p className="line-clamp-2 font-semibold leading-snug transition group-hover:text-primary">{r.title}</p>
        {r.description && <p className="line-clamp-1 text-xs text-muted-foreground">{r.description}</p>}
        {r.date && (
          <p className="mt-auto flex items-center gap-1.5 border-t pt-3 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" /> {r.date}
          </p>
        )}
      </div>
    </Link>
  );
}
