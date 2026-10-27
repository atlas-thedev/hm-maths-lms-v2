import type { Profile } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { CreditCard, ExternalLink } from "lucide-react";
import { WhatsAppIcon } from "@/components/brand-icons";
import { requireAdmin } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, EmptyState, PageHeader, buttonVariants, cardVariants } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { cn, formatLKR, whatsappLink } from "@/lib/utils";
import { getFormat, getT } from "@/i18n/server";
import { GrantAccessForm, ReviewButtons } from "../forms";

export async function generateMetadata() {
  return { title: (await getT("admin.nav"))("payments") };
}
const STATUSES = ["pending", "approved", "rejected"] as const;

type Row = { student_id: string;
  id: string; month: string; status: string; slip_url: string | null; amount: number | null; bank_ref: string | null; admin_note: string | null;
  reviewed_by: string | null; reviewed_at: string | null; created_at: string;
  profiles: { full_name: string; mobile: string | null; nic: string | null; student_id: string | null; town: string } | null;
  classes: { title: string; fee: number } | null;
};

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: s } = await searchParams;
  const status = STATUSES.find((x) => x === s) ?? "pending";
  const { db } = await requireAdmin();
  const [t, tc, f] = await Promise.all([getT("admin.payments"), getT("common"), getFormat()]);
  const [{ data }, { data: classes }] = await Promise.all([
    db.from("enrollments").select("id, student_id, month, status, slip_url, amount, bank_ref, admin_note, reviewed_by, reviewed_at, created_at, profiles:profiles!enrollments_student_id_fkey(full_name, mobile, nic, student_id, town), classes(title, fee)")
      .eq("status", status).order("created_at", { ascending: status === "pending" }).limit(100),
    db.from("classes").select("id, title").eq("is_free", false).order("title"),
  ]);
  const rows = (data ?? []) as unknown as Row[];
  // Delivery addresses + reviewer names (select * keeps this working even before the 0003 migration adds the columns).
  const ids = [...new Set(rows.flatMap((r) => [r.student_id, r.reviewed_by]).filter(Boolean))] as string[];
  const { data: addrRows } = ids.length ? await db.from("profiles").select("*").in("id", ids) : { data: [] };
  const profList = (addrRows ?? []) as Profile[];
  const addrOf = new Map(profList.map((p) => [p.id, [p.address, [p.city, p.postal_code].filter(Boolean).join(" ")].filter(Boolean).join(", ")]));
  const nameOf = new Map(profList.map((p) => [p.id, p.full_name]));
  const paths = rows.map((r) => r.slip_url).filter(Boolean) as string[];
  const signed = paths.length ? (await db.storage.from("bank-slips").createSignedUrls(paths, 900)).data ?? [] : [];
  const urlFor = new Map(signed.map((x) => [x.path, x.signedUrl]));

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")}>
        {STATUSES.map((x) => <Link key={x} href={`?status=${x}`} className={buttonVariants({ size: "sm", variant: x === status ? "default" : "outline", })}>{tc(`status.${x}`)}</Link>)}
      </PageHeader>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("grantTitle")}</CardTitle></CardHeader>
        <CardContent><GrantAccessForm classes={classes ?? []} /></CardContent>
      </Card>

      {!rows.length ? <EmptyState icon={CreditCard} title={t("empty", { status: tc(`status.${status}`) })} /> : (
        <div className="space-y-4">
          {rows.map((r) => {
            const url = r.slip_url ? urlFor.get(r.slip_url) : null;
            const isPdf = r.slip_url?.toLowerCase().endsWith(".pdf");
            const wa = whatsappLink(r.profiles?.mobile, status === "pending"
              ? t("waApproved", { name: r.profiles?.full_name, class: r.classes?.title, month: f.month(r.month) })
              : t("waRegarding", { name: r.profiles?.full_name, class: r.classes?.title, month: f.month(r.month) }));
            const mismatch = r.amount !== null && r.classes && Number(r.amount) !== Number(r.classes.fee);
            const reviewerName = r.reviewed_by ? nameOf.get(r.reviewed_by) ?? tc("shell.admin") : null;
            return (
              <div key={r.id} className={cn(cardVariants(), "grid grid-cols-1 gap-4 p-4 md:grid-cols-[180px_1fr]")}>
                <a href={url ?? "#"} target="_blank" rel="noreferrer" className={cn("relative block overflow-hidden rounded-lg border bg-muted md:aspect-[3/4] md:h-auto", url ? "h-64" : "pointer-events-none h-12")}>
                  {url && !isPdf ? <Image src={url} alt={t("slipAlt")} fill sizes="180px" className="object-cover" unoptimized /> :
                    <span className="flex h-full flex-col items-center justify-center gap-1 text-xs text-muted-foreground">{url ? <><ExternalLink className="h-5 w-5" />{t("openPdf")}</> : t("noSlip")}</span>}
                </a>
                <div className="flex min-w-0 flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-display text-lg font-semibold">{r.profiles?.full_name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{r.profiles?.student_id} · {r.profiles?.mobile} · {t("nic")} {r.profiles?.nic} · {r.profiles?.town ? tc(`towns.${r.profiles.town}`) : ""}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={r.status} />
                      {(reviewerName || r.reviewed_at) && (
                        <p className="text-[11px] text-muted-foreground" data-testid="receipt-reviewed-by">
                          {t("reviewedBy", { name: reviewerName ?? tc("shell.admin") })}{r.reviewed_at ? ` · ${f.dateTime(r.reviewed_at)}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                    <div><dt className="text-xs text-muted-foreground">{t("class")}</dt><dd className="font-medium">{r.classes?.title}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">{t("month")}</dt><dd className="font-medium">{f.month(r.month)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">{t("amount")}</dt><dd className={cn("font-medium", mismatch && "text-warning")}>{r.amount !== null ? formatLKR(r.amount) : tc("dash")}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">{t("submitted")}</dt><dd>{f.dateTime(r.created_at)}</dd></div>
                    {r.bank_ref && <div className="col-span-2"><dt className="text-xs text-muted-foreground">{t("reference")}</dt><dd className="font-mono">{r.bank_ref}</dd></div>}
                    <div className="col-span-2 sm:col-span-4"><dt className="text-xs text-muted-foreground">{t("delivery")}</dt><dd className="text-sm">{addrOf.get(r.student_id) || tc("dash")}</dd></div>
                    {r.admin_note && <div className="col-span-2"><dt className="text-xs text-muted-foreground">{t("note")}</dt><dd>{r.admin_note}</dd></div>}
                  </dl>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                    <ReviewButtons id={r.id} status={r.status} />
                    {wa && <a href={wa} target="_blank" rel="noreferrer" className={buttonVariants({ size: "sm", variant: "ghost", className: "text-whatsapp hover:text-whatsapp dark:text-whatsapp-light" })}><WhatsAppIcon /> {t("whatsapp")}</a>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
