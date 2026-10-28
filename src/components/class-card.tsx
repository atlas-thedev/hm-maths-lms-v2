import Link from "next/link";
import { CalendarClock, MapPin, GraduationCap } from "lucide-react";
import type { ClassRow } from "@/lib/types";
import { Badge, cardVariants } from "@/components/ui";
import { ClassBanner } from "@/components/class-banner";
import { getScheduleLabel, getT } from "@/i18n/server";
import { cn, formatLKR } from "@/lib/utils";

export { ClassBanner };

export async function ClassCard({ cls, href, footer }: { cls: ClassRow; href?: string; footer?: React.ReactNode }) {
  const [t, sched] = await Promise.all([getT("common"), getScheduleLabel()]);
  const timetable = sched(cls);
  const body = (
    <div className={cn(cardVariants({ variant: "interactive" }), "group flex h-full flex-col overflow-hidden")}>
      <div className="relative">
        <ClassBanner cls={cls} />
        <div className="absolute left-3 top-3 flex gap-1.5">
          <Badge variant="overlay">{t(`classTypes.${cls.class_type}`)}</Badge>
          {cls.target_year ? <Badge variant="overlay-light">{t("alBatch", { year: cls.target_year })}</Badge> : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-display font-semibold leading-snug group-hover:text-primary">{cls.title}</h3>
        {cls.description ? <p className="line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">{cls.description}</p> : null}
        <div className="mt-auto space-y-1 pt-2 text-xs text-muted-foreground">
          {cls.town ? (
            <p className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {cls.town === "Online" ? "භෞතික & Online" : t(`towns.${cls.town}`)}
            </p>
          ) : null}
          {timetable ? <p className="flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" /><span className="line-clamp-1">{timetable}</span></p> : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t pt-3">
          <span className="flex items-center gap-1.5 whitespace-nowrap font-display font-bold">
            <GraduationCap className="h-4 w-4 text-primary" />
            {cls.is_free ? t("free") : t("perMonth", { amount: formatLKR(cls.fee) })}
          </span>
          {footer}
        </div>
      </div>
    </div>
  );
  return href ? <Link href={href} className="block h-full">{body}</Link> : body;
}
