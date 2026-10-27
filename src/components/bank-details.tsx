import { Info, Landmark, MapPin, UserRound } from "lucide-react";
import { getSiteData } from "@/lib/settings";
import { BankLogo } from "@/components/brand-icons";
import { CopyButton } from "@/components/copy-button";
import { IconTile } from "@/components/ui";
import { getT } from "@/i18n/server";

/** Where to pay: amount, then one card per bank account with a copy button on the account number. */
export async function BankDetails({ amount, stacked = true }: { amount?: string; stacked?: boolean }) {
  const SITE = await getSiteData();
  const t = await getT("common.bank");
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <IconTile icon={Landmark} size="md" />
        <h3 className="font-display text-base font-bold">{t("title")}</h3>
      </div>
      {amount && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground">{t("amount")}</span>
          <span className="font-display text-2xl font-extrabold leading-none text-primary">{amount}</span>
        </div>
      )}
      <ul className={stacked ? "grid grid-cols-1 gap-4" : "grid grid-cols-1 gap-4 sm:grid-cols-2"}>
        {SITE.bankAccounts.map((b) => (
          <li key={b.bank + b.accountNumber} className="relative isolate overflow-hidden rounded-3xl bg-gradient-dark p-5 text-white shadow-xl shadow-black/20 ring-1 ring-white/10">
            <div className="bg-hex absolute inset-0 -z-10 opacity-40" aria-hidden />
            <div className="absolute -right-12 -top-14 -z-10 h-44 w-44 rounded-full bg-brand-500/30 blur-3xl" aria-hidden />
            <div className="flex items-start justify-between gap-3">
              <BankLogo name={b.bank} className="h-12 w-24 rounded-xl" />
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/85 ring-1 ring-white/15"><MapPin className="h-3 w-3" />{b.branch}</span>
            </div>
            <p className="mt-4 font-display text-sm font-semibold text-white/80">{b.bank}</p>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">{t("account")}</p>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <p className="whitespace-nowrap font-mono text-xl font-bold tabular-nums tracking-[0.1em] text-white drop-shadow sm:text-2xl">{b.accountNumber}</p>
              <CopyButton label value={b.accountNumber.replace(/\s/g, "")} className="shrink-0 bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25 hover:text-white" />
            </div>
            <div className="mt-4 flex items-center gap-2 border-t border-white/15 pt-3">
              <UserRound className="h-4 w-4 shrink-0 text-white/60" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">{t("name")}</p>
                <p className="truncate text-sm font-bold uppercase tracking-wide">{b.accountName}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p className="flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{t("reference")}
      </p>
    </div>
  );
}
