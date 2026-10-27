import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Sticker } from "@/components/sticker";
import { toneSoft, toneSolid, type Tone } from "./tone";

const sizes = cva("grid shrink-0 place-items-center", {
  variants: {
    size: {
      sm: "h-9 w-9 rounded-lg [&_svg]:h-4 [&_svg]:w-4",
      md: "h-10 w-10 rounded-xl [&_svg]:h-[18px] [&_svg]:w-[18px]",
      lg: "h-12 w-12 rounded-2xl [&_svg]:h-5 [&_svg]:w-5",
      xl: "h-14 w-14 rounded-2xl [&_svg]:h-6 [&_svg]:w-6",
    },
  },
  defaultVariants: { size: "md" },
});
const STICKER_PX = { sm: 24, md: 28, lg: 34, xl: 42 } as const;

/**
 * A rounded square holding an icon or an animated sticker.
 *   variant="soft"  – tinted background (default)
 *   variant="solid" – filled tone colour with white icon
 */
export function IconTile({ icon: Icon, sticker, tone = "brand", variant = "soft", size = "md", className, children }: {
  icon?: LucideIcon; sticker?: string; tone?: Tone; variant?: "soft" | "solid"; size?: "sm" | "md" | "lg" | "xl"; className?: string; children?: React.ReactNode;
}) {
  const sticky = !!sticker;
  return (
    <span className={cn(sizes({ size }), "relative", sticky ? "bg-gradient-brand-soft ring-1 ring-primary/15" : variant === "solid" ? cn(toneSolid[tone], "shadow-md") : toneSoft[tone], className)} aria-hidden>
      {sticker ? <Sticker name={sticker} size={STICKER_PX[size]} /> : Icon ? <Icon /> : null}
      {children}
    </span>
  );
}
