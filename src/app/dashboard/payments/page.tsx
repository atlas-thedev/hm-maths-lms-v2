import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, ShoppingBag, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getMyEnrollments } from "@/lib/data";
import { BankDetails } from "@/components/bank-details";
import { CopyButton } from "@/components/copy-button";
import { ButtonLink, Card, CardContent, CardHeader, CardTitle, IconTile, PageHeader, StatCard, buttonVariants, type Tone } from "@/components/ui";
import { getFormat, getT } from "@/i18n/server";
import { cn, currentMonth, formatLKR } from "@/lib/utils";
import { PaymentHistory, type PaymentRow } from "./payment-history";

export async function generateMetadata() {
  return { title: (await getT("portal.nav"))("payments") };
}

type OrderRow = { id: string; product_id: string; products: { title: string } | null; quantity: number; amount: number | null; status: string; created_at: string; slip_url: string | null; admin_note: string | null };

export default async function PaymentsPage() {
  const { db, user, profile } = await requireUser();
  const [t, tc, f] = await Promise.all([getT("portal.payments"), getT("common"), getFormat()]);
  const [enrollments, { data: orderData }] = await Promise.all([
    getMyEnrollments(db, user.id),
    db.from("orders").select("*, products(title)").eq("student_id", user.id).order("created_at", { ascending: false }),
  ]);
  const orders = (orderData ?? []) as OrderRow[];

  type Raw = Omit<PaymentRow, "amount" | "date" | "group"> & { value: number | null; iso: string };
  const raw: Raw[] = [
    ...enrollments.map((e) => ({
      key: `c-${e.id}`, kind: "class" as const, item: e.classes?.title ?? t("classFee"), detail: f.month(e.month),
      value: e.amount ?? e.classes?.fee ?? null, status: e.status, ref: e.bank_ref, shortId: e.id.slice(0, 8), iso: e.created_at,
      slip: e.slip_url, note: e.admin_note, retryHref: e.status === "rejected" ? `/dashboard/store/class/${e.class_id}?month=${e.month}` : null,
    })),
    ...orders.map((o) => ({
      key: `o-${o.id}`, kind: "order" as const, item: o.products?.title ?? t("tuteBook"), detail: t("qty", { n: o.quantity }),
      value: o.amount, status: o.status, ref: null, shortId: o.id.slice(0, 8), iso: o.created_at,
      slip: o.slip_url, note: o.admin_note, retryHref: o.status === "rejected" ? `/dashboard/store/product/${o.product_id}` : null,
    })),
  ].sort((a, b) => (a.iso < b.iso ? 1 : -1));

  const rows: PaymentRow[] = raw.map(({ value, iso, ...r }) => ({
    ...r, amount: value !== null ? formatLKR(value) : tc("dash"), date: f.date(iso), group: f.month(currentMonth(new Date(iso))),
  }));

  const isPaid = (s: string) => s === "approved" || s === "shipped";
  const sum = (list: Raw[]) => list.reduce((a, r) => a + Number(r.value ?? 0), 0);
  const paid = raw.filter((r) => isPaid(r.status));
  const pending = raw.filter((r) => r.status === "pending");
  const rejected = raw.filter((r) => r.status === "rejected");

  const stats: { label: string; value: string; hint: string; icon: LucideIcon; tone: string }[] = [
    { label: t("totalPaid"), value: formatLKR(sum(paid)), hint: t("totalPaidHint", { n: paid.length }), icon: Wallet, tone: "brand" as Tone },
    { label: t("approved"), value: String(paid.length), hint: t("approvedHint"), icon: CheckCircle2, tone: "success" as Tone },
    { label: t("pending"), value: String(pending.length), hint: t("pendingHint", { amount: formatLKR(sum(pending)) }), icon: Clock, tone: "warning" as Tone },
    { label: t("needsAction"), value: String(rejected.length), hint: t("needsActionHint"), icon: AlertTriangle, tone: (rejected.length ? "danger" : "neutral") as Tone },
  ];
  const steps = t.raw<string[]>("steps") ?? [];

  return (
    <div className="space-y-5">
      <PageHeader title={t("title")} description={t("subtitle")}>
        <ButtonLink href="/dashboard/store" variant="outline" size="sm"><ShoppingBag /> {t("store")}</ButtonLink>
        <ButtonLink href="/dashboard/store" size="sm"><Wallet /> {t("pay")}</ButtonLink>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {stats.map(({ label, value, hint, icon: Icon, tone }) => (
          <StatCard key={label} label={label} value={value} hint={hint} icon={Icon} tone={tone} />
        ))}
      </div>

      {rejected.length > 0 && (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive-soft/60 p-4 sm:flex-row sm:items-center">
          <IconTile icon={AlertTriangle} tone="danger" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-destructive-soft-foreground">{t("rejectedTitle", { n: rejected.length })}</p>
            <p className="text-sm text-muted-foreground">{t("rejectedText")}</p>
          </div>
          {rejected[0]?.retryHref && <ButtonLink href={rejected[0].retryHref} variant="destructive" size="sm">{t("reupload")}</ButtonLink>}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        <Card className="min-w-0">
          <CardHeader title={t("history")} description={t("historyHint")} />
          <CardContent><PaymentHistory rows={rows} /></CardContent>
        </Card>

        <div className="space-y-5 lg:sticky lg:top-24 lg:h-fit">
          {profile.student_id && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-brand p-5 text-white shadow-xl shadow-black/10">
              <div className="bg-hex absolute inset-0 opacity-60" />
              <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-teal-500/25 blur-3xl" />
              <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/90">{t("reference")}</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="font-mono text-xl font-bold tracking-wider text-white">{profile.student_id}</p>
                  <CopyButton value={profile.student_id} label className="text-white/90 hover:bg-white/10 hover:text-white" />
                </div>
                <p className="mt-2 text-xs text-white/90">{t("refHint")}</p>
              </div>
            </div>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">{t("howTitle")}</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <ol className="space-y-3">
                {steps.map((s, i) => (
                  <li key={s} className="flex gap-3 text-sm">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-teal-600 text-xs font-bold text-white">{i + 1}</span>
                    <span className="pt-0.5 text-muted-foreground">{s}</span>
                  </li>
                ))}
              </ol>
              <div className="border-t pt-4"><BankDetails stacked /></div>
              <Link href="/dashboard/store" className={buttonVariants({ size: "lg", variant: "gradient", className: "w-full" })}><Wallet /> {t("pay")}</Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
