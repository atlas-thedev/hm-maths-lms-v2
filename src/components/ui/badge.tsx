import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Small status / label pill. Colours come from the theme tones. */
export const badgeVariants = cva("inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors [&_svg]:size-3", {
  variants: {
    variant: {
      default: "border-transparent bg-accent text-accent-foreground",
      solid: "border-transparent bg-primary text-primary-foreground",
      secondary: "border-transparent bg-secondary text-secondary-foreground",
      outline: "text-foreground",
      success: "border-transparent bg-success-soft text-success-soft-foreground",
      warning: "border-transparent bg-warning-soft text-warning-soft-foreground",
      destructive: "border-transparent bg-destructive-soft text-destructive-soft-foreground",
      info: "border-transparent bg-info-soft text-info-soft-foreground",
      highlight: "border-transparent bg-highlight-soft text-highlight-soft-foreground",
      /** For badges sitting on a photo, banner or brand gradient. */
      overlay: "border-white/20 bg-black/55 text-white backdrop-blur-sm",
      "overlay-light": "border-transparent bg-white/90 text-ink",
    },
    size: {
      default: "",
      lg: "px-3 py-1 text-xs",
    },
  },
  defaultVariants: { variant: "default", size: "default" },
});

export function Badge({ className, variant, size, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}
