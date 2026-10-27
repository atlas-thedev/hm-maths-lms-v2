"use client";
import { animate, motion, useInView, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Fades + lifts its children in when they scroll into view. */
export function Reveal({ delay = 0, y = 16, className, children, ...rest }: HTMLMotionProps<"div"> & { delay?: number; y?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div initial={reduce ? false : { opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay, ease: EASE }} className={className} {...rest}>
      {children}
    </motion.div>
  );
}

/** Parent that staggers its <StaggerItem> children. */
export function Stagger({ className, children, gap = 0.06, ...rest }: HTMLMotionProps<"div"> & { gap?: number }) {
  return (
    <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-30px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }} className={className} {...rest}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ className, children, ...rest }: HTMLMotionProps<"div">) {
  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 14, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: EASE } } }}
      className={className} {...rest}>
      {children}
    </motion.div>
  );
}

/** Animated number that counts up when visible. */
export function CountUp({ value, decimals = 0, suffix = "", prefix = "", className }: { value: number; decimals?: number; suffix?: string; prefix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, value, { duration: 1.1, ease: EASE, onUpdate: setV });
    return () => c.stop();
  }, [inView, value]);
  return <span ref={ref} className={className}>{prefix}{v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
}
