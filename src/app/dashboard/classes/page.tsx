import Link from "next/link";
import { ArrowRight, BookOpen, CalendarClock, FileText, IdCard, PlayCircle, Radio } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getMyEnrollments, liveWindow } from "@/lib/data";
import { ClassBanner } from "@/components/class-banner";
import { buttonVariants } from "@/components/ui/button";
import { Alert, EmptyState, PageHeader } from "@/components/ui/misc";
import type { Lesson } from "@/lib/types";
import { getFormat, getT } from "@/i18n/server";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  return { title: (await getT("portal.nav"))("classes") };
}

type LessonLite = Pick<Lesson, "id" | "class_id" | "month" | "youtube_url" | "tute_pdf_url" | "live_start_time" | "duration_minutes" | "is_cancelled">;

/**
 * My Classes: one card per paid month (newest first). Tapping a card opens that month's recordings and
 * tutes; during a live class's join window the card also shows "Live now — Join".
 */
export default async function MyClassesPage() {
  const { db, user } = await requireUser();
  const [t, f] = await Promise.all([getT("portal.classes"), getFormat()]);
  const enrollments = await getMyEnrollments(db, user.id);
  const paid = enrollments.filter((e) => e.status === "approved" && e.classes);
  const ids = [...new Set(paid.map((e) => e.class_id))];
  // RLS returns lessons only for the months this student paid for.
  const { data } = ids.length
    ? await db.from("lessons").select("id, class_id, month, youtube_url, tute_pdf_url, live_start_time, duration_minutes, is_cancelled").in("class_id", ids)
    : { data: [] };
  const lessons = (data ?? []) as LessonLite[];
  const now = Date.now();

  const cards = paid.map((e) => {
    const ls = lessons.filter((l) => l.class_id === e.class_id && l.month === e.month);
    const sessions = ls.map((l) => ({ l, w: liveWindow(l, e.classes!.duration_minutes, now) })).filter((x) => x.w && !x.w.ended && !x.w.cancelled)
      .sort((a, b) => a.w!.startISO.localeCompare(b.w!.startISO));
    return {
      e, recordings: ls.filter((l) => l.youtube_url).length, tutes: ls.filter((l) => l.tute_pdf_url).length,
      liveNow: sessions.find((x) => x.w!.open) ?? null, next: sessions[0] ?? null,
    };
  }).sort((a, b) => b.e.month.localeCompare(a.e.month) || a.e.classes!.title.localeCompare(b.e.classes!.title));
  const months = [...new Set(cards.map((c) => c.e.month))];

  const pending = enrollments.filter((e) => e.status === "pending");
  const rejected = enrollments.filter((e) => e.status === "rejected");
  const list = (rows: typeof enrollments) => rows.map((e) => `${e.classes?.title ?? ""} · ${f.month(e.month)}`).join(", ");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} icon={BookOpen}>
        <Link href="/dashboard/profile#id" className={buttonVariants({ variant: "pink", size: "sm" })}><IdCard /> {t("myId")}</Link>
      </PageHeader>

      {(pending.length > 0 || rejected.length > 0) && (
        <div className="space-y-2">
          {pending.length > 0 && <Alert>{t("pendingNote", { list: list(pending) })} <Link href="/dashboard/payments" className="font-semibold underline">{t("viewPayments")}</Link></Alert>}
          {rejected.length > 0 && <Alert variant="error">{t("rejectedNote", { list: list(rejected) })} <Link href="/dashboard/payments" className="font-semibold underline">{t("viewPayments")}</Link></Alert>}
        </div>
      )}

      {!cards.length ? (
        <EmptyState icon={BookOpen} title={t("empty")} description={t("emptyText")}>
          <Link href="/dashboard/store" className={buttonVariants({ size: "sm" })}>{t("goStore")}</Link>
        </EmptyState>
      ) : months.map((m) => (
        <section key={m} className="space-y-3" data-testid="class-month">
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">{f.month(m)}</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cards.filter((c) => c.e.month === m).map(({ e, recordings, tutes, liveNow, next }) => {
              const href = `/dashboard/classes/${e.class_id}?month=${e.month}`;
              return (
                <article key={e.id} data-testid="class-month-card"
                  className={cn("group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lg",
                    liveNow ? "border-destructive/40 ring-1 ring-destructive/20" : "border-border/80")}>
                  <ClassBanner cls={e.classes!} />
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <span className="self-start rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-bold text-accent-foreground">{f.month(e.month)}</span>
                    <h3 className="font-display font-semibold leading-snug group-hover:text-primary">
                      {/* The whole card opens the month's recordings; the Join button sits above this link. */}
                      <Link href={href} className="after:absolute after:inset-0">{e.classes!.title}</Link>
                    </h3>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {recordings || tutes ? (
                        <>
                          <span className="flex items-center gap-1"><PlayCircle className="h-3.5 w-3.5" />{t(recordings === 1 ? "month.recording" : "month.recordings", { n: recordings })}</span>
                          <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{t(tutes === 1 ? "month.tute" : "month.tutes", { n: tutes })}</span>
                        </>
                      ) : <span>{t("month.nothing")}</span>}
                    </p>
                    {!liveNow && next && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarClock className="h-3.5 w-3.5 shrink-0" />{t("month.nextLive", { date: f.dateTime(next.l.live_start_time) })}</p>
                    )}
                    {liveNow && (
                      <Link href={`${href}#live`} data-testid="join-live"
                        className="relative z-10 mt-1 flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-destructive px-4 text-sm font-bold text-white shadow-md shadow-destructive/25 transition hover:-translate-y-px">
                        <Radio className="h-4 w-4 animate-pulse" /> {t("month.liveNow")} · {t("month.join")}
                      </Link>
                    )}
                    <div className="mt-auto flex items-center justify-end border-t pt-3">
                      <span className="flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-primary">{t("month.open")} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
