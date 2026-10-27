import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** Premium Verified ✓ mark shown next to a student's name (leaderboards, dashboard, papers). */
export function PremiumMark({ label, className, withText = false }: { label: string; className?: string; withText?: boolean }) {
  return (
    <span title={label} aria-label={label} data-testid="premium-mark"
      className={cn("inline-flex shrink-0 items-center gap-1 align-middle text-info-soft-foreground", withText && "rounded-full bg-info/12 px-2.5 py-1 text-[11px] font-bold uppercase leading-none tracking-wide ring-1 ring-info/25", className)}>
      <BadgeCheck className={cn(withText ? "h-3.5 w-3.5" : "h-4 w-4", "fill-info/15")} />
      {withText && label}
    </span>
  );
}
