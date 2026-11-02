import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getBrand } from "@/lib/settings";
import { getFormat, getT } from "@/i18n/server";
import { buttonVariants } from "@/components/ui";
import { getDeliveries, itemLabel, parseDeliveryFilter } from "../data";
import { PrintButton } from "./print-button";

export async function generateMetadata() {
  return { title: (await getT("admin.deliveries"))("labelsTitle") };
}

/**
 * Printable address labels (A4, 2 × 7) for the chosen parcels (?ids=…) or the current Delivery filter.
 * Parcels handed over at class are left out — they need no label. The app chrome is hidden when printing.
 */
export default async function LabelsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { db } = await requireAdmin();
  const [t, f, brand] = await Promise.all([getT("admin.deliveries"), getFormat(), getBrand()]);
  const rows = (await getDeliveries(db, parseDeliveryFilter(sp), 300)).filter((r) => r.method === "post");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/admin/deliveries" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />{t("title")}</Link>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">{t("labelsCount", { n: rows.length })}</p>
          {rows.length > 0 && <PrintButton label={t("print")} />}
        </div>
      </div>
      {!rows.length ? <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t("noLabels")}</p> : (
        <div className="labels grid grid-cols-1 gap-3 sm:grid-cols-2 print:grid-cols-2 print:gap-0">
          {rows.map((r) => (
            <article key={r.id} className="label flex min-h-[38mm] flex-col justify-between rounded-xl border-2 border-dashed border-border bg-white p-4 text-black print:rounded-none print:border print:border-black/40">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-black/60">{t("to")}</p>
                <p className="text-base font-bold leading-tight">{r.profiles?.full_name}</p>
                <p className="mt-1 whitespace-pre-line text-sm leading-snug">{r.address ?? t("noAddress")}</p>
                {(r.phone ?? r.profiles?.mobile) && <p className="mt-1 font-mono text-sm font-semibold">{r.phone ?? r.profiles?.mobile}</p>}
              </div>
              <div className="mt-2 flex items-end justify-between gap-2 border-t border-black/20 pt-1.5 text-[10px] text-black/70">
                <span className="min-w-0 truncate">{itemLabel(r, f.month)}</span>
                <span className="shrink-0 font-mono">{r.profiles?.student_id} · {brand.name}</span>
              </div>
            </article>
          ))}
        </div>
      )}
      <style>{`@media print { @page { size: A4; margin: 8mm; } .label { break-inside: avoid; height: 39mm; } main { padding: 0 !important; } }`}</style>
    </div>
  );
}
