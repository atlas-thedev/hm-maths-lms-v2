import Link from "next/link";
import { Activity, AlertTriangle, CalendarX, CheckCircle2, Clock, Link2, Package, PlayCircle, Receipt, TrendingDown, TrendingUp, Users, Wallet, type LucideIcon } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { getFormat, getT } from "@/i18n/server";
import { cn, currentMonth, formatLKR, shiftMonth } from "@/lib/utils";
import { ActionCard, Avatar, Badge, Card, CardAction, CardContent, CardHeader, IconTile, ListRow, StatCard, buttonVariants, type Tone } from "@/components/ui";
import { getAuditRows, getOwnerDashboard, getStaffRows } from "./data";
import { AuditList } from "./audit-list";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;
/** "LKR 125k" / "LKR 1.2M" for chart labels. */
const shortLKR = (n: number) => n >= 1e6 ? `LKR ${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `LKR ${Math.round(n / 1e3)}k` : `LKR ${Math.round(n)}`;

/**
 * Owner Console → Overview, a business cockpit: this month's money against last month, who has access and who
 * is about to lose it, a 6-month fee chart, the classes earning most, and a "needs attention" list where every
 * row links to the fix. Staff and the latest activity follow below.
 */
export default async function OwnerOverviewPage() {
  await requireOwner();
  const [t, tc, f, staff, recent, d] = await Promise.all([
    getT("admin.owner"), getT("common"), getFormat(), getStaffRows(), getAuditRows({ limit: 6 }), getOwnerDashboard(),
  ]);
  const now = Date.now();
  const cur = currentMonth();
  // Last 6 months, oldest first, including months with no approvals.
  const byMonth = new Map(d.revenue.map((r) => [r.m, r]));
  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(cur, i - 5)).map((m) => ({ m, total: Number(byMonth.get(m)?.total ?? 0), n: byMonth.get(m)?.n ?? 0 }));
  const thisMonth = months[5], lastMonth = months[4];
  const change = lastMonth.total > 0 ? Math.round(((thisMonth.total - lastMonth.total) / lastMonth.total) * 100) : null;
  const pendingDays = d.oldestPending ? Math.floor((now - new Date(d.oldestPending).getTime()) / DAY) : 0;
  const topMax = Math.max(1, ...d.topClasses.map((c) => c.total));
  const attention = d.pending + d.noLink.length + d.noRecording.length + d.noSessions.length + d.pendingOrders;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("dash.revenue")} value={formatLKR(thisMonth.total)} icon={Wallet} tone="brand"
          hint={change === null ? t("dash.revenueSlips", { n: thisMonth.n })
            : <span className={cn("inline-flex items-center gap-1 font-semibold", change >= 0 ? "text-success-soft-foreground" : "text-destructive")}>
                {change >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {t("dash.vsLast", { pct: `${change >= 0 ? "+" : ""}${change}%` })}
              </span>} />
        <StatCard label={t("dash.active")} value={d.active} icon={Users} tone="success"
          hint={t("dash.activeHint", { total: d.students, n: d.newStudents })} />
        <StatCard label={t("dash.pending")} value={d.pending} icon={Receipt} tone={d.pending ? "warning" : "neutral"}
          hint={d.pending ? t("dash.pendingHint", { n: pendingDays }) : t("dash.pendingNone")} />
        <StatCard label={t("dash.expiring")} value={d.expiring} icon={Clock} tone={d.expiring ? "info" : "neutral"} hint={t("dash.expiringHint")} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader icon={TrendingUp} title={t("dash.chartTitle")} description={t("dash.chartHint")} />
          <CardContent><RevenueBars months={months} label={(m) => f.month(m)} slipsLabel={(n) => t("dash.revenueSlips", { n })} title={t("dash.chartTitle")} /></CardContent>
        </Card>

        <Card className="h-fit min-w-0">
          <CardHeader icon={AlertTriangle} title={t("dash.attention")} description={t("dash.attentionHint")} />
          <CardContent className="space-y-2">
            {d.pending > 0 && <Row icon={Receipt} tone="warning" title={t("dash.att.pending", { n: d.pending })} sub={pendingDays ? t("dash.att.oldest", { n: pendingDays }) : undefined} href="/admin/payments?status=pending" action={t("dash.att.review")} />}
            {d.pendingOrders > 0 && <Row icon={Package} tone="warning" title={t("dash.att.orders", { n: d.pendingOrders })} href="/admin/store" action={t("dash.att.review")} />}
            {d.noLink.map((l) => (
              <Row key={l.id} icon={Link2} tone="danger" title={t("dash.att.noLink", { title: l.title })} sub={`${l.class_title} · ${f.dateTime(l.live_start_time)}`}
                href={`/admin/classes/${l.class_id}?tab=content&edit=${l.id}`} action={t("dash.att.fix")} />
            ))}
            {d.noRecording.map((c) => (
              <Row key={`r-${c.id}`} icon={PlayCircle} tone="warning" title={t("dash.att.noRec", { n: c.n })} sub={c.title} href={`/admin/classes/${c.id}`} action={t("dash.att.open")} />
            ))}
            {d.noSessions.map((c) => (
              <Row key={`s-${c.id}`} icon={CalendarX} tone="info" title={t("dash.att.noSessions")} sub={c.title} href={`/admin/classes/${c.id}?tab=sessions`} action={t("dash.att.schedule")} />
            ))}
            {attention === 0 && (
              <div className="flex flex-col items-center gap-2 rounded-xl bg-success-soft/60 p-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-success" />
                <p className="font-semibold">{t("dash.att.none")}</p>
                <p className="text-xs text-muted-foreground">{t("dash.att.noneHint")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader icon={Wallet} title={t("dash.topTitle")} description={t("dash.topHint", { month: f.month(cur) })} />
          <CardContent>
            {d.topClasses.length ? (
              <ul className="space-y-3.5">
                {d.topClasses.map((c) => (
                  <li key={c.id}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <Link href={`/admin/classes/${c.id}`} className="min-w-0 truncate font-medium hover:text-primary">{c.title}</Link>
                      <span className="shrink-0 tabular-nums"><b className="font-semibold">{formatLKR(c.total)}</b> <span className="text-xs text-muted-foreground">· {t("dash.revenueSlips", { n: c.n })}</span></span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, (c.total / topMax) * 100)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="py-6 text-center text-sm text-muted-foreground">{t("dash.topNone")}</p>}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader icon={Users} title={t("staff.tableTitle")} action={<CardAction href="/admin/owner/staff">{t("tabs.manage")}</CardAction>} />
          <CardContent className="space-y-2">
            {staff.map((s) => (
              <ListRow key={s.id} leading={<Avatar name={s.full_name} />} title={s.full_name}
                subtitle={`${Number(s.approved_count) + Number(s.cash_count)} ${t("staff.approved")} · ${formatLKR(Number(s.approved_amount || 0))}${s.last_active_at ? ` · ${f.dateTime(s.last_active_at)}` : ""}`}
                trailing={<Badge variant={s.role === "owner" ? "warning" : "default"}>{s.role === "owner" ? tc("shell.owner") : tc("shell.admin")}</Badge>} />
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader icon={Activity} title={t("audit.recent")} action={<CardAction href="/admin/owner/activity">{tc("actions.viewAll")}</CardAction>} />
        <CardContent><AuditList rows={recent} layout="cards" /></CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ActionCard layout="row" href="/admin/owner/staff" title={t("staff.createTitle")} description={t("tabs.staffHint")} icon={Users} tone="info" />
        <ActionCard layout="row" href="/admin/owner/activity" title={t("audit.title")} description={t("tabs.activityHint")} icon={Activity} tone="success" />
        <ActionCard layout="row" href="/admin/owner/landing" title={t("landing.title")} description={t("tabs.landingHint")} icon={Receipt} tone="highlight" />
      </div>
    </div>
  );
}

/** One "needs attention" row: what's wrong, where, and a button straight to the fix. */
function Row({ icon, tone, title, sub, href, action }: { icon: LucideIcon; tone: Tone; title: string; sub?: string; href: string; action: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/80 p-3 dark:border-white/10">
      <IconTile icon={icon} tone={tone} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug">{title}</p>
        {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
      </div>
      <Link href={href} className={buttonVariants({ size: "sm", variant: "outline", className: "shrink-0" })}>{action}</Link>
    </div>
  );
}

/**
 * Monthly class fees as thin columns (one series, brand colour, no legend — the card title names it).
 * The latest month is labelled; any column shows its value on hover/focus. A visually hidden table carries
 * the same numbers for screen readers.
 */
function RevenueBars({ months, label, slipsLabel, title }: {
  months: { m: string; total: number; n: number }[]; label: (m: string) => string; slipsLabel: (n: number) => string; title: string;
}) {
  const max = Math.max(1, ...months.map((x) => x.total));
  return (
    <figure>
      <div className="flex h-56 items-end gap-2 border-b border-border sm:gap-4" aria-hidden>
        {months.map((x, i) => {
          const last = i === months.length - 1;
          return (
            <div key={x.m} title={`${label(x.m)}: ${formatLKR(x.total)} · ${slipsLabel(x.n)}`}
              className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end">
              <span className={cn("mb-1.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums transition",
                last ? "text-foreground" : "text-muted-foreground opacity-0 group-hover:opacity-100")}>{shortLKR(x.total)}</span>
              {/* 4px rounded top anchored to the baseline; empty months keep a hairline so the gap reads as zero. */}
              <div className={cn("w-full max-w-14 rounded-t-[4px] transition", last ? "bg-primary" : "bg-primary/60 group-hover:bg-primary/80")}
                style={{ height: x.total > 0 ? `${Math.max(2, (x.total / max) * 82)}%` : "2px" }} />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2 sm:gap-4" aria-hidden>
        {months.map((x, i) => (
          <span key={x.m} className={cn("min-w-0 flex-1 truncate text-center text-[11px]", i === months.length - 1 ? "font-semibold text-foreground" : "text-muted-foreground")}>
            {label(x.m).split(" ")[0]}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>{months.map((x) => <tr key={x.m}><th scope="row">{label(x.m)}</th><td>{formatLKR(x.total)}</td><td>{slipsLabel(x.n)}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
