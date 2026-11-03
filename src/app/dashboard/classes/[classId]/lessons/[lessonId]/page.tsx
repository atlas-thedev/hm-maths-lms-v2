import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, PlayCircle, ShieldAlert } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { VideoPlayer } from "@/components/video-player";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import type { Lesson } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getFormat, getT } from "@/i18n/server";
import { youtubeId } from "@/lib/youtube";

export default async function LessonPage({ params }: { params: Promise<{ classId: string; lessonId: string }> }) {
  const { classId, lessonId } = await params;
  const { db, profile } = await requireUser();
  const [t, f] = await Promise.all([getT("portal.lesson"), getFormat()]);
  // RLS returns the lesson only if the student has access to that class + month.
  const { data } = await db.from("lessons").select("*, classes(title)").eq("id", lessonId).eq("class_id", classId).maybeSingle();
  if (!data) {
    const { data: cls } = await db.from("classes").select("id").eq("id", classId).maybeSingle();
    if (!cls) notFound();
    return (
      <EmptyState icon={ShieldAlert} title={t("locked")} description={t("lockedText")}>
        <Link href={`/dashboard/store/class/${classId}`} className={buttonVariants({ size: "sm" })}>{t("enroll")}</Link>
      </EmptyState>
    );
  }
  const lesson = data as Lesson & { classes: { title: string } | null };
  const { data: siblings } = await db.from("lessons").select("id, title, week_number, youtube_url")
    .eq("class_id", classId).eq("month", lesson.month).not("youtube_url", "is", null).order("week_number").order("sort_order");
  const vid = youtubeId(lesson.youtube_url);
  // Previous / next recording of this month, in the same order as the list below.
  const list = siblings ?? [];
  const at = list.findIndex((s) => s.id === lesson.id);
  const prev = at > 0 ? list[at - 1] : null;
  const next = at >= 0 && at < list.length - 1 ? list[at + 1] : null;
  const lessonHref = (id: string) => `/dashboard/classes/${classId}/lessons/${id}`;

  return (
    <div className="space-y-6">
      <Link href={`/dashboard/classes/${classId}?month=${lesson.month}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> {lesson.classes?.title} · {f.month(lesson.month)}
      </Link>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          {vid ? (
            <VideoPlayer lessonId={lesson.id} title={lesson.title} protect={profile.role === "student"} watermark={{ userId: profile.id, mobile: profile.mobile, studentId: profile.student_id }} />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-2xl bg-card text-sm text-muted-foreground">{t("noRecording")}</div>
          )}
          {(prev || next) && (
            <nav aria-label={t("inMonth", { month: f.month(lesson.month) })} className="grid grid-cols-2 gap-2">
              {prev ? <Link href={lessonHref(prev.id)} className={buttonVariants({ variant: "outline", className: "min-w-0 justify-start" })}><ChevronLeft /><span className="truncate">{t("prev")}</span></Link> : <span />}
              {next ? <Link href={lessonHref(next.id)} className={buttonVariants({ variant: "default", className: "min-w-0 justify-end" })}><span className="truncate">{t("next")}</span><ChevronRight /></Link> : <span />}
            </nav>
          )}
          <div className="flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-soft sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t("week", { n: lesson.week_number })}</p>
              <h1 className="font-display text-xl font-bold">{lesson.title}</h1>
              {lesson.description && <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{lesson.description}</p>}
            </div>
            {lesson.tute_pdf_url && (
              <a href={`/api/files/tute-pdfs?path=${encodeURIComponent(lesson.tute_pdf_url)}&download=1`} className={buttonVariants({ variant: "outline" })}><Download /> {t("tute")}</a>
            )}
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldAlert className="h-3.5 w-3.5" /> {t("watermark")}</p>
        </div>
        <aside className="rounded-2xl bg-card p-3 shadow-soft">
          <p className="px-2 pb-2 text-sm font-semibold">{t("inMonth", { month: f.month(lesson.month) })}</p>
          <div className="space-y-1">
            {(siblings ?? []).map((s) => (
              <Link key={s.id} href={`/dashboard/classes/${classId}/lessons/${s.id}`}
                className={cn("flex items-center gap-2 rounded-lg px-2 py-2 text-sm", s.id === lesson.id ? "bg-primary/10 font-semibold text-primary" : "hover:bg-accent")}>
                {/* Two lines: these titles share a long prefix and differ only at the end ("… Part 09"), which one line cut off. */}
                <PlayCircle className="h-4 w-4 shrink-0" /><span className="line-clamp-2 flex-1 leading-snug">{s.title}</span><span className="text-[11px] text-muted-foreground">W{s.week_number}</span>
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
