"use client";
import { motion, type MotionValue, useReducedMotion, useTransform } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Spaceship-style backlit studio spotlight + two silhouetted figures behind the hero.
 * Uses the active theme's --brand-500/--brand-600 glow and animates with scroll parallax.
 */
export function HeroSilhouettes({ progress }: { progress: MotionValue<number> }) {
  const reduce = useReducedMotion();

  const beamScale = useTransform(progress, [0, 1], [1, 1.24]);
  const beamY = useTransform(progress, [0, 1], [0, -55]);
  const beamOpacity = useTransform(progress, [0, 0.9], [1, 0.25]);

  const leftX = useTransform(progress, [0, 1], [0, -90]);
  const leftY = useTransform(progress, [0, 1], [0, 48]);
  const leftScale = useTransform(progress, [0, 1], [1, 1.08]);

  const rightX = useTransform(progress, [0, 1], [0, 110]);
  const rightY = useTransform(progress, [0, 1], [0, 28]);
  const rightScale = useTransform(progress, [0, 1], [1, 1.12]);

  const silhouetteOpacity = useTransform(progress, [0, 0.85], [1, 0.2]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden select-none">
      {/* Deep edge vignette so the dark sides blend seamlessly */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 68% 78% at 50% 42%, hsl(var(--brand-500) / 0.85) 0%, hsl(var(--brand-600) / 0.55) 36%, hsl(var(--brand-950) / 0.35) 68%, transparent 100%)",
        }}
      />

      {/* Angled backlit studio cone beam */}
      <motion.div
        style={reduce ? undefined : { scale: beamScale, y: beamY, opacity: beamOpacity }}
        initial={reduce ? undefined : { opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease }}
        className="absolute inset-x-0 -top-24 bottom-0 flex justify-center"
      >
        <div
          className="h-full w-[min(1180px,135vw)] blur-2xl"
          style={{
            background:
              "linear-gradient(180deg, hsl(var(--brand-500) / 0.9) 0%, hsl(var(--brand-400) / 0.65) 48%, hsl(var(--brand-600) / 0.12) 92%, transparent 100%)",
            clipPath: "polygon(22% 0%, 78% 0%, 96% 100%, 4% 100%)",
          }}
        />
      </motion.div>

      {/* Left silhouette (male figure, slightly further back, turned inward) */}
      <motion.div
        style={reduce ? undefined : { x: leftX, y: leftY, scale: leftScale, opacity: silhouetteOpacity }}
        initial={reduce ? undefined : { opacity: 0, y: 36, x: -24 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ duration: 1.0, delay: 0.1, ease }}
        className="absolute bottom-0 left-[2%] h-[78%] w-[48vw] max-w-[380px] origin-bottom sm:left-[8%] sm:h-[85%] lg:left-[14%] xl:left-[18%]"
      >
        <svg
          viewBox="0 0 360 640"
          preserveAspectRatio="xMidYMax meet"
          className="h-full w-full drop-shadow-[0_0_24px_hsl(var(--brand-400)/0.25)]"
        >
          <path
            fill="#04070f"
            d="M174 34c18 0 34 6 43 17 5 6 7 13 6 20 5 1 11 4 12 8 1 4-2 8-4 11 2 4 4 8 6 12 2 4 4 7 2 10-2 3-5 3-6 5 1 4 0 8-2 11 2 3 1 7-2 9-3 3-8 4-15 6-5 1-10 3-12 7-2 5 0 14 2 22 25 9 50 18 61 35 9 14 14 45 19 85 5 41 9 72 9 77-6 3-13 5-20 6 1 38 3 84 4 118 2 44 6 95 9 147H84c3-54 8-107 10-149 2-32 1-74 2-112-8 2-16 8-19 20-5 20-8 56-11 87-2 23-3 41-2 52 2 12 8 24 8 34 0 8-5 15-10 15-4 0-6-7-7-13-1 7-3 15-8 15-5 0-8-9-8-22 0-16 2-34 2-51 0-34-1-74 5-107 5-28 14-50 28-64 11-11 29-20 51-28 3-10 4-20 2-29-2-6-6-10-10-16-4-7-6-15-6-23-5-2-8-8-8-14 0-5 2-9 5-11-3-8-4-18-2-27 4-18 17-34 37-41 10-4 21-6 31-6Z"
          />
        </svg>
      </motion.div>

      {/* Right silhouette (female figure with long hair, closer foreground, profile facing left) */}
      <motion.div
        style={reduce ? undefined : { x: rightX, y: rightY, scale: rightScale, opacity: silhouetteOpacity }}
        initial={reduce ? undefined : { opacity: 0, y: 40, x: 28 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ duration: 1.05, delay: 0.18, ease }}
        className="absolute bottom-0 right-[-4%] h-[86%] w-[56vw] max-w-[440px] origin-bottom sm:right-[4%] sm:h-[92%] lg:right-[10%] xl:right-[15%]"
      >
        <svg
          viewBox="0 0 420 680"
          preserveAspectRatio="xMidYMax meet"
          className="h-full w-full drop-shadow-[0_0_28px_hsl(var(--brand-400)/0.25)]"
        >
          <path
            fill="#03050c"
            d="M206 16c26 0 49 12 64 31 15 20 24 50 32 95 7 40 12 72 22 104 20 12 36 27 44 48 9 23 15 62 24 126 10 68 20 144 28 260H102c-2-36-5-72-7-105-3-47-6-86-6-114-5 1-11-1-15-5-3-4-4-11-4-20 0-34 2-74 9-107 7-31 18-52 34-66 13-12 29-22 45-31 5-14 7-30 5-44-10-1-18-5-24-11-5-5-8-12-9-19-4-2-7-5-7-9 0-3 3-6 5-8-3-3-6-6-7-10-1-4 1-8 4-11-3-3-7-5-10-9-3-4-4-8-2-12 3-6 9-13 13-22 4-9 6-20 11-29 9-17 25-28 45-33 7-2 15-3 22-3Z"
          />
        </svg>
      </motion.div>

      {/* Soft top/bottom atmospheric blends into navbar & page transition */}
      <div
        className="absolute inset-x-0 top-0 h-32"
        style={{
          background: "linear-gradient(180deg, rgba(2,6,18,0.55) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}
