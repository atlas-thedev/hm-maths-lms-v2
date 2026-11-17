"use client";
import { motion, type MotionValue, useReducedMotion, useTransform } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Spaceship-style backlit studio spotlight + silhouetted student (left) & full-color Sir (right).
 * Full-bleed side framing on sm+ screens, with dedicated HeroMobileStage on phones so text never covers Sir's face.
 */
export function HeroSilhouettes({ progress }: { progress: MotionValue<number> }) {
  const reduce = useReducedMotion();

  const beamScale = useTransform(progress, [0, 1], [1, 1.22]);
  const beamY = useTransform(progress, [0, 1], [0, -50]);
  const beamOpacity = useTransform(progress, [0, 0.9], [1, 0.25]);

  const leftX = useTransform(progress, [0, 1], [0, -85]);
  const leftY = useTransform(progress, [0, 1], [0, 42]);
  const leftScale = useTransform(progress, [0, 1], [1, 1.08]);

  const rightX = useTransform(progress, [0, 1], [0, 95]);
  const rightY = useTransform(progress, [0, 1], [0, 28]);
  const rightScale = useTransform(progress, [0, 1], [1, 1.1]);

  const figureOpacity = useTransform(progress, [0, 0.88], [1, 0.18]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden select-none">
      {/* Soft radial studio spotlight glow in active brand shade */}
      <motion.div
        style={reduce ? undefined : { scale: beamScale, y: beamY, opacity: beamOpacity }}
        initial={reduce ? undefined : { opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div
          className="h-[115%] w-[180vw] blur-[64px] sm:h-[120%] sm:w-[min(1260px,145vw)] sm:blur-[72px]"
          style={{
            background:
              "radial-gradient(ellipse 56% 58% at 50% 44%, hsl(var(--brand-500) / 0.72) 0%, hsl(var(--brand-600) / 0.44) 40%, hsl(var(--brand-800) / 0.16) 68%, transparent 90%)",
          }}
        />
      </motion.div>

      {/* Desktop/Tablet: Left silhouette (student looking inward, clear of centered copy) */}
      <motion.div
        style={reduce ? undefined : { x: leftX, y: leftY, scale: leftScale, opacity: figureOpacity }}
        initial={reduce ? undefined : { opacity: 0, y: 36, x: -24 }}
        animate={{ opacity: 0.92, y: 0, x: 0 }}
        transition={{ duration: 1.0, delay: 0.1, ease }}
        className="hidden sm:block absolute bottom-0 left-[1%] h-[70%] origin-bottom md:left-[2%] lg:left-[4%] lg:h-[76%] xl:left-[7%] xl:h-[80%]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/silhouette-male.webp"
          alt=""
          loading="eager"
          decoding="async"
          className="h-full w-auto max-w-none object-contain object-bottom [mask-image:linear-gradient(to_bottom,#000_78%,transparent_100%)]"
        />
      </motion.div>

      {/* Desktop/Tablet: Right figure (Hasitha Sir in full color + comma mark, clear of center CTAs/stats) */}
      <motion.div
        style={reduce ? undefined : { x: rightX, y: rightY, scale: rightScale, opacity: figureOpacity }}
        initial={reduce ? undefined : { opacity: 0, y: 40, x: 28 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ duration: 1.05, delay: 0.18, ease }}
        className="hidden sm:block absolute bottom-0 right-[3%] h-[74%] origin-bottom md:right-[4%] lg:right-[6%] lg:h-[80%] xl:right-[8%] xl:h-[84%]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/sir-hero-color.webp"
          alt=""
          loading="eager"
          decoding="async"
          className="h-full w-auto max-w-none object-contain object-bottom [mask-image:linear-gradient(to_bottom,#000_84%,transparent_100%)]"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero-comma.png"
          alt=""
          loading="eager"
          decoding="async"
          className="pointer-events-none absolute -right-4 top-[8%] h-[15%] w-auto select-none drop-shadow-[0_6px_18px_rgba(0,0,0,0.35)] lg:-right-6"
        />
      </motion.div>

      {/* Subtle atmospheric top vignette + center contrast scrim */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 68% 46% at 50% 34%, rgba(4,9,24,0.32) 0%, transparent 72%), linear-gradient(180deg, rgba(2,6,18,0.58) 0%, rgba(2,6,18,0.10) 28%, rgba(2,6,18,0.18) 100%)",
        }}
      />
    </div>
  );
}

/** Mobile-only unobstructed backlit stage showing the student silhouette + full-color Sir without text covering faces. */
export function HeroMobileStage({ progress }: { progress: MotionValue<number> }) {
  const reduce = useReducedMotion();
  const leftX = useTransform(progress, [0, 1], [0, -30]);
  const rightX = useTransform(progress, [0, 1], [0, 30]);
  const scale = useTransform(progress, [0, 1], [1, 1.05]);

  return (
    <div aria-hidden className="relative mt-5 h-64 w-full max-w-[360px] overflow-hidden rounded-3xl border border-white/10 bg-black/25 backdrop-blur-[2px] select-none sm:hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 75% 75% at 50% 52%, hsl(var(--brand-500) / 0.65) 0%, hsl(var(--brand-600) / 0.35) 48%, transparent 82%)",
        }}
      />
      <motion.div
        style={reduce ? undefined : { x: leftX, scale }}
        initial={reduce ? undefined : { opacity: 0, x: -18 }}
        animate={{ opacity: 0.94, x: 0 }}
        transition={{ duration: 0.9, delay: 0.1, ease }}
        className="absolute bottom-0 left-3 h-[90%] origin-bottom"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/silhouette-male.webp"
          alt=""
          loading="eager"
          decoding="async"
          className="h-full w-auto max-w-none object-contain object-bottom [mask-image:linear-gradient(to_bottom,#000_86%,transparent_100%)]"
        />
      </motion.div>
      <motion.div
        style={reduce ? undefined : { x: rightX, scale }}
        initial={reduce ? undefined : { opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.95, delay: 0.18, ease }}
        className="absolute bottom-0 right-7 h-[96%] origin-bottom"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/sir-hero-color.webp"
          alt=""
          loading="eager"
          decoding="async"
          className="h-full w-auto max-w-none object-contain object-bottom [mask-image:linear-gradient(to_bottom,#000_90%,transparent_100%)]"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero-comma.png"
          alt=""
          loading="eager"
          decoding="async"
          className="pointer-events-none absolute -right-4 top-[8%] h-[16%] w-auto select-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)]"
        />
      </motion.div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-black/35 to-transparent" />
    </div>
  );
}
