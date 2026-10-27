import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sticker } from "@/components/sticker";
import { IconTile } from "./icon-tile";

/** Lucide icon name → Telegram sticker, so every page header / empty state gets an animated sticker. */
const ICON_STICKER: Record<string, string> = {
  BookOpen: "binders", PlayCircle: "online", CirclePlay: "online", ClipboardList: "detective", FileText: "write", Trophy: "star",
  CreditCard: "bag", ShoppingBag: "bag", Bell: "megaphone", User: "wave", UserRound: "wave", Users: "cool-ducks", Megaphone: "megaphone",
  Package: "mailbox", GraduationCap: "teacher", Home: "wave", LayoutDashboard: "charts", Receipt: "bag", Wallet: "bag",
  CalendarDays: "bag", Calendar: "bag", Video: "online", Film: "online", Inbox: "mailbox", Search: "detective", Award: "star",
  BarChart3: "charts", ChartColumn: "charts", Settings: "artist", Image: "photos", Images: "photos", Upload: "files", Truck: "mailbox",
  Banknote: "bag", Lock: "question", ShieldCheck: "question", Clock: "bag", Timer: "bag", Flame: "star",
  ScanLine: "photos", QrCode: "photos",
};
export const stickerFor = (Icon?: LucideIcon, explicit?: string) =>
  explicit ?? (Icon ? ICON_STICKER[(Icon as { displayName?: string }).displayName ?? ""] : undefined);

/** Page title block used at the top of every dashboard page. */
export function PageHeader({ title, description, children, className, icon: Icon, eyebrow, sticker }: {
  title: string; description?: React.ReactNode; children?: React.ReactNode; className?: string; icon?: LucideIcon; eyebrow?: string; sticker?: string;
}) {
  const st = stickerFor(Icon, sticker);
  return (
    <div className={cn("ph mb-6 flex animate-fade-up flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="flex min-w-0 items-start gap-3.5">
        {st ? <IconTile sticker={st} size="xl" className="mt-0.5" />
          : Icon ? <IconTile icon={Icon} variant="solid" size="lg" className="mt-0.5 hidden sm:grid" /> : null}
        <div className="min-w-0">
          {eyebrow ? <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</p> : null}
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">{title}</h1>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, children, sticker }: {
  icon: LucideIcon; title: string; description?: string; children?: React.ReactNode; sticker?: string;
}) {
  const st = stickerFor(Icon, sticker) ?? "hatch";
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed border-primary/25 bg-card px-6 py-14 text-center shadow-soft">
      <div className="bg-dots absolute inset-0 opacity-60 [mask-image:radial-gradient(closest-side,black,transparent)]" aria-hidden />
      <div className="relative mb-4">
        <Sticker name={st} size={96} />
      </div>
      <h3 className="relative font-display text-lg font-semibold">{title}</h3>
      {description ? <p className="relative mt-1 max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {children ? <div className="relative mt-5">{children}</div> : null}
    </div>
  );
}

/** Compact empty state for inside a card (a chart or list that has nothing to show yet). */
export function EmptyNote({ icon: Icon, title, description, eyebrow, className, children }: {
  icon: LucideIcon; title: string; description?: string; eyebrow?: string; className?: string; children?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-2 rounded-2xl border border-dashed border-primary/25 bg-accent/40 px-5 py-7 text-center", className)}>
      <IconTile icon={Icon} size="lg" className="mb-1" />
      {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</p> : null}
      <p className="font-display text-base font-bold leading-snug">{title}</p>
      {description ? <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
      {children}
    </div>
  );
}

/** Inline message box. */
export function Alert({ variant = "info", children, className, ...props }: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "info" | "error" | "success" | "warning";
}) {
  const Icon = variant === "error" || variant === "warning" ? AlertCircle : variant === "success" ? CheckCircle2 : Info;
  const styles = {
    info: "border-primary/25 bg-accent/60 text-foreground",
    error: "border-destructive/30 bg-destructive-soft text-destructive-soft-foreground",
    success: "border-success/30 bg-success-soft text-success-soft-foreground",
    warning: "border-warning/30 bg-warning-soft text-warning-soft-foreground",
  }[variant];
  return (
    <div role={variant === "error" ? "alert" : "status"} className={cn("flex items-start gap-2.5 rounded-xl border p-3 text-sm", styles, className)} {...props}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export { StatCard } from "./blocks";
export type { Tone } from "./tone";

export function Table({ className, bare, ...p }: React.TableHTMLAttributes<HTMLTableElement> & { bare?: boolean }) {
  return (
    // On phones the table keeps a readable width and scrolls sideways (instead of squeezing every column into a tall strip).
    <div className={cn("w-full overflow-x-auto overscroll-x-contain bg-card [-webkit-overflow-scrolling:touch]", bare ? "border-t" : "rounded-2xl border border-border/80 shadow-soft dark:border-white/10")}>
      <table className={cn("w-full min-w-[620px] text-sm sm:min-w-0 [&_td]:px-3 [&_td]:py-3 sm:[&_td]:px-4 [&_th]:bg-muted/50 [&_th]:whitespace-nowrap [&_th]:px-3 sm:[&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:text-[11px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-muted-foreground [&_thead]:border-b [&_tbody_tr]:border-b [&_tbody_tr]:transition-colors [&_tbody_tr:last-child]:border-0 [&_tbody_tr:hover]:bg-accent/40", className)} {...p} />
    </div>
  );
}
