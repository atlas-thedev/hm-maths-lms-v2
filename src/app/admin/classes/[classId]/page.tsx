import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle, ArrowLeft, ArrowRight, CalendarClock, CalendarDays, CheckCircle2, Circle, Clock, Eye, FileText, LayoutDashboard,
  Link2, PlayCircle, Radio, Receipt, Settings2, ShieldAlert, Users, type LucideIcon,
} from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { ClassBanner } from "@/components/class-banner";
import {
  Avatar, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, ChipGroup, ChipLink, IconTile, ProgressBar, StatCard, TabNav,
  buttonVariants, cardVariants, toneSoft, type TabNavItem,
} from "@/components/ui";
import type { ClassRow, Lesson } from "@/lib/types";
import { accessOpen, cn, currentMonth, daysUntil } from "@/lib/utils";
import { liveWindow } from "@/lib/data";
import { formatDuration, livePlatform } from "@/lib/schedule";
import { CancelSessionButton, ClassForm, DeleteButton, GenerateSessionsForm, LessonForm } from "../../forms";
import { deleteClassAction } from "../../actions";
import { LessonList } from "./lesson-list";
import { getFormat, getScheduleLabel, getT } from "@/i18n/server";

const TABS = ["overview", "sessions", "content", "students", "settings"] as const;
type Tab = (typeof TABS)[number];
const DAY = 86_400_000;

type EnrollRow = {
  id: string; student_id: string; month: string; status: string; access_until: string | null; created_at: string;
  profiles: { full_name: string; student_id: string | null; mobile: string | null } | null;
};

/**
 * Admin → one class, split into tabs (?tab=):
 *  Overview  — numbers, a setup checklist and a "needs attention" list that link straight to the fix;
 *  Sessions  — generate a month from the weekly timetable, extra sessions, upcoming list (not for combos);
 *  Content   — lessons / recordings / tutes of one month (?month=, ?edit= opens a lesson's form);
 *  Students  — who has access, until when (?month=);
 *  Settings  — the class form and the delete button.
 */
export default async function AdminClassPage({ params, searchParams }: {
  params: Promise<{ classId: string }>; searchParams: Promise<{ tab?: string; month?: string; edit?: string }>;
}) {
  const { classId } = await params;
  const sp = await searchParams;
  const { db } = await requireOwner();
  const [t, tc, f, sched] = await Promise.all([getT("admin.class"), getT("common"), getFormat(), getScheduleLabel()]);
  const [{ data: cls }, { data: lessonData }, { data: def }, { data: linkRows }, { data: classesData }, { data: comboItemRows }, { data: enrollData }] = await Promise.all([
    db.from("classes").select("*").eq("id", classId).maybeSingle(),
    db.from("lessons").select("*").eq("class_id", classId).order("month", { ascending: false }).order("live_start_time", { ascending: true, nullsFirst: false }).order("week_number").order("sort_order"),
    db.from("class_live_defaults").select("live_url").eq("class_id", classId).maybeSingle(),
    db.from("lesson_live_links").select("lesson_id, live_url, lessons!inner(class_id)").eq("lessons.class_id", classId),
    db.from("classes").select("id, title, class_type, target_year").neq("class_type", "Combo").neq("id", classId).eq("is_active", true).order("target_year", { ascending: false }).order("title"),
    db.from("combo_items").select("class_id").eq("combo_id", classId),
    db.from("enrollments").select("id, student_id, month, status, access_until, created_at, profiles:profiles!enrollments_student_id_fkey(full_name, student_id, mobile)")
      .eq("class_id", classId).in("status", ["approved", "pending"]).order("month", { ascending: false }).limit(2000),
  ]);
  if (!cls) notFound();
  const c = cls as ClassRow;
  const isCombo = c.class_type === "Combo";
  const availableClasses = (classesData ?? []) as { id: string; title: string; class_type: string; target_year: number | null }[];
  const initialComboItemIds = (comboItemRows ?? []).map((r) => r.class_id as string);
  const lessons = (lessonData ?? []) as Lesson[];
  const links: Record<string, string> = Object.fromEntries((linkRows ?? []).map((r) => [r.lesson_id as string, r.live_url as string]));
  const defaultLink = (def?.live_url as string | undefined) ?? null;
  const timetable = sched({ ...c, schedule: null });
  const defaults = { liveUrl: defaultLink, durationMinutes: c.duration_minutes, startTime: c.start_time };
  const ready = c.schedule_days.length > 0 && !!c.start_time;
  const now = Date.now();
  const thisMonth = currentMonth();

  // ── Sessions & content
  const upcoming = lessons.map((l) => ({ l, w: liveWindow(l, c.duration_minutes, now) })).filter((x) => x.w && !x.w.ended)
    .sort((a, b) => (a.l.live_start_time! < b.l.live_start_time! ? -1 : 1));
  const live = upcoming.filter((x) => !x.l.is_cancelled);
  const next = live[0] ?? null;
  const noLinkSoon = live.filter((x) => new Date(x.l.live_start_time!).getTime() - now < 7 * DAY && !links[x.l.id]);
  const missingRec = lessons.filter((l) => {
    const w = liveWindow(l, c.duration_minutes, now);
    return w?.ended && !l.is_cancelled && !l.youtube_url && now - new Date(l.live_start_time!).getTime() < 45 * DAY;
  }).sort((a, b) => b.live_start_time!.localeCompare(a.live_start_time!));
  const recordings = lessons.filter((l) => l.youtube_url).length;
  const hasMonthSessions = lessons.some((l) => l.live_start_time && currentMonth(new Date(l.live_start_time)) === thisMonth);

  // ── Students
  const enrollments = (enrollData ?? []) as unknown as EnrollRow[];
  const isOpen = (e: EnrollRow) => e.status === "approved" && (e.access_until ? accessOpen(e, now) : e.month >= thisMonth);
  const openNow = enrollments.filter(isOpen);
  const accessStudents = new Set(openNow.map((e) => e.student_id)).size;
  const expiringSoon = new Set(openNow.filter((e) => e.access_until && new Date(e.access_until).getTime() - now < 7 * DAY).map((e) => e.student_id)).size;
  const paidThisMonth = enrollments.filter((e) => e.status === "approved" && e.month === thisMonth).length;
  const pending = enrollments.filter((e) => e.status === "pending").length;

  // ── Setup checklist: each item links to the place that fixes it
  type Check = { key: string; done: boolean; href: string };
  const base = `/admin/classes/${classId}`;
  const tabHref = (k: Tab, extra = "") => `${base}?tab=${k}${extra}`;
  const hasBanner = !!(c.banner_config || c.banner_url);
  const checklist: Check[] = isCombo ? [
    { key: "combo", done: initialComboItemIds.length > 0, href: tabHref("settings") },
    { key: "banner", done: hasBanner, href: tabHref("settings") },
    { key: "visible", done: c.is_active, href: tabHref("settings") },
  ] : [
    { key: "timetable", done: ready, href: `${tabHref("settings")}#timetable` },
    { key: "link", done: !!defaultLink, href: `${tabHref("settings")}#timetable` },
    { key: "sessions", done: hasMonthSessions, href: tabHref("sessions") },
    { key: "links", done: noLinkSoon.length === 0, href: tabHref("sessions") },
    { key: "banner", done: hasBanner, href: tabHref("settings") },
    { key: "visible", done: c.is_active, href: tabHref("settings") },
  ];
  const doneCount = checklist.filter((x) => x.done).length;
  const todo = checklist.length - doneCount + missingRec.length + noLinkSoon.length;

  // Icons go to the client TabNav as rendered elements (a component function can't be passed from a server component).
  const ic = "h-4 w-4";
  const tabs: (TabNavItem & { key: Tab })[] = [
    { key: "overview", href: tabHref("overview"), label: t("tabs.overview"), iconNode: <LayoutDashboard className={ic} />, badge: todo, alert: todo > 0 },
    ...(!isCombo ? [{ key: "sessions" as Tab, href: tabHref("sessions"), label: t("tabs.sessions"), iconNode: <CalendarClock className={ic} />, badge: live.length }] : []),
    { key: "content", href: tabHref("content"), label: t("tabs.content"), iconNode: <PlayCircle className={ic} />, badge: lessons.length },
    { key: "students", href: tabHref("students"), label: t("tabs.students"), iconNode: <Users className={ic} />, badge: accessStudents },
    { key: "settings", href: tabHref("settings"), label: t("tabs.settings"), iconNode: <Settings2 className={ic} /> },
  ];
  const tab: Tab = tabs.some((x) => x.key === sp.tab) ? (sp.tab as Tab) : "overview";
  const editHref = (l: Lesson) => tabHref("content", `&month=${l.month}&edit=${l.id}`);

  // ── Pieces shared by tabs
  const sessionRow = ({ l, w }: (typeof upcoming)[number]) => {
    const d = new Date(l.live_start_time!);
    const link = links[l.id];
    return (
      <li key={l.id} className={cn(cardVariants({ variant: "outline" }), "flex items-center gap-3 bg-card p-3", l.is_cancelled && "opacity-60")}>
        <div className={cn("grid h-14 w-14 shrink-0 place-items-center rounded-xl text-center leading-none", toneSoft[l.session_type === "extra" ? "warning" : "brand"])}>
          <span>
            <span className="block text-[11px] font-semibold uppercase">{d.toLocaleDateString("en-LK", { weekday: "short", timeZone: "Asia/Colombo" })}</span>
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
            {f.dateTime(l.live_start_time)} · {formatDuration(w!.minutes)} · {link
              ? tc(`schedule.platforms.${livePlatform(link) ?? "other"}`)
              : <Link href={editHref(l)} className="font-semibold text-warning-soft-foreground underline-offset-2 hover:underline">{t("noLink")} → {t("attention.addLink")}</Link>}
          </p>
        </div>
        <CancelSessionButton id={l.id} cancelled={l.is_cancelled} />
      </li>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/classes" className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />{t("back")}</Link>
        <Link href={`/dashboard/classes/${classId}`} className={buttonVariants({ variant: "outline", size: "sm" })}><Eye /> {t("viewAsStudent")}</Link>
      </div>

      {/* Header: banner + what this class is */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft dark:border-white/10 sm:flex-row">
        <ClassBanner cls={c} className="shrink-0 sm:w-72" />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge>{tc(`classTypes.${c.class_type}`)}</Badge>
            {c.target_year && <Badge variant="secondary">{tc("alBatch", { year: c.target_year })}</Badge>}
            {c.is_free && <Badge variant="success">{tc("free")}</Badge>}
            {c.is_active ? <Badge variant="success">{t("active")}</Badge> : <Badge variant="destructive">{t("hidden")}</Badge>}
          </div>
          <h1 className="font-display text-xl font-bold leading-snug sm:text-2xl">{c.title}</h1>
          {!isCombo && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4 shrink-0" />{timetable ?? t("noTimetable")}
              {defaultLink && <Badge variant="default" className="ml-1"><Link2 />{tc(`schedule.platforms.${livePlatform(defaultLink) ?? "other"}`)}</Badge>}
            </p>
          )}
        </div>
      </div>

      <TabNav items={tabs} current={tabHref(tab)} label={t("tabs.label")} />

      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <StatCard label={t("stats.access")} value={accessStudents} icon={Users} tone="brand"
                hint={expiringSoon ? t("stats.accessHint", { n: expiringSoon }) : t("stats.paidThisMonth", { n: paidThisMonth })} />
              {!isCombo
                ? <StatCard label={t("nextClass")} value={next ? f.date(next.l.live_start_time) : tc("dash")} icon={CalendarClock} tone="info" hint={next ? `${next.l.title} · ${f.time(next.l.live_start_time)}` : t("noUpcomingShort")} />
                : <StatCard label={t("stats.pack")} value={initialComboItemIds.length} icon={Users} tone="info" hint={t("stats.packHint")} />}
              <StatCard label={t("stats.recordings")} value={recordings} icon={PlayCircle} tone={missingRec.length ? "warning" : "success"}
                hint={missingRec.length ? t("stats.recordingsHint", { n: missingRec.length }) : t("stats.recordingsOk")} />
              <StatCard label={t("stats.pending")} value={pending} icon={Receipt} tone={pending ? "warning" : "neutral"} hint={t("stats.pendingHint")} />
            </div>

            <Card>
              <CardHeader icon={CheckCircle2} title={t("checklist.title")}
                description={t("checklist.progress", { done: doneCount, total: checklist.length })} />
              <CardContent className="space-y-3">
                <ProgressBar value={doneCount} max={checklist.length} tone={doneCount === checklist.length ? "success" : "brand"} label={t("checklist.title")} />
                <ul className="divide-y rounded-xl border border-border/80 dark:border-white/10">
                  {checklist.map((x) => (
                    <li key={x.key} className="flex items-center gap-3 p-3">
                      {x.done ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success" /> : <Circle className="h-5 w-5 shrink-0 text-muted-foreground/50" />}
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm font-semibold", x.done && "text-muted-foreground")}>{t(`checklist.${x.key}`)}</p>
                        {!x.done && <p className="text-xs text-muted-foreground">{t(`checklist.${x.key}Hint`)}</p>}
                      </div>
                      {!x.done && <Link href={x.href} className={buttonVariants({ size: "sm", variant: "soft" })}>{t("checklist.fix")} <ArrowRight /></Link>}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit min-w-0">
            <CardHeader icon={AlertTriangle} title={t("attention.title")} description={t("attention.hint")} />
            <CardContent className="space-y-2">
              {pending > 0 && <Attention icon={Receipt} tone="warning" title={t("attention.pending", { n: pending })} href="/admin/payments?status=pending" action={t("attention.review")} />}
              {noLinkSoon.map(({ l }) => (
                <Attention key={`l-${l.id}`} icon={Link2} tone="danger" title={t("attention.noLink", { title: l.title })} sub={f.dateTime(l.live_start_time)} href={editHref(l)} action={t("attention.addLink")} />
              ))}
              {missingRec.slice(0, 8).map((l) => (
                <Attention key={`r-${l.id}`} icon={PlayCircle} tone="warning" title={t("attention.noRec", { title: l.title })} sub={t("attention.held", { date: f.date(l.live_start_time) })} href={editHref(l)} action={t("attention.addRec")} />
              ))}
              {missingRec.length > 8 && <p className="px-1 text-xs text-muted-foreground">{t("attention.more", { n: missingRec.length - 8 })}</p>}
              {expiringSoon > 0 && <Attention icon={Clock} tone="info" title={t("attention.expiring", { n: expiringSoon })} href={tabHref("students")} action={t("attention.see")} />}
              {!pending && !noLinkSoon.length && !missingRec.length && !expiringSoon && (
                <div className="flex flex-col items-center gap-2 rounded-xl bg-success-soft/60 p-6 text-center">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                  <p className="font-semibold">{t("attention.none")}</p>
                  <p className="text-xs text-muted-foreground">{t("attention.noneHint")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "sessions" && !isCombo && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <div className="min-w-0 space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="h-4 w-4 text-primary" /> {t("timetable")}</CardTitle>
                <CardDescription>{t("timetableHint")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/50 p-3 text-sm">
                  <span className="font-semibold">{ready ? timetable : t("noTimetable")}</span>
                  {ready && (defaultLink
                    ? <Badge variant="default"><Link2 />{tc(`schedule.platforms.${livePlatform(defaultLink) ?? "other"}`)}</Badge>
                    : <Badge variant="warning">{t("noDefaultLink")}</Badge>)}
                  <Link href={`${tabHref("settings")}#timetable`} className="ml-auto text-xs font-semibold text-primary hover:underline">{t("editTimetable")}</Link>
                </div>
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
          </div>
          <section className="min-w-0">
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold"><Radio className="h-5 w-5 text-destructive" /> {t("upcoming")}
              <span className="rounded-full bg-muted px-2 text-xs font-bold tabular-nums text-muted-foreground">{live.length}</span></h2>
            {upcoming.length
              ? <ul className="space-y-2">{upcoming.map(sessionRow)}</ul>
              : <p className={cn(cardVariants({ variant: "outline" }), "border-dashed p-6 text-center text-sm text-muted-foreground")}>{t("noUpcoming")}</p>}
          </section>
        </div>
      )}

      {tab === "content" && <ContentTab />}
      {tab === "students" && <StudentsTab />}

      {tab === "settings" && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="min-w-0"><CardHeader><CardTitle className="text-base">{t("details")}</CardTitle></CardHeader>
            <CardContent><ClassForm cls={c} defaultLiveUrl={defaultLink} availableClasses={availableClasses} initialComboItemIds={initialComboItemIds} /></CardContent></Card>
          <div className="space-y-4 xl:sticky xl:top-24 xl:h-fit">
            <Card className="border-destructive/30">
              <CardHeader icon={ShieldAlert} title={t("danger")} description={t("dangerHint")} />
              <CardContent><DeleteButton action={deleteClassAction} id={classId} label={t("delete")} confirm={t("deleteConfirm")} /></CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );

  function ContentTab() {
    const months = [...new Set(lessons.map((l) => l.month))].sort().reverse();
    const month = sp.month && months.includes(sp.month) ? sp.month : months.includes(thisMonth) ? thisMonth : months[0];
    const monthLessons = lessons.filter((l) => l.month === month);
    return (
      <div className="space-y-4">
        {months.length > 0 && (
          <ChipGroup>
            {months.map((m) => {
              const ls = lessons.filter((l) => l.month === m);
              const missing = ls.some((l) => missingRec.includes(l));
              return (
                <ChipLink key={m} href={tabHref("content", `&month=${m}`)} active={m === month} scroll={false}>
                  {f.month(m)} <span className="opacity-70">{ls.length}</span>
                  {missing && <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-label={t("stats.recordingsHint", { n: 1 })} />}
                </ChipLink>
              );
            })}
          </ChipGroup>
        )}
        <details className={cn(cardVariants(), "group")} open={!lessons.length}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 font-display font-semibold">
            <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> {t("addLesson")}</span>
            <ArrowRight className="h-4 w-4 transition group-open:rotate-90" />
          </summary>
          <div className="border-t p-4"><LessonForm classId={classId} defaults={defaults} /></div>
        </details>
        <LessonList key={`${month}-${sp.edit ?? ""}`} classId={classId} lessons={monthLessons} links={links} defaults={defaults} initialEditing={sp.edit ?? null} />
      </div>
    );
  }

  function StudentsTab() {
    const months = [...new Set(enrollments.map((e) => e.month))].sort().reverse();
    const month = sp.month && months.includes(sp.month) ? sp.month : null;
    const rank = (e: EnrollRow) => (e.status === "pending" ? 0 : isOpen(e) ? 1 : 2);
    const rows = enrollments.filter((e) => !month || e.month === month)
      .sort((a, b) => rank(a) - rank(b) || (a.access_until ?? "9").localeCompare(b.access_until ?? "9") || (a.profiles?.full_name ?? "").localeCompare(b.profiles?.full_name ?? ""));
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ChipGroup>
            <ChipLink href={tabHref("students")} active={!month} scroll={false}>{t("students.all")}</ChipLink>
            {months.map((m) => <ChipLink key={m} href={tabHref("students", `&month=${m}`)} active={m === month} scroll={false}>{f.month(m)}</ChipLink>)}
          </ChipGroup>
          <Link href="/admin/payments" className={buttonVariants({ size: "sm", variant: "outline", className: "shrink-0" })}><Users /> {t("students.grant")}</Link>
        </div>
        {rows.length ? (
          <Card className="overflow-hidden">
            <p className="border-b px-4 py-2.5 text-xs font-semibold text-muted-foreground">{t("students.count", { n: rows.length })}</p>
            <ul className="divide-y">
              {rows.map((e) => {
                const open = isOpen(e);
                const left = open && e.access_until ? daysUntil(e.access_until, now) : null;
                return (
                  <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar name={e.profiles?.full_name ?? "?"} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{e.profiles?.full_name ?? tc("dash")}</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">{[e.profiles?.student_id, e.profiles?.mobile].filter(Boolean).join(" · ")}</p>
                    </div>
                    <Badge variant="secondary" className="hidden sm:inline-flex">{f.month(e.month)}</Badge>
                    {e.status === "pending" ? <Badge variant="warning">{t("students.pending")}</Badge>
                      : !open ? <Badge variant="destructive">{e.access_until ? t("students.expired", { date: f.date(e.access_until) }) : t("students.pastMonth")}</Badge>
                      : left === null ? <Badge variant="success">{t("students.noExpiry")}</Badge>
                      : <Badge variant={left <= 3 ? "warning" : "success"}>{left <= 1 ? t("students.lastDay") : t("students.daysLeft", { n: left })}</Badge>}
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : <p className={cn(cardVariants({ variant: "outline" }), "border-dashed p-6 text-center text-sm text-muted-foreground")}>{t("students.empty")}</p>}
      </div>
    );
  }
}

/** One "needs attention" row: what is wrong, and a button that goes straight to the fix. */
function Attention({ icon, tone, title, sub, href, action }: { icon: LucideIcon; tone: "warning" | "danger" | "info"; title: string; sub?: string; href: string; action: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/80 p-3 dark:border-white/10">
      <IconTile icon={icon} tone={tone} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug">{title}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      <Link href={href} className={buttonVariants({ size: "sm", variant: "outline", className: "shrink-0" })}>{action}</Link>
    </div>
  );
}
