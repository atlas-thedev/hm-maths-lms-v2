/**
 * Runtime theme (Developer panel → Theme). Pure functions — usable on the server and in the browser preview.
 *
 * From ONE brand colour it builds the whole --brand-50…950 scale by *brightness* (WCAG relative luminance),
 * so every step has the same contrast as the original HM orange scale whatever colour is chosen.
 * Text colours are then picked by measured contrast:
 *   • button text on the brand colour → white or near-black, whichever is more readable (light brand → dark text)
 *   • brand-coloured text/links → the first shade that reaches 4.5:1 on the light / dark page background
 * Gradients, tints, badges and the logo read the scale, so they follow automatically (src/theme/theme.css).
 */

export type ThemeMode = "light" | "dark" | "system";
export interface ThemeSettings {
  /** Brand colour as #rrggbb. */
  brand: string;
  /** Corner roundness in rem (0 = square … 1.5 = very round). */
  radius: number;
  /** What new visitors see. */
  defaultMode: ThemeMode;
  /** Show the sun/moon switch so people can change it themselves. */
  allowToggle: boolean;
  /** Buttons use the exact brand colour (text flips dark/white automatically) or a deep shade (always white text). */
  buttons: "exact" | "deep";
}

export const DEFAULT_THEME: ThemeSettings = { brand: "#e8b84a", radius: 0.9, defaultMode: "light", allowToggle: true, buttons: "exact" };

export const THEME_PRESETS: { name: string; brand: string }[] = [
  { name: "Navy & Gold", brand: "#e8b84a" },
  { name: "HM Orange", brand: "#f05b06" },
  { name: "Royal Blue", brand: "#2563eb" },
  { name: "Emerald", brand: "#059669" },
  { name: "Teal", brand: "#0d9488" },
  { name: "Violet", brand: "#7c3aed" },
  { name: "Rose", brand: "#e11d48" },
  { name: "Sky", brand: "#0ea5e9" },
  { name: "Gold", brand: "#eab308" },
  { name: "Lime", brand: "#84cc16" },
  { name: "Graphite", brand: "#334155" },
];

const HEX = /^#[0-9a-f]{6}$/i;

export function normalizeTheme(v: Record<string, unknown> | null | undefined): ThemeSettings {
  const o = v ?? {};
  const brand = typeof o.brand === "string" && HEX.test(o.brand) ? o.brand.toLowerCase() : DEFAULT_THEME.brand;
  const r = typeof o.radius === "number" && Number.isFinite(o.radius) ? Math.min(1.5, Math.max(0, o.radius)) : DEFAULT_THEME.radius;
  const mode: ThemeMode = o.defaultMode === "dark" || o.defaultMode === "system" ? o.defaultMode : "light";
  return {
    brand, radius: Math.round(r * 100) / 100, defaultMode: mode,
    allowToggle: typeof o.allowToggle === "boolean" ? o.allowToggle : true,
    buttons: o.buttons === "exact" ? "exact" : "deep",
  };
}

export const isDefaultTheme = (t: ThemeSettings) => t.brand === DEFAULT_THEME.brand && t.radius === DEFAULT_THEME.radius && t.buttons === DEFAULT_THEME.buttons;

// ─── colour maths ───
type RGB = [number, number, number];
const hexToRgb = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
const lin = (c: number) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
export const luminance = ([r, g, b]: RGB) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
export const contrast = (a: RGB, b: RGB) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === R ? (G - B) / d + (G < B ? 6 : 0) : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return [h * 60, s, l];
}
function hslToRgb(h: number, s: number, l: number): RGB {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}
const hslVar = (h: number, s: number, l: number) => `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;

/** Brightness of each step in the original HM orange scale — the targets every brand colour is mapped onto. */
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
const ORANGE = ["#fff4ec", "#ffe5d2", "#ffc6a1", "#ff9f66", "#fb7a2e", "#f05b06", "#c24a05", "#ad3b06", "#8a300c", "#71290e", "#3d1203"];
const TARGET_LUM = ORANGE.map((h) => luminance(hexToRgb(h)));

/** Lightness (0–1) at which hue/saturation reaches the wanted luminance. */
function lightnessFor(h: number, s: number, target: number): number {
  let lo = 0, hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (luminance(hslToRgb(h, s, mid)) < target) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

export interface BuiltTheme {
  scale: Record<(typeof STEPS)[number], { hsl: string; rgb: RGB }>;
  primary: string; primaryForeground: string; primaryText: string;
  darkPrimaryText: string; darkAccent: string;
  checks: { label: string; ratio: number }[];
}

const INK: RGB = [20, 17, 15];
const WHITE: RGB = [255, 255, 255];
const LIGHT_BG: RGB = [250, 248, 246];
const DARK_BG: RGB = [0, 0, 0];

export function buildTheme(t: ThemeSettings): BuiltTheme {
  const rgb = hexToRgb(t.brand);
  const [h, s0] = rgbToHsl(rgb);
  // Very grey colours keep a little saturation so the scale is still tinted.
  const s = Math.max(s0, 0.18);
  const scale = Object.fromEntries(STEPS.map((step, i) => {
    const l = lightnessFor(h, Math.min(1, step <= 200 ? Math.max(s, 0.6) : s), TARGET_LUM[i]);
    const sat = Math.min(1, step <= 200 ? Math.max(s, 0.6) : s);
    return [step, { hsl: hslVar(h, sat, l), rgb: hslToRgb(h, sat, l) }];
  })) as BuiltTheme["scale"];

  // Button colour: the exact brand colour (its text flips to dark when the brand is light) or the deep 600 shade.
  const [bh, bs, bl] = rgbToHsl(rgb);
  const btn: RGB = t.buttons === "deep" ? scale[600].rgb : rgb;
  const primary = t.buttons === "deep" ? scale[600].hsl : hslVar(bh, bs, bl);
  const whiteRatio = contrast(WHITE, btn), inkRatio = contrast(INK, btn);
  const primaryForeground = whiteRatio >= 4.5 || whiteRatio >= inkRatio ? "0 0% 100%" : "216 62% 14%";

  // Brand-coloured text: the first shade readable on the page background.
  const pick = (order: (typeof STEPS)[number][], bg: RGB) => {
    if (contrast(rgb, bg) >= 4.5) return primary;
    const step = order.find((k) => contrast(scale[k].rgb, bg) >= 4.5) ?? order[order.length - 1];
    return scale[step].hsl;
  };
  const primaryText = pick([600, 700, 800, 900], LIGHT_BG);
  const darkPrimaryText = (() => {
    const step = ([400, 300, 200, 100] as const).find((k) => contrast(scale[k].rgb, DARK_BG) >= 4.5) ?? 200;
    return scale[step].hsl;
  })();
  const darkAccent = hslVar(h, Math.min(s, 0.4), 0.12);

  return {
    scale, primary, primaryForeground, primaryText, darkPrimaryText, darkAccent,
    checks: [
      { label: "Button text", ratio: Math.max(whiteRatio, inkRatio) },
      { label: "Links on light", ratio: contrast(hexToRgbFromHsl(primaryText), LIGHT_BG) },
      { label: "Links on dark", ratio: contrast(hexToRgbFromHsl(darkPrimaryText), DARK_BG) },
      { label: "White on gradient", ratio: contrast(WHITE, scale[600].rgb) },
    ],
  };
}

function hexToRgbFromHsl(v: string): RGB {
  const [h, s, l] = v.split(" ").map((x) => parseFloat(x));
  return hslToRgb(h, s / 100, l / 100);
}

/** CSS that overrides src/theme/theme.css for the chosen theme ("" when the built-in theme is in use). */
export function themeCss(t: ThemeSettings, scope = ""): string {
  if (!scope && isDefaultTheme(t)) return "";
  const b = buildTheme(t);
  const scaleVars = STEPS.map((k) => `--brand-${k}:${b.scale[k].hsl};`).join("");
  // Gradients reference the scale, so they are re-declared here to resolve against the new colours.
  const grads = "--gradient-brand:linear-gradient(135deg,hsl(var(--brand-800)) 0%,hsl(var(--brand-700)) 55%,hsl(var(--brand-600)) 100%);"
    + "--gradient-brand-soft:linear-gradient(135deg,hsl(var(--brand-50)) 0%,hsl(var(--brand-100)) 100%);"
    + "--gradient-dark:linear-gradient(135deg,hsl(var(--ink)) 0%,hsl(20 12% 11%) 55%,hsl(var(--brand-950)) 100%);"
    + "--gradient-logo-from:hsl(var(--brand-500));--gradient-logo-to:hsl(var(--brand-300));--accent:var(--brand-50);--accent-foreground:var(--brand-800);";
  const darkGrads = "--gradient-brand-soft:linear-gradient(135deg,hsl(var(--brand-500)/.12) 0%,hsl(var(--brand-700)/.12) 100%);";
  const light = `${scaleVars}${grads}--primary:${b.primary};--primary-foreground:${b.primaryForeground};--primary-text:${b.primaryText};--ring:var(--brand-500);--radius:${t.radius}rem;`;
  const dark = `${darkGrads}--primary:${b.primary};--primary-foreground:${b.primaryForeground};--primary-text:${b.darkPrimaryText};--accent:${b.darkAccent};--accent-foreground:var(--brand-300);--ring:var(--brand-400);`;
  if (scope) return `${scope}{${light}}.dark ${scope}{${dark}}`;
  return `html:root,html .force-light{${light}}html.dark{${dark}}html.dark .force-light{${light}}`;
}
