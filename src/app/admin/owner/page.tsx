import { Activity, CheckCircle2, Receipt, ShieldCheck, Users } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { asService } from "@/lib/db/pg";
import { getFormat, getT } from "@/i18n/server";
import { formatLKR } from "@/lib/utils";
import { ActionCard, Avatar, Badge, Card, CardAction, CardContent, CardHeader, ListRow, StatCard } from "@/components/ui";
import { getAuditRows, getStaffRows } from "./data";
import { AuditList } from "./audit-list";

export const dynamic = "force-dynamic";

/** Owner Console → Overview: headline numbers, staff at a glance, latest activity. */
export default async function OwnerOverviewPage() {
  await requireOwner();
  const [t, tc, f, staff, recent, students] = await Promise.all([
    getT("admin.owner"), getT("common"), getFormat(), getStaffRows(), getAuditRows({ limit: 6 }),
    asService(async (c) => Number((await c.query("select count(*) from public.profiles where role = 'student'")).rows[0].count)),
  ]);
  const approved = staff.reduce((s, r) => s + Number(r.approved_count) + Number(r.cash_count), 0);
  const volume = staff.reduce((s, r) => s + Number(r.approved_amount || 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("stats.staffCount")} value={staff.length} icon={ShieldCheck} tone="info"
          hint={t("stats.staffHint", { owners: staff.filter((r) => r.role === "owner").length, admins: staff.filter((r) => r.role === "admin").length })} />
        <StatCard label={t("stats.students")} value={students} icon={Users} tone="highlight" />
        <StatCard label={t("stats.receiptsApproved")} value={approved} hint={t("stats.receiptsHint")} icon={CheckCircle2} tone="success" />
        <StatCard label={t("stats.approvedVolume")} value={formatLKR(volume)} hint={t("stats.volumeHint")} icon={Receipt} tone="warning" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Card>
          <CardHeader icon={Users} title={t("staff.tableTitle")} action={<CardAction href="/admin/owner/staff">{t("tabs.manage")}</CardAction>} />
          <CardContent className="space-y-2">
            {staff.map((s) => (
              <ListRow key={s.id} leading={<Avatar name={s.full_name} />} title={s.full_name}
                subtitle={`${Number(s.approved_count) + Number(s.cash_count)} ${t("staff.approved")} · ${formatLKR(Number(s.approved_amount || 0))}${s.last_active_at ? ` · ${f.dateTime(s.last_active_at)}` : ""}`}
                trailing={<Badge variant={s.role === "owner" ? "warning" : "default"}>{s.role === "owner" ? tc("shell.owner") : tc("shell.admin")}</Badge>} />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader icon={Activity} title={t("audit.recent")} action={<CardAction href="/admin/owner/activity">{tc("actions.viewAll")}</CardAction>} />
          <CardContent><AuditList rows={recent} layout="cards" /></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ActionCard layout="row" href="/admin/owner/staff" title={t("staff.createTitle")} description={t("tabs.staffHint")} icon={Users} tone="info" />
        <ActionCard layout="row" href="/admin/owner/activity" title={t("audit.title")} description={t("tabs.activityHint")} icon={Activity} tone="success" />
        <ActionCard layout="row" href="/admin/owner/landing" title={t("landing.title")} description={t("tabs.landingHint")} icon={Receipt} tone="highlight" />
      </div>
    </div>
  );
}
