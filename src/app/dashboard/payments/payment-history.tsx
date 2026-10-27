"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Eye, MessageSquareWarning, Package, ReceiptText } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { ButtonLink, IconTile } from "@/components/ui";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

export type PaymentRow = {
  key: string;
  kind: "class" | "order";
  item: string;
  detail: string;
  amount: string;
  status: string;
  ref: string | null;
  shortId: string;
  date: string;
  group: string;
  slip: string | null;
  note: string | null;
  retryHref: string | null;
};

type Filter = "all" | "class" | "order";

export function PaymentHistory({ rows }: { rows: PaymentRow[] }) {
  const t = useT("portal.payments");
  const [filter, setFilter] = useState<Filter>("all");
  const counts = { all: rows.length, class: rows.filter((r) => r.kind === "class").length, order: rows.filter((r) => r.kind === "order").length };
  const groups = useMemo(() => {
    const out: { label: string; rows: PaymentRow[] }[] = [];
    for (const r of rows) {
      if (filter !== "all" && r.kind !== filter) continue;
      const last = out[out.length - 1];
      if (last && last.label === r.group) last.rows.push(r);
      else out.push({ label: r.group, rows: [r] });
    }
    return out;
  }, [rows, filter]);

  return (
    <div>
      <div role="tablist" aria-label={t("history")} className="mb-4 inline-flex rounded-xl bg-muted p-1">
        {(["all", "class", "order"] as const).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
            className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:text-sm",
              filter === k ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {t(`filters.${k}`)}
            <span className={cn("rounded-full px-1.5 text-[10px] tabular-nums", filter === k ? "bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300" : "bg-background/60")}>{counts[k]}</span>
          </button>
        ))}
      </div>

      {groups.length ? (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.label}>
              <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</h3>
              <ul className="space-y-2">
                {g.rows.map((r) => {
                  const Icon = r.kind === "class" ? BookOpen : Package;
                  return (
                    <li key={r.key} className="rounded-2xl border bg-card p-3.5 transition hover:border-primary/30 hover:shadow-sm sm:p-4 dark:border-white/10">
                      <div className="flex items-start gap-3 sm:items-center">
                        <IconTile icon={Icon} tone={r.kind === "class" ? "brand" : "highlight"} size="lg" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                            <div className="min-w-0">
                              <p className="truncate font-semibold">{r.item}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {r.detail} · {r.date}{r.ref ? ` · ${t("ref", { ref: r.ref })}` : ""} · <span className="font-mono uppercase">#{r.shortId}</span>
                              </p>
                            </div>
                            <div className="mt-1 flex shrink-0 items-center justify-between gap-3 sm:mt-0 sm:flex-col sm:items-end sm:justify-start sm:gap-1">
                              <p className="whitespace-nowrap font-display text-base font-bold tabular-nums">{r.amount}</p>
                              <div className="flex items-center gap-1.5">
                                {r.slip && (
                                  <a href={`/api/files/bank-slips?path=${encodeURIComponent(r.slip)}`} target="_blank" rel="noopener noreferrer"
                                    aria-label={t("viewSlip")} title={t("viewSlip")}
                                    className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold text-muted-foreground transition hover:bg-accent hover:text-accent-foreground">
                                    <Eye className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t("viewSlip")}</span>
                                  </a>
                                )}
                                <StatusBadge status={r.status} />
                              </div>
                            </div>
                          </div>
                          {(r.note || r.retryHref) && (
                            <div className="mt-3 flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
                              {r.note ? (
                                <p className={cn("flex items-start gap-1.5 text-xs", r.status === "rejected" ? "text-destructive-soft-foreground" : "text-muted-foreground")}>
                                  <MessageSquareWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span><b className="font-semibold">{t("noteLabel")}:</b> {r.note}</span>
                                </p>
                              ) : <span />}
                              {r.retryHref && <ButtonLink href={r.retryHref} size="sm" variant="destructive" className="shrink-0">{t("reupload")}</ButtonLink>}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-14 text-center">
          <IconTile icon={ReceiptText} size="xl" className="mb-3 rounded-full ring-8 ring-accent/50" />
          <p className="font-display font-semibold">{t("empty")}</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">{t("emptyText")}</p>
          <ButtonLink href="/dashboard/store" size="sm" className="mt-4">{t("pay")}</ButtonLink>
        </div>
      )}
    </div>
  );
}
