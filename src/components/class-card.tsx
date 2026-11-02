import Link from "next/link";
import { Clock, Laptop, MapPin, Video } from "lucide-react";
import type { ClassRow } from "@/lib/types";
import { Badge, cardVariants } from "@/components/ui";
import { ClassBanner } from "@/components/class-banner";
import { getT } from "@/i18n/server";
import { ACCESS_DAYS } from "@/lib/constants";
import { cn, formatLKR } from "@/lib/utils";

export { ClassBanner };

/**
 * Shop-style class card: banner, type + batch, title, two lines of description, "40 days · Zoom + Video",
 * then price and where it runs. `badge` sits on the banner (e.g. "You have this"); `footer` replaces the
 * place label on the right of the price (admin: Active / Hidden).
 */
export async function ClassCard({ cls, href, footer, badge }: { cls: ClassRow; href?: string; footer?: React.ReactNode; badge?: React.ReactNode }) {
  const [t, te, tm] = await Promise.all([getT("common"), getT("portal.enroll"), getT("portal.classes")]);
  const online = !cls.town || cls.town === "Online";
  const body = (
    <div className={cn(cardVariants({ variant: "interactive" }), "group flex h-full flex-col overflow-hidden")}>
      <div className="relative">
        <ClassBanner cls={cls} />
        {badge ? <div className="absolute left-3 top-3">{badge}</div> : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge>{t(`classTypes.${cls.class_type}`)}</Badge>
          {cls.target_year ? <Badge variant="secondary">{t("alBatch", { year: cls.target_year })}</Badge> : null}
        </div>
        <h3 className="line-clamp-2 font-display font-semibold leading-snug transition group-hover:text-primary">{cls.title}</h3>
        {cls.description ? <p className="line-clamp-2 whitespace-pre-line text-sm text-muted-foreground">{cls.description}</p> : null}
        <p className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
          {!cls.is_free && <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{te("tiles.days", { n: ACCESS_DAYS })}</span>}
          <span className="flex items-center gap-1.5"><Video className="h-3.5 w-3.5" />{te("tiles.mode")}</span>
        </p>
        <div className="flex items-center justify-between gap-3 border-t pt-3">
          <span className="whitespace-nowrap font-display font-bold">{cls.is_free ? t("free") : formatLKR(cls.fee)}</span>
          {footer ?? (
            <span className="flex min-w-0 items-center gap-1 truncate text-xs text-muted-foreground">
              {online ? <Laptop className="h-3.5 w-3.5 shrink-0" /> : <MapPin className="h-3.5 w-3.5 shrink-0" />}
              <span className="truncate">{online ? tm("month.physicalOnline") : t(`towns.${cls.town}`)}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
  return href ? <Link href={href} className="block h-full">{body}</Link> : body;
}
