import { ExternalLink, Receipt } from "lucide-react";
import { Badge, EmptyState, Table, buttonVariants } from "@/components/ui";
import { createClient } from "@/lib/db/server";
import { getFormat, getT } from "@/i18n/server";
import { formatLKR } from "@/lib/utils";
import { actionVariant, type AuditRow } from "./data";

/**
 * Activity log, shared by the Owner Console and the Developer panel.
 *   layout="cards" – always cards (narrow spots like the overview's "Latest activity")
 *   layout="auto"  – cards, switching to a table only on wide screens (≥1536px) where it fits without sideways scrolling
 */
export async function AuditList({ rows, layout = "auto" }: { rows: AuditRow[]; layout?: "auto" | "cards" }) {
  const [t, tc, f, db] = await Promise.all([getT("admin.owner"), getT("common"), getFormat(), createClient()]);
  if (!rows.length) return <EmptyState icon={Receipt} title={t("audit.empty")} />;
  const paths = [...new Set(rows.map((r) => r.details?.slip_url).filter((x): x is string => typeof x === "string" && !!x))];
  const signed = paths.length ? (await db.storage.from("bank-slips").createSignedUrls(paths, 900)).data ?? [] : [];
  const slip = new Map(signed.map((s) => [s.path, s.signedUrl]));
  const amountOf = (r: AuditRow) => (r.details?.amount !== undefined && r.details?.amount !== null ? formatLKR(Number(r.details.amount)) : null);
  const action = (r: AuditRow) => <Badge variant={actionVariant(r.action)}>{t(`audit.actions.${r.action}`)}</Badge>;
  const slipLink = (r: AuditRow) => {
    const u = r.details?.slip_url ? slip.get(r.details.slip_url) : null;
    return u ? <a href={u} target="_blank" rel="noreferrer" className={buttonVariants({ size: "sm", variant: "secondary" })}><ExternalLink /> {t("audit.viewSlip")}</a> : null;
  };

  return (
    <div data-testid="owner-audit-logs">
      {/* Phones */}
      <ul className={layout === "cards" ? "grid grid-cols-1 gap-2.5" : "grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3 2xl:hidden"}>
        {rows.map((r) => (
          <li key={r.id} data-testid="audit-log-row" className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-soft dark:border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              {action(r)}
              <span className="text-[11px] text-muted-foreground">{f.dateTime(r.created_at)}</span>
            </div>
            <p className="mt-2 text-sm font-medium [overflow-wrap:anywhere]">{r.summary}</p>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span>{r.actor_name ?? tc("shell.admin")}</span>
              {r.student_name && <span>{r.student_name}{r.student_code ? ` · ${r.student_code}` : ""}</span>}
              {amountOf(r) && <span className="font-mono font-semibold text-foreground">{amountOf(r)}</span>}
              {r.details?.bank_ref && <span className="font-mono">{t("audit.ref")}: {r.details.bank_ref}</span>}
            </div>
            {r.details?.admin_note && <p className="mt-1 text-xs text-muted-foreground">{t("audit.note")}: {r.details.admin_note}</p>}
            {slipLink(r) && <div className="mt-2.5">{slipLink(r)}</div>}
          </li>
        ))}
      </ul>
      {/* Tablets & desktop */}
      {layout === "auto" && <div className="hidden 2xl:block">
        <Table>
          <thead><tr><th>{t("audit.cols.when")}</th><th>{t("audit.cols.staff")}</th><th>{t("audit.cols.action")}</th><th>{t("audit.cols.student")}</th><th>{t("audit.cols.details")}</th><th>{t("audit.cols.slip")}</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} data-testid="audit-log-row">
                <td className="whitespace-nowrap text-xs text-muted-foreground">{f.dateTime(r.created_at)}</td>
                <td><p className="font-medium">{r.actor_name ?? tc("shell.admin")}</p><p className="text-[11px] uppercase tracking-wider text-muted-foreground">{r.actor_role ?? "admin"}</p></td>
                <td>{action(r)}</td>
                <td>{r.student_name ? <><p className="font-medium">{r.student_name}</p><p className="font-mono text-xs text-muted-foreground">{r.student_code ?? tc("dash")}{r.details?.student_mobile ? ` · ${r.details.student_mobile}` : ""}</p></> : <span className="text-xs text-muted-foreground">{tc("dash")}</span>}</td>
                <td className="max-w-md text-xs">
                  <p className="font-medium text-foreground">{r.summary}</p>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
                    {amountOf(r) && <span className="font-mono font-semibold text-foreground">{amountOf(r)}</span>}
                    {r.details?.bank_ref && <span className="font-mono">{t("audit.ref")}: {r.details.bank_ref}</span>}
                    {r.details?.admin_note && <span>{t("audit.note")}: {r.details.admin_note}</span>}
                  </div>
                </td>
                <td>{slipLink(r) ?? <span className="text-xs text-muted-foreground">{tc("dash")}</span>}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>}
    </div>
  );
}
