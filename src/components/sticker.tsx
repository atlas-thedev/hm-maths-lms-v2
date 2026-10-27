"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Telegram-style sticker. Shows the static .webp instantly ("normal" pack), then — when it scrolls
 * into view — swaps in the animated .tgs (gzipped Lottie) rendered by lottie_light (no eval, CSP-safe).
 * Animation pauses off-screen and stays static for users who prefer reduced motion.
 */
type Anim = { play(): void; pause(): void; destroy(): void };
let lottieLib: Promise<{ loadAnimation(o: object): Anim }> | null = null;
const loadLottie = () =>
  (lottieLib ??= import("lottie-web/build/player/lottie_light").then((m) => (m.default ?? m) as unknown as { loadAnimation(o: object): Anim }));
const cache = new Map<string, Promise<object>>();
const loadTgs = (name: string) => {
  if (!cache.has(name)) {
    cache.set(name, fetch(`/stickers/${name}.tgs`).then(async (r) => {
      if (!r.ok || !r.body) throw new Error("sticker");
      const text = await new Response(r.body.pipeThrough(new DecompressionStream("gzip"))).text();
      return JSON.parse(text) as object;
    }));
  }
  return cache.get(name)!;
};

export function Sticker({ name, size = 48, className, loop = true, alt = "", mode = "auto" }: {
  name: string; size?: number; className?: string; loop?: boolean; alt?: string;
  /** auto = animate while on screen · static = image only ("normal" sticker) */
  mode?: "auto" | "static";
}) {
  const box = useRef<HTMLSpanElement>(null);
  const holder = useRef<HTMLSpanElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (mode === "static" || !el || typeof DecompressionStream === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let anim: Anim | null = null;
    let cancelled = false;
    let visible = false;
    // Fast scrolling can take the sticker off-screen and back before the first load finishes.
    // Without this guard each pass would start another load and stack two animations in one box.
    let loading = false;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (!visible) { anim?.pause(); return; }
      if (anim) { anim.play(); return; }
      if (loading) return;
      loading = true;
      Promise.all([loadLottie(), loadTgs(name)]).then(([lottie, data]) => {
        if (cancelled || !holder.current) return;
        anim = lottie.loadAnimation({
          container: holder.current, renderer: "svg", loop, autoplay: visible,
          animationData: structuredClone(data), rendererSettings: { preserveAspectRatio: "xMidYMid meet", progressiveLoad: true },
        });
        setLive(true);
      }).catch(() => {}).finally(() => { loading = false; });
    }, { rootMargin: "120px" });
    io.observe(el);
    return () => { cancelled = true; io.disconnect(); anim?.destroy(); setLive(false); };
  }, [name, loop, mode]);

  return (
    <span ref={box} role={alt ? "img" : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true}
      className={cn("relative inline-block shrink-0 align-middle", className)} style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/stickers/${name}.webp`} alt="" width={size} height={size} loading="lazy" decoding="async" draggable={false}
        className={cn("absolute inset-0 h-full w-full select-none object-contain transition-opacity duration-300", live && "opacity-0")} />
      <span ref={holder} className="absolute inset-0 overflow-hidden [&>svg]:!h-full [&>svg]:!w-full" />
    </span>
  );
}
