"use client";
import { useState } from "react";
import { FileText, Link2, Pencil, PlayCircle, Radio } from "lucide-react";
import { Badge, Button, cardVariants } from "@/components/ui";
import type { Lesson } from "@/lib/types";
import { cn, formatDateTime, formatMonth } from "@/lib/utils";
import { livePlatform } from "@/lib/schedule";
import { useT } from "@/i18n/client";
import { CancelSessionButton, DeleteButton, LessonForm, type SessionDefaults } from "../../forms";
import { deleteLessonAction } from "../../actions";

export function LessonList({ classId, lessons, links, defaults }: { classId: string; lessons: Lesson[]; links: Record<string, string>; defaults: SessionDefaults }) {
  const t = useT("admin.class");
  const tc = useT("common");
  const months12 = tc.raw<string[]>("months");
  const [editing, setEditing] = useState<string | null>(null);
  const months = [...new Set(lessons.map((l) => l.month))].sort().reverse();
  if (!lessons.length) return <p className={cn(cardVariants({ variant: "outline" }), "border-dashed p-6 text-center text-sm text-muted-foreground")}>{t("noLessons")}</p>;
  return (
    <div className="space-y-6">
      {months.map((m) => (
        <div key={m}>
          <h3 className="mb-2 font-display font-semibold">{formatMonth(m, months12)}</h3>
          <div className={cn(cardVariants(), "divide-y")}>
            {lessons.filter((l) => l.month === m).map((l) => {
              const link = links[l.id];
              return (
                <div key={l.id} className={cn("p-3", l.is_cancelled && "bg-muted/40")}>
                  <div className="flex items-center gap-3">
                    <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold">W{l.week_number}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className={cn("truncate font-medium", l.is_cancelled && "text-muted-foreground line-through")}>{l.title}</p>
                        {l.session_type === "extra" && <Badge variant="warning">{tc("schedule.types.extra")}</Badge>}
                        {l.is_cancelled && <Badge variant="destructive">{tc("schedule.cancelled")}</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {l.live_start_time && <span className="flex items-center gap-1"><Radio className="h-3 w-3" />{formatDateTime(l.live_start_time)}</span>}
                        {link && <span className="flex items-center gap-1"><Link2 className="h-3 w-3" />{tc(`schedule.platforms.${livePlatform(link) ?? "other"}`)}</span>}
                        {l.live_start_time && !link && <span className="font-semibold text-warning-soft-foreground">{t("noLink")}</span>}
                        {l.youtube_url && <span className="flex items-center gap-1"><PlayCircle className="h-3 w-3" />{t("recording")}</span>}
                        {l.tute_pdf_url && <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{t("tute")}</span>}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" aria-label={t("edit")} onClick={() => setEditing(editing === l.id ? null : l.id)}><Pencil /></Button>
                    {l.live_start_time && <CancelSessionButton id={l.id} cancelled={l.is_cancelled} />}
                    <DeleteButton action={deleteLessonAction} id={l.id} size="icon" confirm={t("deleteLesson")} />
                  </div>
                  {editing === l.id && <div className="mt-4 border-t pt-4"><LessonForm classId={classId} lesson={l} liveUrl={link} defaults={defaults} onDone={() => setEditing(null)} /></div>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
