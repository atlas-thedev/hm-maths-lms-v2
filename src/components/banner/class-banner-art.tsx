import "./banner.css";
import { cn } from "@/lib/utils";
import { fitScale, type BannerContent, type BannerShape } from "@/lib/banner";

const Warn = () => (
  <svg viewBox="0 0 24 24" aria-hidden fill="none"><path d="M12 3 2.5 20h19L12 3Z" fill="#fff" /><path d="M12 9.5v4.6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /><circle cx="12" cy="17" r="1.35" fill="currentColor" /></svg>
);

/** Width (in container units) the big word may use in each shape; the font shrinks for long words. */
const HEAD_ROOM: Record<BannerShape, [avail: number, base: number]> = { poster: [86, 27], wide: [84, 33], strip: [130, 44] };

/**
 * One class banner, drawn in HTML/CSS from the content (see src/lib/banner.ts). It fills its parent, which sets the
 * shape: "poster" (square, for sharing), "wide" (cards) or "strip" (thin header). The parent needs an aspect ratio.
 */
export function ClassBannerArt({ content: c, shape, className }: { content: BannerContent; shape: BannerShape; className?: string }) {
  const [avail, base] = HEAD_ROOM[shape];
  const fit = fitScale(c.headline, avail - (c.config.template === "paper" ? 16 : 0), base, c.locale);
  const place = [c.venue, c.town].filter(Boolean);
  const where = place.length ? { main: place[0], sub: place[1] ?? "" } : null;
  const when = c.time ? { main: c.time, sub: c.days } : c.days ? { main: c.days, sub: "" } : null;
  return (
    <div className={cn("bnr", !c.headline && "no-head", className)} data-tpl={c.config.template} data-shape={shape} role="img"
      aria-label={[c.headline, c.year, c.type, c.venue || c.town, c.time].filter(Boolean).join(" · ")}>
      <div className="bnr-bg" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {c.photo ? <img className="bnr-photo" src={c.photo} alt="" loading="eager" decoding="async" /> : null}
      </div>
      <div className="bnr-in">
        {c.badge ? <div className="bnr-badge">{c.config.template === "attention" ? <Warn /> : null}<span>{c.badge}</span></div>  : null}
        {c.headline ? <div className="bnr-head" style={{ ["--fit" as string]: fit }}>{c.headline}</div> : null}
        <div className="bnr-yt">{c.year ? <span className="bnr-year">{c.year}</span> : null}<span className="bnr-type">{c.type}</span></div>
        <hr className="bnr-rule" />
        {c.subtitle ? <div className="bnr-sub">{c.subtitle}</div> : null}
        {where || when ? (
          <div className={cn("bnr-info", !(where && when) && "one")}>
            {where ? <div><b>{where.main}</b>{where.sub ? <span>{where.sub}</span> : null}</div> : null}
            {where && when ? <i /> : null}
            {when ? <div><b>{when.main}</b>{when.sub ? <span>{when.sub}</span> : null}</div> : null}
          </div>
        ) : null}
        {c.tagline ? <div className="bnr-tag">{c.tagline}</div> : null}
        <div className="bnr-owner"><b>{c.owner.toUpperCase()}</b><span>COMBINED MATHS</span></div>
      </div>
    </div>
  );
}
