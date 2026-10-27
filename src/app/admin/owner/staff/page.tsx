import { UserPlus, Users } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { getFormat, getT } from "@/i18n/server";
import { formatLKR } from "@/lib/utils";
import { Avatar, Badge, Card, CardContent, CardHeader } from "@/components/ui";
import { CreateStaffForm, StaffRowActions } from "../owner-forms";
import { getStaffRows } from "../data";

export const dynamic = "force-dynamic";

/** Owner Console → Staff: every admin/owner as a card with their activity and controls, plus "create admin". */
export default async function OwnerStaffPage() {
  const { user } = await requireOwner();
  const [t, tc, f, staff] = await Promise.all([getT("admin.owner"), getT("common"), getFormat(), getStaffRows()]);
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="min-w-0 space-y-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Users className="h-5 w-5 text-primary" /> {t("staff.tableTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("staff.tableSubtitle")}</p>
        </div>
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {staff.map((s) => (
            <li key={s.id} data-testid={`staff-row-${s.id}`} className="rounded-2xl border border-border/80 bg-card p-4 shadow-soft dark:border-white/10">
              <div className="flex items-start gap-3">
                <Avatar name={s.full_name} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    <span className="min-w-0 break-words">{s.full_name}</span>
                    <Badge variant={s.role === "owner" ? "warning" : "default"}>{s.role === "owner" ? tc("shell.owner") : tc("shell.admin")}</Badge>
                  </p>
                  <p className="font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]">{s.email}{s.mobile ? ` · ${s.mobile}` : ""}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[[s.approved_count, t("staff.approved"), "text-success-soft-foreground"], [s.cash_count, t("staff.cash"), "text-info-soft-foreground"], [s.rejected_count, t("staff.rejected"), "text-destructive-soft-foreground"]].map(([n, l, c]) => (
                  <div key={String(l)} className="rounded-xl bg-muted/60 px-2 py-2">
                    <p className={`font-display text-lg font-bold ${c}`}>{n}</p>
                    <p className="text-[11px] text-muted-foreground">{l}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("staff.cols.volume")}: <b className="font-mono text-foreground">{formatLKR(Number(s.approved_amount || 0))}</b>
                {" · "}{t("staff.cols.lastActive")}: {s.last_active_at ? f.dateTime(s.last_active_at) : tc("dash")}
              </p>
              <div className="mt-3 border-t pt-3"><StaffRowActions id={s.id} name={s.full_name} role={s.role} isSelf={s.id === user.id} /></div>
            </li>
          ))}
        </ul>
      </section>
      <Card className="xl:sticky xl:top-24 xl:self-start" data-testid="create-staff-form">
        <CardHeader icon={UserPlus} title={t("staff.createTitle")} description={t("staff.createSubtitle")} />
        <CardContent><CreateStaffForm /></CardContent>
      </Card>
    </div>
  );
}
