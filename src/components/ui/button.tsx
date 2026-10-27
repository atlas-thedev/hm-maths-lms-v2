import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Buttons. Use <Button> for actions and <ButtonLink> for navigation — both share these looks:
 *   default   – filled brand (main action)          secondary – grey
 *   outline   – bordered, card background            ghost     – no background until hover
 *   soft      – brand tint (secondary brand action)  inverse   – white, for use on brand/dark cards
 *   success / destructive – filled status colours    danger-soft – red tint (delete in lists)
 *   link      – text link                            gradient  – brand gradient (hero calls to action)
 */
export const buttonVariants = cva(
  "inline-flex touch-manipulation select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:-translate-y-px hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "border border-input bg-card hover:border-primary/40 hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        soft: "bg-accent text-accent-foreground hover:bg-primary hover:text-primary-foreground",
        inverse: "bg-white text-brand-700 shadow-md hover:-translate-y-px hover:bg-white/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        "danger-soft": "bg-destructive-soft text-destructive-soft-foreground hover:bg-destructive hover:text-destructive-foreground",
        success: "bg-success text-success-foreground hover:bg-success/90",
        link: "text-primary underline-offset-4 hover:underline",
        gradient: "bg-gradient-brand text-white shadow-lg shadow-primary/30 hover:-translate-y-px hover:shadow-xl hover:shadow-primary/30",
        // Older names kept so existing screens keep working.
        orange: "rounded-full bg-gradient-brand text-white shadow-lg shadow-primary/30 hover:-translate-y-px hover:shadow-xl",
        pink: "bg-highlight-soft text-highlight-soft-foreground hover:bg-highlight hover:text-highlight-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-2xl px-6 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-9 w-9 rounded-lg",
      },
      block: { true: "w-full" },
      pill: { true: "rounded-full" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export type ButtonStyleProps = VariantProps<typeof buttonVariants>;
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyleProps {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, block, pill, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size, block, pill }), className)} {...props} />
));
Button.displayName = "Button";

/** A link that looks like a button. */
export function ButtonLink({ className, variant, size, block, pill, ...props }: React.ComponentProps<typeof Link> & ButtonStyleProps) {
  return <Link className={cn(buttonVariants({ variant, size, block, pill }), className)} {...props} />;
}
