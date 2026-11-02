import Link from "next/link";
import { ArrowRight, BookOpen, CalendarClock, Clock, FileText, IdCard, Laptop, MapPin, PlayCircle, Radio } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getMyEnrollments, liveWindow } from "@/lib/data";
import { ClassBanner } from "@/components/class-banner";
import { Badge } from "@/components/ui/badge";
import { ChipGroup, ChipLink } from "@/components/ui/blocks";
import { buttonVariants } from "@/components/ui/button";
import { Alert, EmptyState, PageHeader } from "@/components/ui/misc";
import type { Lesson } from "@/lib/types";
import { getFormat, getT } from "@/i18n/server";
import { accessOpen, cn, currentMonth, daysUntil, formatLKR } from "@/lib/utils";

export async function generateMetadata() {
  return { title: (await getT("portal.nav"))("classes") };
}

type LessonLite = Pick<Lesson, "id" | "class_id" | "month" | "youtube_url" | "tute_pdf_url" | "live_start_time" | "duration_minutes" | "is_cancelled">;

/**
 * My Classes: every paid month as a card in ONE grid (live first, then open months, newest first; expired last),
 * so cards sit side by side instead of one short row per month. A card shows the days of access left
 * (approval + ACCESS_DAYS); tapping it opens that month's recordings and tutes, or — once access has run out —
 * the store page to buy it again. During a live class's join window the card also shows "Live now — Join".
 */
export default async function MyClassesPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month: picked } = await searchParams;
  const { db, user } = await requireUser();
  const [t, tc, f] = await Promise.all([getT("portal.classes"), getT("common"), getFormat()]);
  const enrollments = await getMyEnrollments(db, user.id);
  const paid = enrollments.filter((e) => e.status === "approved" && e.classes);
  const ids = [...new Set(paid.map((e) => e.class_id))];
  // RLS returns lessons only for the months this student paid for.
  const { data } = ids.length
    ? await db.from("lessons").select("id, class_id, month, youtube_url, tute_pdf_url, live_start_time, duration_minutes, is_cancelled").in("class_id", ids)
    : { data: [] };
  const lessons = (data ?? []) as LessonLite[];
  const now = Date.now();
  const thisMonth = currentMonth();

  const cards = paid.map((e) => {
    const ls = lessons.filter((l) => l.class_id === e.class_id && l.month === e.month);
    const sessions = ls.map((l) => ({ l, w: liveWindow(l, e.classes!.duration_minutes, now) })).filter((x) => x.w && !x.w.ended && !x.w.cancelled)
      .sort((a, b) => a.w!.startISO.localeCompare(b.w!.startISO));
    const open = accessOpen(e, now);
    return {
      e, open, left: open && e.access_until ? daysUntil(e.access_until, now) : null,
      recordings: ls.filter((l) => l.youtube_url).length, tutes: ls.filter((l) => l.tute_pdf_url).length,
      liveNow: open ? sessions.find((x) => x.w!.open) ?? null : null, next: open ? sessions[0] ?? null : null,
    };
  }).sort((a, b) => Number(!!b.liveNow) - Number(!!a.liveNow) || Number(b.open) - Number(a.open)
    || Number(b.e.month === thisMonth) - Number(a.e.month === thisMonth)
    || b.e.month.localeCompare(a.e.month) || a.e.classes!.title.localeCompare(b.e.classes!.title));
  const months = [...new Set(cards.map((c) => c.e.month))].sort((a, b) => b.localeCompare(a));
  const month = picked && months.includes(picked) ? picked : null;
  const shown = month ? cards.filter((c) => c.e.month === month) : cards;

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
      ) : (
        <>
          {months.length > 1 && (
            <ChipGroup>
              <ChipLink href="/dashboard/classes" active={!month} scroll={false}>{t("all")}</ChipLink>
              {months.map((m) => <ChipLink key={m} href={`/dashboard/classes?month=${m}`} active={m === month} scroll={false}>{f.month(m)}</ChipLink>)}
            </ChipGroup>
          )}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3" data-testid="class-grid">
            {shown.map(({ e, open, left, recordings, tutes, liveNow, next }) => {
              const cls = e.classes!;
              const href = open ? `/dashboard/classes/${e.class_id}?month=${e.month}` : `/dashboard/store/class/${e.class_id}?month=${e.month}`;
              const online = !cls.town || cls.town === "Online";
              return (
                <article key={e.id} data-testid="class-month-card"
                  className={cn("group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10",
                    liveNow ? "border-destructive/40 ring-1 ring-destructive/20" : "border-border/80")}>
                  <div className="relative">
                    <ClassBanner cls={cls} month={e.month} className={cn(!open && "opacity-60 grayscale")} />
                    <span className={cn("absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm backdrop-blur",
                      open ? "bg-black/60 text-white" : "bg-destructive text-white")}>
                      {open && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
                      {t(open ? "month.active" : "month.expired")}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-2.5 p-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge>{tc(`classTypes.${cls.class_type}`)}</Badge>
                      <Badge variant="secondary">{f.month(e.month)}</Badge>
                    </div>
                    <h3 className="line-clamp-2 font-display font-semibold leading-snug group-hover:text-primary">
                      {/* The whole card opens the month's recordings; the Join button sits above this link. */}
                      <Link href={href} className="after:absolute after:inset-0">{cls.title}</Link>
                    </h3>
                    {cls.description && <p className="line-clamp-2 whitespace-pre-line text-sm text-muted-foreground">{cls.description}</p>}
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {left !== null && (
                        <span className={cn("flex items-center gap-1 font-semibold", left <= 3 ? "text-destructive" : "text-foreground/80")}
                          title={t("month.accessUntil", { date: f.dateTime(e.access_until) })}>
                          <Clock className="h-3.5 w-3.5" />{left <= 1 ? t("month.lastDay") : t("month.daysLeft", { n: left })}
                        </span>
                      )}
                      {!open ? (
                        <span className="font-semibold text-destructive">{t("month.ended", { date: f.date(e.access_until) })}</span>
                      ) : recordings || tutes ? (
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
                    <div className="mt-auto flex items-center justify-between gap-3 border-t pt-3">
                      <span className="min-w-0">
                        <span className="block font-display text-sm font-bold">{formatLKR(e.amount ?? cls.fee)}</span>
                        <span className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                          {online ? <Laptop className="h-3 w-3 shrink-0" /> : <MapPin className="h-3 w-3 shrink-0" />}
                          {/* Same wording as the banner: an "Online" class is open to physical students too. */}
                          {online ? t("month.physicalOnline") : tc(`towns.${cls.town}`)}
                        </span>
                      </span>
                      <span className={cn("flex items-center gap-1 whitespace-nowrap text-sm font-semibold", open ? "text-primary" : "text-destructive")}>
                        {t(open ? "month.open" : "month.renew")} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
