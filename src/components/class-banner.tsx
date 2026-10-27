"use client";
import Image from "next/image";
import { ClassBannerArt } from "@/components/banner/class-banner-art";
import { useBrand, useLocale, useT } from "@/i18n/client";
import { colomboMonth, normalizeBannerConfig, timeRange, type BannerConfig, type BannerContent, type BannerShape } from "@/lib/banner";
import { sortDays } from "@/lib/schedule";
import { cn } from "@/lib/utils";

/** Poster colour per class type — defined in src/theme/theme.css (--gradient-class-*). */
const GRADIENTS: Record<string, string> = {
  Theory: "bg-class-theory",
  Revision: "bg-class-revision",
  "Paper Class": "bg-class-paper",
  "Extra Class": "bg-class-extra",
  "Free Seminar": "bg-class-free",
};
const SYMBOLS: Record<string, string> = { Theory: "∫", Revision: "Σ", "Paper Class": "π", "Extra Class": "√", "Free Seminar": "∞" };
const TYPE_LABEL: Record<string, string> = { Theory: "Theory", Revision: "Revision", "Paper Class": "Paper Class", "Extra Class": "Extra Class", "Free Seminar": "Free Seminar" };

/** What the banner needs from a class. A full class row fits; the home page carousel passes just these. */
export interface BannerClass {
  banner_url: string | null; class_type: string; title: string;
  banner_config?: BannerConfig | null; town?: string | null; target_year?: number | null;
  start_time?: string | null; duration_minutes?: number | null; schedule_days?: number[] | null;
}

/** Turns a class into the words on its banner, in the visitor's language, with the CURRENT month filled in. */
export function useBannerContent(cls: BannerClass, override?: Partial<BannerConfig>): BannerContent | null {
  const tc = useT("common");
  const centers = useT("landing.home.centers");
  const hero = useT("landing.home.hero");
  const locale = useLocale();
  const brand = useBrand();
  const base = normalizeBannerConfig(cls.banner_config);
  const config = override ? normalizeBannerConfig({ ...(base ?? {}), ...override }) : base;
  if (!config) return null;
  const months = tc.raw<string[]>("months") ?? [];
  const dayNames = tc.raw<string[]>("schedule.days") ?? [];
  const items = centers.raw<{ key: string; place: string; town: string }[]>("items") ?? [];
  const isOnline = cls.town === "Online";
  const item = cls.town ? items.find((i) => i.key === cls.town) : undefined;
  const headline = config.headlineMode === "month" ? (months[colomboMonth()] ?? "") : config.headlineMode === "custom" ? config.headline : "";
  return {
    config, headline, locale,
    year: cls.target_year ? String(cls.target_year) : "",
    type: TYPE_LABEL[cls.class_type] ?? cls.class_type,
    title: cls.title,
    badge: config.badge,
    subtitle: config.subtitle || cls.title,
    venue: isOnline ? "" : item?.place ?? "",
    town: cls.town ? (isOnline ? tc("towns.Online") : item?.town ?? tc(`towns.${cls.town}`)) : "",
    time: timeRange(cls.start_time, cls.duration_minutes, locale),
    days: sortDays(cls.schedule_days ?? []).map((d) => dayNames[d] ?? "").filter(Boolean).join(" · "),
    tagline: config.tagline || hero("tagline"),
    owner: brand.owner || brand.name,
    photo: cls.banner_url,
  };
}

/** Class poster: a template (its month always the current one), an uploaded banner, or a generated gradient with a maths symbol. */
export function ClassBanner({ cls, className, shape = "wide" }: { cls: BannerClass; className?: string; shape?: BannerShape }) {
  const content = useBannerContent(cls);
  if (content) {
    return (
      <div className={cn("relative aspect-[16/7] overflow-hidden", className)}>
        <ClassBannerArt content={content} shape={shape} />
      </div>
    );
  }
  return (
    <div className={cn("relative aspect-[16/7] overflow-hidden", GRADIENTS[cls.class_type] ?? GRADIENTS.Theory, className)}>
      {cls.banner_url ? (
        <Image src={cls.banner_url} alt={cls.title} fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover" />
      ) : (
        <>
          <div className="bg-hex absolute inset-0 opacity-70" />
          <span className="absolute -right-2 -top-6 select-none font-display text-[9rem] font-black leading-none text-white/15">
            {SYMBOLS[cls.class_type] ?? "∫"}
          </span>
          <span className="absolute bottom-3 left-4 right-24 line-clamp-2 font-display text-lg font-extrabold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,.45)]">{cls.title}</span>
        </>
      )}
    </div>
  );
}
