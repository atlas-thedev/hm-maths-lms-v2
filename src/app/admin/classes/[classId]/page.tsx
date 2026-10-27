import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, CalendarDays, Eye, Link2, Radio, Users } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, StatCard, buttonVariants, cardVariants, toneSoft } from "@/components/ui";
import type { ClassRow, Lesson } from "@/lib/types";
import { cn, currentMonth } from "@/lib/utils";
import { liveWindow } from "@/lib/data";
import { formatDuration, livePlatform } from "@/lib/schedule";
import { CancelSessionButton, ClassForm, DeleteButton, GenerateSessionsForm, LessonForm } from "../../forms";
import { deleteClassAction } from "../../actions";
import { LessonList } from "./lesson-list";
import { getFormat, getScheduleLabel, getT } from "@/i18n/server";

export default async function AdminClassPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  const { db } = await requireOwner();
  const [t, tc, f, sched] = await Promise.all([getT("admin.class"), getT("common"), getFormat(), getScheduleLabel()]);
  const [{ data: cls }, { data: lessonData }, { count }, { data: def }, { data: linkRows }] = await Promise.all([
    db.from("classes").select("*").eq("id", classId).maybeSingle(),
    db.from("lessons").select("*").eq("class_id", classId).order("month", { ascending: false }).order("live_start_time", { ascending: true, nullsFirst: false }).order("week_number").order("sort_order"),
    db.from("enrollments").select("id", { count: "exact", head: true }).eq("class_id", classId).eq("status", "approved").eq("month", currentMonth()),
    db.from("class_live_defaults").select("live_url").eq("class_id", classId).maybeSingle(),
    db.from("lesson_live_links").select("lesson_id, live_url, lessons!inner(class_id)").eq("lessons.class_id", classId),
  ]);
  if (!cls) notFound();
  const c = cls as ClassRow;
  const lessons = (lessonData ?? []) as Lesson[];
  const links: Record<string, string> = Object.fromEntries((linkRows ?? []).map((r) => [r.lesson_id as string, r.live_url as string]));
  const defaultLink = (def?.live_url as string | undefined) ?? null;
  const timetable = sched({ ...c, schedule: null });
  const now = Date.now();
  const upcoming = lessons
    .map((l) => ({ l, w: liveWindow(l, c.duration_minutes, now) }))
    .filter((x) => x.w && !x.w.ended)
    .sort((a, b) => (a.l.live_start_time! < b.l.live_start_time! ? -1 : 1));
  const next = upcoming.find((x) => !x.l.is_cancelled);
  const ready = c.schedule_days.length > 0 && !!c.start_time;
  const defaults = { liveUrl: defaultLink, durationMinutes: c.duration_minutes, startTime: c.start_time };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/classes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />{t("back")}</Link>
        <div className="flex gap-2">
          <Link href={`/dashboard/classes/${classId}`} className={buttonVariants({ variant: "outline", size: "sm" })}><Eye /> {t("viewAsStudent")}</Link>
          <DeleteButton action={deleteClassAction} id={classId} label={t("delete")} confirm={t("deleteConfirm")} />
        </div>
      </div>
      <div>
        <h1 className="font-display text-2xl font-bold">{c.title}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4" />{timetable ?? t("noTimetable")}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t("paidThisMonth")} value={count ?? 0} icon={Users} />
        <StatCard label={t("nextClass")} value={next ? f.dateTime(next.l.live_start_time) : tc("dash")} icon={CalendarClock} hint={next?.l.title} />
        <StatCard label={t("upcomingCount")} value={upcoming.filter((x) => !x.l.is_cancelled).length} icon={Radio} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="h-4 w-4 text-teal-700" /> {t("timetable")}</CardTitle>
              <CardDescription>{t("timetableHint")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {ready && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/50 p-3 text-sm">
                  <span className="font-semibold">{timetable}</span>
                  {defaultLink
                    ? <Badge variant="default"><Link2 />{tc(`schedule.platforms.${livePlatform(defaultLink) ?? "other"}`)}</Badge>
                    : <Badge variant="warning">{t("noDefaultLink")}</Badge>}
                  <a href="#timetable" className="ml-auto text-xs font-semibold text-primary hover:underline">{t("editTimetable")}</a>
                </div>
              )}
              <GenerateSessionsForm classId={classId} ready={ready} defaultTitle={tc(`classTypes.${c.class_type}`)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("addSession")}</CardTitle>
              <CardDescription>{t("addSessionHint")}</CardDescription>
            </CardHeader>
            <CardContent><LessonForm classId={classId} defaults={defaults} defaultType="extra" /></CardContent>
          </Card>

          <Card><CardHeader><CardTitle className="text-base">{t("details")}</CardTitle></CardHeader><CardContent><ClassForm cls={c} defaultLiveUrl={defaultLink} /></CardContent></Card>
        </div>

        <div className="space-y-6">
          <section>
            <h2 className="mb-3 font-display text-lg font-semibold">{t("upcoming")}</h2>
            {upcoming.length ? (
              <ul className="space-y-2">
                {upcoming.slice(0, 8).map(({ l, w }) => {
                  const d = new Date(l.live_start_time!);
                  const link = links[l.id];
                  return (
                    <li key={l.id} className={cn(cardVariants({ variant: "outline" }), "flex items-center gap-3 bg-card p-3", l.is_cancelled && "opacity-60")}>
                      <div className={cn("grid h-14 w-14 shrink-0 place-items-center rounded-xl text-center leading-none", toneSoft[l.session_type === "extra" ? "warning" : "brand"])}>
                        <span>
                          <span className="block text-[10px] font-semibold uppercase">{d.toLocaleDateString("en-LK", { weekday: "short", timeZone: "Asia/Colombo" })}</span>
                          <span className="block font-display text-xl font-bold">{d.toLocaleDateString("en-LK", { day: "numeric", timeZone: "Asia/Colombo" })}</span>
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className={cn("truncate font-medium", l.is_cancelled && "line-through")}>{l.title}</p>
                          {l.session_type === "extra" && <Badge variant="warning">{tc("schedule.types.extra")}</Badge>}
                          {l.is_cancelled && <Badge variant="destructive">{tc("schedule.cancelled")}</Badge>}
                          {w!.open && !l.is_cancelled && <Badge variant="destructive" className="animate-pulse">{tc("live.liveNow")}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {f.dateTime(l.live_start_time)} · {formatDuration(w!.minutes)} · {link ? tc(`schedule.platforms.${livePlatform(link) ?? "other"}`) : <span className="font-semibold text-warning-soft-foreground">{t("noLink")}</span>}
                        </p>
                      </div>
                      <CancelSessionButton id={l.id} cancelled={l.is_cancelled} />
                    </li>
                  );
                })}
              </ul>
            ) : <p className={cn(cardVariants({ variant: "outline" }), "border-dashed p-6 text-center text-sm text-muted-foreground")}>{t("noUpcoming")}</p>}
          </section>

          <section>
            <h2 className="mb-3 font-display text-lg font-semibold">{t("content")}</h2>
            <LessonList classId={classId} lessons={lessons} links={links} defaults={defaults} />
          </section>
        </div>
      </div>
    </div>
  );
}
