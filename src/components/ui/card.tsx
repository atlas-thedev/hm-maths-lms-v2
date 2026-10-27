import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Sticker } from "@/components/sticker";

/**
 * Card surfaces.
 *   default     – white card with border + soft shadow
 *   muted       – grey panel (nested inside a card)
 *   outline     – border only
 *   brand       – brand gradient, white text (hero / highlight)
 *   dark        – near-black gradient, white text
 *   interactive – default card that lifts on hover (use for clickable cards)
 */
export const cardVariants = cva("rounded-2xl text-card-foreground", {
  variants: {
    variant: {
      default: "border border-border/80 bg-card shadow-soft dark:border-white/10",
      muted: "bg-muted/60",
      outline: "border border-border/80 dark:border-white/10",
      brand: "relative overflow-hidden bg-gradient-brand text-white shadow-lift",
      dark: "relative overflow-hidden bg-gradient-dark text-white shadow-lift",
      interactive: "border border-border/80 bg-card shadow-soft transition duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift active:scale-[0.99] dark:border-white/10",
    },
    padding: { none: "", sm: "p-3", md: "p-4 sm:p-5", lg: "p-5 sm:p-8" },
  },
  defaultVariants: { variant: "default", padding: "none" },
});

export type CardProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>;
export const Card = ({ className, variant, padding, ...p }: CardProps) => (
  <div className={cn(cardVariants({ variant, padding }), className)} {...p} />
);

/**
 * Card header. Either pass children (free layout), or use the props for the standard layout:
 * an optional sticker/icon, a title, a short description and an action on the right (usually <CardAction>).
 */
export function CardHeader({ className, title, description, icon: Icon, sticker, action, children, ...p }:
  Omit<React.HTMLAttributes<HTMLDivElement>, "title"> & { title?: React.ReactNode; description?: React.ReactNode; icon?: LucideIcon; sticker?: string; action?: React.ReactNode }) {
  if (title === undefined) return <div className={cn("flex flex-col gap-1.5 p-4 sm:p-5", className)} {...p}>{children}</div>;
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-x-3 gap-y-2.5 p-4 sm:p-5", className)} {...p}>
      <div className="min-w-[11rem] flex-1">
        <CardTitle className="flex items-center gap-2 text-base">
          {sticker ? <Sticker name={sticker} size={26} /> : Icon ? <Icon className="h-4 w-4 text-primary" /> : null}
          <span className="min-w-0">{title}</span>
        </CardTitle>
        {description ? <CardDescription className="mt-1 text-xs">{description}</CardDescription> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap justify-end gap-2">{action}</div> : null}
      {children}
    </div>
  );
}
export const CardTitle = ({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("font-display text-lg font-semibold leading-tight tracking-tight", className)} {...p} />
);
export const CardDescription = ({ className, ...p }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-muted-foreground", className)} {...p} />
);
export const CardContent = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-4 pt-0 sm:p-5 sm:pt-0", className)} {...p} />
);
export const CardFooter = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center p-4 pt-0 sm:p-5 sm:pt-0", className)} {...p} />
);

/** Small "View all →" style link for a card header. */
export function CardAction({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg bg-accent px-3 text-xs font-semibold text-accent-foreground transition hover:bg-primary hover:text-primary-foreground active:scale-[0.97]", className)}>
      {children} <ArrowRight className="h-3 w-3" />
    </Link>
  );
}

/** Small uppercase label inside a card ("CLASS FEES"). */
export function CardSubheading({ icon: Icon, children, action, className }: { icon?: LucideIcon; children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-2 flex items-center justify-between gap-3", className)}>
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">{Icon ? <Icon className="h-3.5 w-3.5" /> : null}{children}</p>
      {action}
    </div>
  );
}
