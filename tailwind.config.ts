import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
/** A 50–950 colour scale read from CSS variables (--<name>-50 … --<name>-950) that still supports opacity (bg-brand-500/20). */
const scale = (name: string) => Object.fromEntries(STEPS.map((k) => [k, `hsl(var(--${name}-${k}) / <alpha-value>)`]));

export default {
  // `dark:` styles apply under html.dark, except inside a `.force-light` area (the always-light landing page).
  darkMode: ["variant", "&:is(.dark *):not(.force-light, .force-light *)"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1280px" } },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "var(--font-sinhala)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sinhala)", "var(--font-sans)", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "var(--font-sinhala)", "monospace"],
      },
      // Every colour is a CSS variable from src/theme/theme.css — change colours there, not here.
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))", text: "hsl(var(--primary-text))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        ...Object.fromEntries(["success", "warning", "destructive", "info", "highlight"].map((k) => [k, {
          DEFAULT: `hsl(var(--${k}))`, foreground: `hsl(var(--${k}-foreground))`,
          soft: `hsl(var(--${k}-soft))`, "soft-foreground": `hsl(var(--${k}-soft-foreground))`,
        }])),
        // Brand scale. "teal" is the old name for the same scale and is kept so existing classes keep working.
        brand: scale("brand"),
        teal: scale("brand"),
        // Neutral greys (warm). Tailwind's "slate" class names map onto them.
        slate: scale("gray"),
        gray: scale("gray"),
        ink: { DEFAULT: "hsl(var(--ink))", 900: "hsl(var(--ink))", 800: "hsl(var(--gray-900))", 700: "hsl(var(--gray-800))", 600: "hsl(var(--gray-700))" },
        sand: { 100: "hsl(var(--sand-100))", 300: "hsl(var(--sand-300))", 500: "hsl(var(--sand-500))" },
        portal: { head: "hsl(var(--portal-head))", bg: "hsl(var(--background))" },
        "logo-tile": "hsl(var(--logo-tile))",
        landing: { bg: "hsl(var(--landing-bg))", hero: "hsl(var(--landing-hero))" },
        whatsapp: { DEFAULT: "hsl(var(--whatsapp))", light: "hsl(var(--whatsapp-light))", text: "hsl(var(--whatsapp-text))" },
        facebook: "hsl(var(--facebook))",
        youtube: "hsl(var(--youtube))",
        medal: Object.fromEntries(["gold", "silver", "bronze"].flatMap((m) => [
          [`${m}-from`, `hsl(var(--medal-${m}-from))`], [`${m}-to`, `hsl(var(--medal-${m}-to))`], [`${m}-text`, `hsl(var(--medal-${m}-text))`],
        ])),
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
      keyframes: {
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-12px)" } },
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
        "marquee-y": { from: { transform: "translateY(0)" }, to: { transform: "translateY(-50%)" } },
        "spin-slow": { to: { transform: "rotate(360deg)" } },
        glow: { "0%,100%": { opacity: "0.55" }, "50%": { opacity: "1" } },
        "fade-up": { from: { opacity: "0", transform: "translateY(14px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        shimmer: { from: { backgroundPosition: "200% 0" }, to: { backgroundPosition: "-200% 0" } },
        flicker: { "0%,100%": { transform: "scale(1) rotate(-2deg)" }, "50%": { transform: "scale(1.08) rotate(3deg)" } },
        blob: { "0%,100%": { transform: "translate(0,0) scale(1)" }, "33%": { transform: "translate(30px,-40px) scale(1.08)" }, "66%": { transform: "translate(-20px,20px) scale(0.95)" } },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        marquee: "marquee 40s linear infinite",
        "marquee-y": "marquee-y 18s linear infinite",
        "spin-slow": "spin-slow 30s linear infinite",
        glow: "glow 3s ease-in-out infinite",
        "fade-up": "fade-up .5s cubic-bezier(.22,1,.36,1) both",
        shimmer: "shimmer 2.2s linear infinite",
        flicker: "flicker 1.6s ease-in-out infinite",
        blob: "blob 18s ease-in-out infinite",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(20,14,10,.05), 0 8px 24px -12px rgba(20,14,10,.16)",
        lift: "0 2px 4px rgba(20,14,10,.05), 0 18px 40px -18px rgba(20,14,10,.45)",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
