import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, Download, FileText, Lock, PlayCircle, Radio } from "lucide-react";
import { isStaffRole, requireUser } from "@/lib/auth";
import { getClassAccess, getLiveLinks, liveWindow } from "@/lib/data";
import { ClassBanner } from "@/components/class-banner";
import { LiveCountdown } from "@/components/live-countdown";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import type { Lesson } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getFormat, getScheduleLabel, getT } from "@/i18n/server";
import { formatDuration } from "@/lib/schedule";
import { youtubeId, youtubeThumb } from "@/lib/youtube";

export default async function ClassroomPage({ params, searchParams }: {
  params: Promise<{ classId: string }>; searchParams: Promise<{ month?: string }>;
}) {
  const { classId } = await params;
  const { month: requested } = await searchParams;
  const { db, user, profile } = await requireUser();
  const [t, tc, f, sched] = await Promise.all([getT("portal.classroom"), getT("common"), getFormat(), getScheduleLabel()]);
  const access = await getClassAccess(db, user.id, classId, isStaffRole(profile.role));
  if (!access) notFound();
  const { cls, months } = access;
  if (!months.length) {
    if (cls.is_free) return <EmptyState icon={PlayCircle} title={cls.title} description={t("comingSoon")} />;
    redirect(`/dashboard/store/class/${classId}`);
  }
  const month = requested && months.includes(requested) ? requested : months[0];

  const { data } = await db.from("lessons").select("*").eq("class_id", classId).eq("month", month)
    .order("week_number").order("sort_order").order("created_at");
  const lessons = (data ?? []) as Lesson[];
  const now = Date.now();
  const liveSessions = lessons.map((l) => ({ l, w: liveWindow(l, cls.duration_minutes, now) })).filter((x) => x.w && !x.w.ended)
    .sort((a, b) => (a.l.live_start_time! < b.l.live_start_time! ? -1 : 1));
  const links = await getLiveLinks(db, liveSessions.filter((x) => x.w!.open).map((x) => x.l.id));
  const timetable = sched(cls);
  const recordings = lessons.filter((l) => l.youtube_url);
  const materials = lessons.filter((l) => l.tute_pdf_url);
  const weeks = [...new Set(recordings.map((l) => l.week_number))].sort((a, b) => a - b);
  const watermark = { userId: profile.id, mobile: profile.mobile, studentId: profile.student_id };
  // Recordings come first; the live block jumps to the top only while a class is live, and is hidden
  // when the month has no upcoming sessions.
  const liveOpen = liveSessions.some((x) => x.w!.open);
  const sections: [string, string, typeof Radio][] = [
    ...(liveOpen ? [["#live", t("live"), Radio] as [string, string, typeof Radio]] : []),
    ["#recordings", t("recordings"), PlayCircle], ["#materials", t("materials"), FileText],
    ...(!liveOpen && liveSessions.length ? [["#live", t("live"), Radio] as [string, string, typeof Radio]] : []),
  ];

  const liveSection = (
        <section id="live" className="scroll-mt-20">
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold"><Radio className="h-5 w-5 text-destructive" /> {t("live")}</h2>
          {liveSessions.length ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {liveSessions.map(({ l, w }) => (
                <Card key={l.id} className={cn(w!.cancelled && "opacity-70")}>
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {l.session_type === "extra" && <Badge variant="warning">{tc("schedule.types.extra")}</Badge>}
                      {w!.cancelled && <Badge variant="destructive">{tc("schedule.cancelled")}</Badge>}
                    </div>
                    <CardTitle className={cn("text-base", w!.cancelled && "line-through")}>{l.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{f.dateTime(l.live_start_time)} · {formatDuration(w!.minutes)}</p>
                  </CardHeader>
                  <CardContent>
                    {w!.cancelled
                      ? <p className="text-sm text-muted-foreground">{t("cancelledText")}</p>
                      : <LiveCountdown title={l.title} startISO={w!.startISO} endISO={w!.closeISO} liveUrl={links.get(l.id) ?? null} serverNow={new Date(now).toISOString()} watermark={watermark} protect={profile.role === "student"} />}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}
        </section>
  );

  return (
    <div className="space-y-8">
      <Link href={cls.is_free ? "/dashboard/free-zone" : "/dashboard/classes"} data-testid="classroom-back"
        className="-mb-4 inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> {cls.is_free ? t("backFree") : t("back")}
      </Link>
      <div className="overflow-hidden rounded-2xl bg-card shadow-soft">
        <ClassBanner cls={cls} shape="strip" className="aspect-[16/4] sm:aspect-[16/3]" />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap gap-2"><Badge>{tc(`classTypes.${cls.class_type}`)}</Badge>{cls.town && <Badge variant="secondary">{tc(`towns.${cls.town}`)}</Badge>}</div>
            <h1 className="mt-2 font-display text-2xl font-bold">{cls.title}</h1>
            {timetable && <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4" />{timetable}</p>}
          </div>
          <nav aria-label={t("months")} className="flex flex-wrap gap-1.5">
            {months.map((m) => (
              <Link key={m} href={`?month=${m}`} className={cn(buttonVariants({ size: "sm", variant: m === month ? "default" : "outline" }))}>{f.month(m)}</Link>
            ))}
            {!cls.is_free && <Link href={`/dashboard/store/class/${classId}`} className={buttonVariants({ size: "sm", variant: "ghost" })}>{t("otherMonths")}</Link>}
          </nav>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto text-sm">
        {sections.map(([href, label, I]) => (
          <a key={href} href={href} className={buttonVariants({ variant: "outline", size: "sm", className: "bg-card" })}><I />{label}</a>
        ))}
      </div>


      {liveOpen && liveSection}

      <section id="recordings" className="scroll-mt-20">
        <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold"><PlayCircle className="h-5 w-5 text-primary" /> {t("recordings")}</h2>
        {weeks.length ? (
          <div className="space-y-6">
            {weeks.map((wk) => (
              <div key={wk}>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t("week", { n: wk })}</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {recordings.filter((l) => l.week_number === wk).map((l) => {
                    const id = youtubeId(l.youtube_url);
                    return (
                      <Link key={l.id} href={`/dashboard/classes/${classId}/lessons/${l.id}`} className="group overflow-hidden rounded-2xl bg-card shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg">
                        <div className="relative aspect-video bg-muted">
                          {id && <Image src={youtubeThumb(id)} alt="" fill sizes="400px" className="object-cover" />}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/25 transition [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"><PlayCircle className="h-12 w-12 text-white" /></div>
                        </div>
                        <div className="p-4"><p className="font-semibold group-hover:text-primary">{l.title}</p>
                          {l.description && <p className="line-clamp-1 text-xs text-muted-foreground">{l.description}</p>}</div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground shadow-soft">{t("noRecordings")}</p>}
      </section>

      <section id="materials" className="scroll-mt-20">
        <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold"><FileText className="h-5 w-5 text-success-soft-foreground" /> {t("materials")}</h2>
        {materials.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {materials.map((l) => (
              <div key={l.id} className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-soft">
                <div className="rounded-lg bg-destructive/10 p-2.5 text-destructive"><FileText className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{l.title}</p><p className="text-xs text-muted-foreground">{t("week", { n: l.week_number })} · {t("pdfTute")}</p></div>
                <a href={`/api/files/tute-pdfs?path=${encodeURIComponent(l.tute_pdf_url!)}&download=1`} className={buttonVariants({ size: "sm", variant: "outline" })}><Download /> {tc("actions.download")}</a>
              </div>
            ))}
          </div>
        ) : <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground shadow-soft"><Lock className="mr-1 inline h-4 w-4" />{t("noMaterials")}</p>}
      </section>

      {!liveOpen && liveSessions.length > 0 && liveSection}
    </div>
  );
}
