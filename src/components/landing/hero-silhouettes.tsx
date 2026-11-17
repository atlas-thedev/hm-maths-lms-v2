"use client";
import { motion, type MotionValue, useReducedMotion, useTransform } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Spaceship-style backlit studio spotlight + two silhouetted figures behind the hero.
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

  const silhouetteOpacity = useTransform(progress, [0, 0.88], [0.94, 0.15]);

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
              "radial-gradient(ellipse 56% 58% at 50% 46%, hsl(var(--brand-500) / 0.78) 0%, hsl(var(--brand-600) / 0.48) 40%, hsl(var(--brand-800) / 0.18) 68%, transparent 90%)",
          }}
        />
      </motion.div>

      {/* Left silhouette (student figure, framed cleanly on left side, moving outward on scroll) */}
      <motion.div
        style={reduce ? undefined : { x: leftX, y: leftY, scale: leftScale, opacity: silhouetteOpacity }}
        initial={reduce ? undefined : { opacity: 0, y: 36, x: -24 }}
        animate={{ opacity: 0.92, y: 0, x: 0 }}
        transition={{ duration: 1.0, delay: 0.1, ease }}
        className="absolute bottom-6 left-[-8%] h-[54%] origin-bottom sm:bottom-0 sm:left-[2%] sm:h-[74%] lg:left-[8%] lg:h-[80%] xl:left-[12%]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/silhouette-male.webp"
          alt=""
          loading="eager"
          decoding="async"
          className="h-full w-auto max-w-none object-contain object-bottom [mask-image:linear-gradient(to_bottom,#000_76%,transparent_100%)]"
        />
      </motion.div>

      {/* Right silhouette (Hasitha Sir standing with arms crossed + comma mark beside him) */}
      <motion.div
        style={reduce ? undefined : { x: rightX, y: rightY, scale: rightScale, opacity: silhouetteOpacity }}
        initial={reduce ? undefined : { opacity: 0, y: 40, x: 28 }}
        animate={{ opacity: 0.95, y: 0, x: 0 }}
        transition={{ duration: 1.05, delay: 0.18, ease }}
        className="absolute bottom-6 right-[-2%] h-[60%] origin-bottom sm:bottom-0 sm:right-[4%] sm:h-[80%] lg:right-[9%] lg:h-[86%] xl:right-[13%]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/silhouette-sir.webp"
          alt=""
          loading="eager"
          decoding="async"
          className="h-full w-auto max-w-none object-contain object-bottom [mask-image:linear-gradient(to_bottom,#000_76%,transparent_100%)]"
        />
        <span
          className="absolute right-1 top-[8%] h-[14%] w-7 bg-white/95 drop-shadow-[0_6px_18px_rgba(0,0,0,0.35)] sm:-right-11 sm:top-[10%] sm:h-[16%] sm:w-14"
          style={{
            maskImage: "url(/images/hero-comma.png)",
            WebkitMaskImage: "url(/images/hero-comma.png)",
            maskSize: "contain",
            WebkitMaskSize: "contain",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
          }}
        />
      </motion.div>

      {/* Subtle atmospheric top vignette + soft center contrast scrim */}
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
