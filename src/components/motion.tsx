"use client";
import { animate, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/*
 * Entrance effects are CSS animations (see globals.css), not framer-motion opacity:0 states: those are written into
 * the server HTML, so on a phone every Reveal'd block stayed invisible until the JS bundle had loaded.
 */

/** Fades + lifts its children in as the page paints. */
export function Reveal({ delay = 0, className, children, style, ...rest }: React.HTMLAttributes<HTMLDivElement> & { delay?: number }) {
  return (
    <div className={cn("animate-page-in", className)} style={delay ? { animationDelay: `${delay}s`, ...style } : style} {...rest}>
      {children}
    </div>
  );
}

/** Parent whose direct children fade in one after another. */
export function Stagger({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("stagger", className)} {...rest}>{children}</div>;
}

export function StaggerItem({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={className} {...rest}>{children}</div>;
}

/** Animated number that counts up when visible. */
export function CountUp({ value, decimals = 0, suffix = "", prefix = "", className }: { value: number; decimals?: number; suffix?: string; prefix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  // Starts at the real value so the number is right before JS runs; counts up from 0 only once it is in view.
  const [v, setV] = useState(value);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, value, { duration: 1.1, ease: EASE, onUpdate: setV });
    return () => c.stop();
  }, [inView, value]);
  return <span ref={ref} className={className}>{prefix}{v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
}
