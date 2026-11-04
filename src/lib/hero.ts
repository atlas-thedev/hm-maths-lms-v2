/*
 * The teacher spot on the home page ("ගුරුවරයා"): one photo of Sir, or a small gallery of photos that the
 * Developer panel controls. Every slide carries its own bilingual name / title / caption, so adding a second
 * photo never means editing translation files.
 *
 * Stored in system_settings under the key "hero_slides". Empty fields fall back to the built-in wording, which
 * keeps the page working (and still translatable) before anyone opens the panel.
 */

export const MAX_HERO_SLIDES = 8;

export interface HeroSlide {
  /** Stable id — the form uses it as a React key and for reordering. */
  id: string;
  /** Uploaded picture (public bucket URL) or an https:// address. Empty = the built-in photo. */
  photo: string;
  nameEn: string; nameSi: string;
  /** "B.Sc · Combined Maths Lecturer" style line. */
  titleEn: string; titleSi: string;
  /** Short line under the title (optional). */
  captionEn: string; captionSi: string;
  /** Optional link the photo opens (e.g. a YouTube channel). */
  href: string;
  /** Unticked slides stay in the panel but are not shown on the site. */
  enabled: boolean;
}

export interface HeroSettings {
  slides: HeroSlide[];
  /** Seconds each photo stays before moving on (only used when there is more than one). */
  intervalSeconds: number;
}

export const DEFAULT_HERO_INTERVAL = 6;

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const imageUrl = (v: unknown) => {
  const u = text(v, 400);
  return /^\/api\/storage\/public\/[\w-]+\/[\w./%-]+$/.test(u) || /^https:\/\/\S+$/.test(u) ? u : "";
};
const safeHref = (v: unknown) => {
  const u = text(v, 400);
  if (!u) return "";
  return /^https:\/\/\S+$/.test(u) || /^\/[\w\-./?=&#%]*$/.test(u) ? u : "";
};

/** A new slide, used by the "Add a photo" button. */
export function blankHeroSlide(): HeroSlide {
  return {
    id: `slide-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    photo: "", nameEn: "", nameSi: "", titleEn: "", titleSi: "",
    captionEn: "", captionSi: "", href: "", enabled: true,
  };
}

/**
 * Accepts whatever the panel, the database or a hand-edited JSON blob hands over.
 * Returns [] when there is nothing saved yet — the page then shows the built-in single photo.
 */
export function normalizeHero(v: unknown): HeroSettings {
  if (!v || typeof v !== "object") return { slides: [], intervalSeconds: DEFAULT_HERO_INTERVAL };
  const o = v as Record<string, unknown>;
  const raw = Array.isArray(o.slides) ? o.slides : [];
  const slides: HeroSlide[] = raw
    .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
    .slice(0, MAX_HERO_SLIDES)
    .map((s, i) => ({
      id: text(s.id, 60) || `slide-${i + 1}`,
      photo: imageUrl(s.photo),
      nameEn: text(s.nameEn, 60), nameSi: text(s.nameSi, 60),
      titleEn: text(s.titleEn, 90), titleSi: text(s.titleSi, 90),
      captionEn: text(s.captionEn, 220), captionSi: text(s.captionSi, 220),
      href: safeHref(s.href),
      enabled: s.enabled === undefined ? true : s.enabled === true,
    }))
    .filter((s) => s.photo || s.nameEn || s.nameSi || s.titleEn || s.titleSi);
  const n = Number(o.intervalSeconds);
  return { slides, intervalSeconds: Number.isFinite(n) ? Math.min(15, Math.max(3, Math.round(n))) : DEFAULT_HERO_INTERVAL };
}

/** What the home page actually renders: enabled slides, plus the built-in one when nothing is saved. */
export function visibleHeroSlides(hero: HeroSettings): HeroSlide[] {
  const on = hero.slides.filter((s) => s.enabled);
  return on.length ? on : [];
}
