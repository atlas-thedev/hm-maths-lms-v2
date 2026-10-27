import { cn } from "@/lib/utils";

/** Calendar-style date block for a "YYYY-MM-DD" (or ISO) date, in Sri Lanka time. */
export function DateTile({ date, className }: { date: string; className?: string }) {
  const d = new Date(date.length === 10 ? `${date}T12:00:00+05:30` : date);
  const day = d.toLocaleDateString("en-US", { day: "2-digit", timeZone: "Asia/Colombo" });
  const mon = d.toLocaleDateString("en-US", { month: "short", timeZone: "Asia/Colombo" });
  return (
    <div className={cn("flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-brand-soft ring-1 ring-primary/10", className)}>
      <span className="font-display text-lg font-bold leading-none text-primary">{day}</span>
      <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{mon}</span>
    </div>
  );
}
