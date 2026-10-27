"use client";
import { useEffect, useRef, useState } from "react";
import {
  animate, motion, useAnimationFrame, useInView, useMotionTemplate, useMotionValue, useReducedMotion, useScroll, useSpring,
  useTransform, useVelocity, wrap, type MotionValue,
} from "framer-motion";
import { cn } from "@/lib/utils";

export const EASE = [0.22, 1, 0.36, 1] as const;

/** Masked word-by-word (or char-by-char) rise reveal. */
export function SplitReveal({ text, className, wordClassName, delay = 0, by = "word", stagger, once = true, as: Tag = "span" }: {
  text: string; className?: string; wordClassName?: string; delay?: number; by?: "word" | "char"; stagger?: number; once?: boolean; as?: "span" | "h1" | "h2" | "p";
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once, margin: "-10% 0px" });
  const reduce = useReducedMotion();
  const words = text.split(" ");
  const step = stagger ?? (by === "char" ? 0.028 : 0.07);
  let i = 0;
  const MotionTag = motion[Tag] as typeof motion.span;
  return (
    <MotionTag ref={ref as never} className={cn("inline", className)} aria-label={text}>
      {words.map((w, wi) => (
        <span key={wi} aria-hidden className="inline-block whitespace-nowrap align-bottom" style={{ overflow: "clip", overflowClipMargin: "0.2em" }}>
          {(by === "char" && /^[\x20-\x7E]+$/.test(w) ? [...w] : [w]).map((c, ci) => {
            const d = delay + step * i++;
            return (
              <motion.span key={ci} className={cn("inline-block pb-[0.16em] will-change-transform", wordClassName)}
                initial={reduce ? false : { y: "110%", rotateX: -70, opacity: 0 }}
                animate={inView ? { y: "0%", rotateX: 0, opacity: 1 } : undefined}
                transition={{ duration: 0.9, delay: d, ease: EASE }} style={{ transformOrigin: "50% 100%" }}>
                {c}
              </motion.span>
            );
          })}
          {wi < words.length - 1 ? "\u00a0" : null}
        </span>
      ))}
    </MotionTag>
  );
}

/** Element that gently follows the cursor while hovered. */
export function Magnetic({ children, strength = 0.35, className }: { children: React.ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(0, { stiffness: 220, damping: 15, mass: 0.4 });
  const y = useSpring(0, { stiffness: 220, damping: 15, mass: 0.4 });
  return (
    <motion.div ref={ref} style={{ x, y }} className={cn("inline-block", className)}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = ref.current!.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * strength);
        y.set((e.clientY - r.top - r.height / 2) * strength);
      }}
      onPointerLeave={() => { x.set(0); y.set(0); }}>
      {children}
    </motion.div>
  );
}

/** 3D tilt card with a cursor-following spotlight. */
export function TiltCard({ children, className, max = 10, glare = true }: { children: React.ReactNode; className?: string; max?: number; glare?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rx = useSpring(useTransform(py, [0, 1], [max, -max]), { stiffness: 180, damping: 18 });
  const ry = useSpring(useTransform(px, [0, 1], [-max, max]), { stiffness: 180, damping: 18 });
  const gx = useTransform(px, (v) => `${v * 100}%`);
  const gy = useTransform(py, (v) => `${v * 100}%`);
  const bg = useMotionTemplate`radial-gradient(420px circle at ${gx} ${gy}, hsl(var(--brand-500)/.14), transparent 45%)`;
  return (
    <motion.div ref={ref} style={{ rotateX: rx, rotateY: ry, transformPerspective: 1000 }} className={cn("group relative [transform-style:preserve-3d]", className)}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = ref.current!.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => { px.set(0.5); py.set(0.5); }}>
      {children}
      {glare && <motion.div aria-hidden style={{ background: bg }} className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />}
    </motion.div>
  );
}

/** Infinite marquee whose speed + direction react to scroll velocity. */
export function VelocityMarquee({ children, baseVelocity = -2, className }: { children: React.ReactNode; baseVelocity?: number; className?: string }) {
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const factor = useTransform(velocity, [0, 1000], [0, 5], { clamp: false });
  const x = useTransform(baseX, (v) => `${wrap(-25, -50, v)}%`);
  const dir = useRef(1);
  const reduce = useReducedMotion();
  useAnimationFrame((_, delta) => {
    if (reduce) return;
    let move = dir.current * baseVelocity * (delta / 1000);
    const f = factor.get();
    if (f < 0) dir.current = -1; else if (f > 0) dir.current = 1;
    move += dir.current * move * f;
    baseX.set(baseX.get() + move);
  });
  return (
    <div className={cn("flex overflow-hidden whitespace-nowrap", className)}>
      <motion.div className="flex shrink-0 flex-nowrap gap-0" style={{ x }}>
        {[0, 1, 2, 3].map((k) => <div key={k} className="flex shrink-0" aria-hidden={k > 0}>{children}</div>)}
      </motion.div>
    </div>
  );
}

/** Vertical parallax offset driven by the element's position in the viewport. */
export function useParallax(ref: React.RefObject<HTMLElement | null>, distance = 80): MotionValue<number> {
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  return useSpring(useTransform(scrollYProgress, [0, 1], [distance, -distance]), { stiffness: 120, damping: 30 });
}

/** Number that counts up once visible. */
export function Counter({ to, suffix = "", className, duration = 1.8 }: { to: number; suffix?: string; className?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, to, { duration, ease: EASE, onUpdate: (n) => setV(Math.round(n)) });
    return () => c.stop();
  }, [inView, to, duration]);
  return <span ref={ref} className={className}>{v.toLocaleString("en-US")}{suffix}</span>;
}

/** Cycles through words with a vertical flip. */
export function WordRotator({ words, className, interval = 2200 }: { words: string[]; className?: string; interval?: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (words.length < 2) return;
    const id = setInterval(() => setI((v) => (v + 1) % words.length), interval);
    return () => clearInterval(id);
  }, [words.length, interval]);
  const longest = words.reduce((a, w) => (w.length > a.length ? w : a), "");
  return (
    <span className={cn("relative inline-grid align-bottom", className)} style={{ overflow: "clip", overflowClipMargin: "0.25em" }}>
      <span className="invisible col-start-1 row-start-1">{longest}</span>
      {words.map((w, k) => (
        <motion.span key={w} className="col-start-1 row-start-1" initial={false}
          animate={k === i ? { y: "0%", opacity: 1, filter: "blur(0px)" } : { y: k === (i - 1 + words.length) % words.length ? "-100%" : "100%", opacity: 0, filter: "blur(6px)" }}
          transition={{ duration: 0.7, ease: EASE }}>
          {w}
        </motion.span>
      ))}
    </span>
  );
}
