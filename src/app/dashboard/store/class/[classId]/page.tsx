import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, CalendarClock, CheckCircle2, Clock3, Info, MapPin, Truck, XCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { ClassBanner } from "@/components/class-banner";
import { BankDetails } from "@/components/bank-details";
import { Badge, ButtonLink, Card, CardContent, CardHeader, CardTitle, IconTile, cardVariants } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import type { ClassRow } from "@/lib/types";
import { cn, currentMonth, formatLKR, shiftMonth } from "@/lib/utils";
import { getFormat, getScheduleLabel, getT } from "@/i18n/server";
import { EnrollForm, type MonthOption } from "./enroll-form";
import { WithdrawForm } from "./withdraw-form";

export default async function EnrollPage({ params, searchParams }: { params: Promise<{ classId: string }>; searchParams: Promise<{ month?: string }> }) {
  const { classId } = await params;
  const { month: wanted } = await searchParams;
  const { db, user, profile } = await requireUser();
  const [t, tc, f, sched] = await Promise.all([getT("portal.enroll"), getT("common"), getFormat(), getScheduleLabel()]);
  const { data } = await db.from("classes").select("*").eq("id", classId).maybeSingle();
  if (!data) notFound();
  const cls = data as ClassRow;
  if (cls.is_free) redirect(`/dashboard/classes/${classId}`);

  const { data: mine } = await db.from("enrollments").select("id, month, status, admin_note, created_at").eq("student_id", user.id).eq("class_id", classId);
  // Offer next month, the current month and the previous 6 months (archive packs).
  const status = new Map((mine ?? []).map((e) => [e.month as string, e.status as string]));
  const cur = currentMonth();
  const values = [shiftMonth(cur, 1), cur, ...Array.from({ length: 6 }, (_, i) => shiftMonth(cur, -(i + 1)))];
  const months: MonthOption[] = values.map((v) => ({
    value: v,
    label: `${f.month(v)} ${v === cur ? t("current") : v > cur ? t("next") : t("archive")}`,
    status: status.get(v),
  }));
  const firstOpen = months.find((m) => m.value === wanted && m.status !== "approved" && m.status !== "pending")
    ?? months.find((m) => m.value === cur && !m.status) ?? months.find((m) => !m.status || m.status === "rejected") ?? months[1];
  const sorted = [...(mine ?? [])].sort((a, b) => (a.month < b.month ? 1 : -1));
  const pending = sorted.find((e) => e.status === "pending");
  // "Owned" = approved for the current or next month.
  const owned = sorted.find((e) => e.status === "approved" && e.month >= cur);
  const lastRejected = !pending && [...(mine ?? [])].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
  const rejected = lastRejected && lastRejected.status === "rejected" ? lastRejected : null;
  const open = months.some((m) => !m.status || m.status === "rejected");

  const delivery = (
    <div className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-accent/60 p-3 text-sm">
      <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="font-semibold">{t("deliveryTitle")}</p>
        {profile.address ? (
          <p className="whitespace-pre-line text-xs text-muted-foreground">{[profile.address, [profile.city, profile.postal_code].filter(Boolean).join(" ")].filter(Boolean).join("\n")}</p>
        ) : <p className="text-xs text-warning">{t("deliveryMissing")}</p>}
        <Link href="/dashboard/profile#address" className="text-xs font-semibold text-primary hover:underline">{t("deliveryEdit")}</Link>
      </div>
    </div>
  );
  const form = <EnrollForm classId={classId} userId={user.id} months={months} defaultMonth={firstOpen.value} />;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
      <div className="space-y-6">
        <div className="overflow-hidden rounded-2xl bg-card shadow-soft">
          <ClassBanner cls={cls} />
          <div className="space-y-3 p-5">
            <div className="flex flex-wrap gap-2"><Badge>{tc(`classTypes.${cls.class_type}`)}</Badge>{cls.target_year && <Badge variant="secondary">{tc("alBatch", { year: cls.target_year })}</Badge>}</div>
            <h1 className="font-display text-2xl font-bold">{cls.title}</h1>
            {cls.description && <p className="whitespace-pre-line text-sm text-muted-foreground">{cls.description}</p>}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {cls.town && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{tc(`towns.${cls.town}`)}</span>}
              {sched(cls) && <span className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4" />{sched(cls)}</span>}
            </div>
            <p className="font-display text-xl font-bold">{tc("perMonth", { amount: formatLKR(cls.fee) })}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm space-y-2">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <Info className="h-4.5 w-4.5 shrink-0" />
            <span>භෞතික පන්ති (Physical) සහ සහන ගාස්තු (Discounts) පිළිබඳව:</span>
          </div>
          <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1 pl-1">
            <li>ඔබ භෞතිකව පන්තියට සම්බන්ධ වන්නේ නම් පහත පෝරමයේ <strong>&ldquo;පන්තියට සම්බන්ධ වන ආකාරය&rdquo;</strong> යටතේ ඔබේ මධ්‍යස්ථානය තෝරන්න.</li>
            <li>2nd shy / 3rd shy පැරණි සිසුන් සහන ගාස්තු යටතේ ගෙවීම් කරන්නේ නම්, ඔබගේ පැරණි ශිෂ්‍ය අංකය / කාඩ්පත් අංකය <strong>&ldquo;විශේෂ සටහන්&rdquo;</strong> කොටසේ සඳහන් කරන්න.</li>
          </ul>
        </div>
        <Card><CardContent className="pt-5 sm:pt-5"><BankDetails amount={formatLKR(cls.fee)} /></CardContent></Card>
        {(mine ?? []).length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">{t("yourMonths")}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(mine ?? []).sort((a, b) => (a.month < b.month ? 1 : -1)).map((e) => (
                <div key={e.month} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span>{f.month(e.month)}</span>
                  <span className="flex items-center gap-2">{e.admin_note && <span className="text-xs text-muted-foreground">{e.admin_note}</span>}<StatusBadge status={e.status} /></span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        {owned && (
          <div className="overflow-hidden rounded-2xl border border-success/30 bg-success-soft/70 p-5 shadow-soft">
            <div className="flex items-start gap-3">
              <IconTile icon={CheckCircle2} tone="success" variant="solid" size="lg" />
              <div className="min-w-0">
                <p className="font-display text-lg font-bold leading-snug">{t("ownedTitle")}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{t("ownedText", { month: f.month(owned.month) })}</p>
              </div>
            </div>
            <ButtonLink href={`/dashboard/classes/${classId}`} variant="success" block className="mt-4">{t("openClass")} <ArrowRight /></ButtonLink>
          </div>
        )}

        {pending && (
          <div className="rounded-2xl border border-warning/40 bg-warning-soft/70 p-5 shadow-soft">
            <div className="flex items-start gap-3">
              <IconTile icon={Clock3} tone="warning" variant="solid" size="lg" />
              <div className="min-w-0">
                <p className="font-display text-lg font-bold leading-snug">{t("pendingTitle")}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{t("pendingText", { month: f.month(pending.month), date: f.dateTime(pending.created_at) })}</p>
              </div>
            </div>
            <div className="mt-4"><WithdrawForm id={pending.id} /></div>
          </div>
        )}

        {!pending && open && owned && (
          <details className={cn(cardVariants(), "group")}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 font-display font-semibold">
              {t("payAnother")}
              <ArrowRight className="h-4 w-4 transition group-open:rotate-90" />
            </summary>
            <div className="space-y-4 border-t p-4">{delivery}{form}</div>
          </details>
        )}

        {!pending && open && !owned && (
          <Card>
            <CardHeader>
              <CardTitle className="leading-snug">{t("title")}</CardTitle>
              <ol className="mt-2 grid grid-cols-3 gap-2">
                {[t("stepPay"), t("stepUpload"), t("stepAccess")].map((label, i) => (
                  <li key={label} className="flex flex-col items-center gap-1.5 rounded-xl bg-muted/60 px-2 py-2.5 text-center">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
                    <span className="text-xs font-medium leading-snug">{label}</span>
                  </li>
                ))}
              </ol>
            </CardHeader>
            <CardContent className="space-y-4">
              {rejected && (
                <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold">{t("rejectedTitle")}</p>
                    <p className="text-destructive/90">{t("rejectedText", { month: f.month(rejected.month) })}</p>
                    {rejected.admin_note && <p className="mt-1 text-xs">{t("reason", { note: rejected.admin_note })}</p>}
                  </div>
                </div>
              )}
              {delivery}
              {form}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
