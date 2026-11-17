"use client";
import { motion, type MotionValue, useReducedMotion, useTransform } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Spaceship-style backlit studio spotlight + two AI-generated silhouetted student figures behind the hero.
 * Follows the active theme's --brand-500/--brand-600 glow and animates smoothly with scroll parallax.
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

  const silhouetteOpacity = useTransform(progress, [0, 0.88], [0.92, 0.15]);

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
          className="h-[120%] w-[min(1260px,145vw)] blur-[72px]"
          style={{
            background:
              "radial-gradient(ellipse 52% 62% at 50% 44%, hsl(var(--brand-500) / 0.72) 0%, hsl(var(--brand-600) / 0.44) 38%, hsl(var(--brand-800) / 0.18) 65%, transparent 88%)",
          }}
        />
      </motion.div>

      {/* Left silhouette (student figure, framed cleanly on left side, moving outward on scroll) */}
      <motion.div
        style={reduce ? undefined : { x: leftX, y: leftY, scale: leftScale, opacity: silhouetteOpacity }}
        initial={reduce ? undefined : { opacity: 0, y: 36, x: -24 }}
        animate={{ opacity: 0.92, y: 0, x: 0 }}
        transition={{ duration: 1.0, delay: 0.1, ease }}
        className="absolute bottom-0 left-[-6%] h-[62%] origin-bottom sm:left-[2%] sm:h-[74%] lg:left-[8%] lg:h-[80%] xl:left-[12%]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/silhouette-male.webp"
          alt=""
          loading="eager"
          decoding="async"
          className="h-full w-auto max-w-none object-contain object-bottom drop-shadow-[0_0_32px_hsl(var(--brand-400)/0.28)]"
        />
      </motion.div>

      {/* Right silhouette (Hasitha Sir standing with arms crossed, framed cleanly on right side) */}
      <motion.div
        style={reduce ? undefined : { x: rightX, y: rightY, scale: rightScale, opacity: silhouetteOpacity }}
        initial={reduce ? undefined : { opacity: 0, y: 40, x: 28 }}
        animate={{ opacity: 0.95, y: 0, x: 0 }}
        transition={{ duration: 1.05, delay: 0.18, ease }}
        className="absolute bottom-0 right-[-8%] h-[68%] origin-bottom sm:right-[1%] sm:h-[80%] lg:right-[6%] lg:h-[86%] xl:right-[10%]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/silhouette-sir.webp"
          alt=""
          loading="eager"
          decoding="async"
          className="h-full w-auto max-w-none object-contain object-bottom drop-shadow-[0_0_34px_hsl(var(--brand-400)/0.3)]"
        />
      </motion.div>

      {/* Subtle dark atmospheric top vignette + center depth scrim so foreground text always pops sharply */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 64% 50% at 50% 34%, rgba(4,9,24,0.42) 0%, transparent 72%), linear-gradient(180deg, rgba(2,6,18,0.62) 0%, rgba(2,6,18,0.12) 28%, rgba(2,6,18,0.22) 100%)",
        }}
      />
    </div>
  );
}
