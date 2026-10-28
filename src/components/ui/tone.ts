/**
 * Colour "tones" shared by the UI library (badges, icon tiles, stat cards, alerts, chips…).
 * Every tone reads from src/theme/theme.css, so changing the theme recolours all of them.
 *
 *   brand     – main HM orange
 *   success   – approved / paid / passed
 *   warning   – pending / attention
 *   danger    – rejected / errors / delete
 *   info      – neutral information, links to outside things
 *   highlight – violet accent (store, premium, extras)
 *   neutral   – grey
 *   dark      – near-black (logo tile style)
 */
export type Tone = "brand" | "success" | "warning" | "danger" | "info" | "highlight" | "neutral" | "dark";

/** Tinted background + matching readable text. */
export const toneSoft: Record<Tone, string> = {
  brand: "bg-accent text-accent-foreground",
  success: "bg-success-soft text-success-soft-foreground",
  warning: "bg-warning-soft text-warning-soft-foreground",
  danger: "bg-destructive-soft text-destructive-soft-foreground",
  info: "bg-info-soft text-info-soft-foreground",
  highlight: "bg-highlight-soft text-highlight-soft-foreground",
  neutral: "bg-muted text-muted-foreground",
  dark: "bg-ink/90 text-white",
};

/** Solid fill + white (or dark) text. */
export const toneSolid: Record<Tone, string> = {
  brand: "bg-gradient-brand text-white",
  success: "bg-success text-white",
  warning: "bg-warning text-white",
  danger: "bg-destructive text-white",
  info: "bg-info text-white",
  highlight: "bg-highlight text-white",
  neutral: "bg-secondary text-secondary-foreground",
  dark: "bg-gradient-dark text-white",
};

/** Text colour only (icons, numbers). */
export const toneText: Record<Tone, string> = {
  brand: "text-primary",
  success: "text-success-soft-foreground",
  warning: "text-warning-soft-foreground",
  danger: "text-destructive-soft-foreground",
  info: "text-info-soft-foreground",
  highlight: "text-highlight-soft-foreground",
  neutral: "text-muted-foreground",
  dark: "text-foreground",
};

/** Border for outlined / tinted panels. */
export const toneBorder: Record<Tone, string> = {
  brand: "border-primary/25",
  success: "border-success/30",
  warning: "border-warning/30",
  danger: "border-destructive/30",
  info: "border-info/30",
  highlight: "border-highlight/30",
  neutral: "border-border",
  dark: "border-white/10",
};

/** Old tone names used before the library existed → new tones. */
export const LEGACY_TONE: Record<string, Tone> = {
  blue: "brand", sky: "info", violet: "highlight", amber: "warning", green: "success", rose: "danger", orange: "brand", teal: "brand",
};
export const asTone = (t: string | undefined, fallback: Tone = "brand"): Tone =>
  (t && (t in toneSoft ? (t as Tone) : LEGACY_TONE[t])) || fallback;
