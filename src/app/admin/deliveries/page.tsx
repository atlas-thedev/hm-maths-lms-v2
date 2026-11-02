import Link from "next/link";
import { Suspense } from "react";
import { BookOpen, Download, Printer, Truck } from "lucide-react";
import { isOwnerRole, requireAdmin } from "@/lib/auth";
import { ActionForm } from "@/components/action-form";
import { FilterToolbar } from "@/components/filter-toolbar";
import { Badge, Card, CardContent, CardHeader, EmptyState, PageHeader, TabNav, buttonVariants, type TabNavItem } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { getFormat, getT } from "@/i18n/server";
import { currentMonth, shiftMonth } from "@/lib/utils";
import { DELIVERY_STATUSES, getDeliveries, itemLabel, parseDeliveryFilter } from "./data";
import { DeliveryBoard, type BoardRow } from "./delivery-board";
import { postsTutesAction, tuteSkipAction } from "./actions";

export async function generateMetadata() {
  return { title: (await getT("admin.nav"))("deliveries") };
}

/**
 * Admin → Tute delivery: every parcel to send (class tutes after a slip is approved + tute-book orders), by
 * status, with filters, bulk actions, printable address labels and a CSV. The side card sets which classes have
 * a tute in the chosen month ("no tute this month" skips that month's parcels).
 */
export default async function DeliveriesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const filter = parseDeliveryFilter(sp);
  const { db, profile } = await requireAdmin();
  const isOwner = isOwnerRole(profile.role);
  const [t, tc, f] = await Promise.all([getT("admin.deliveries"), getT("common"), getFormat()]);
  const cur = currentMonth();
  const panelMonth = filter.month || cur;
  const [rows, { data: statusRows }, { data: classRows }, { data: skipRows }, { data: monthRows }] = await Promise.all([
    getDeliveries(db, filter),
    db.from("deliveries").select("status").limit(10000),
    db.from("classes").select("id, title, posts_tutes, is_active").eq("is_free", false).neq("class_type", "Combo").order("title"),
    db.from("tute_skips").select("class_id, note").eq("month", panelMonth),
    db.from("deliveries").select("class_id, status").eq("kind", "class_tute").eq("month", panelMonth).limit(5000),
  ]);
  const counts = new Map<string, number>();
  for (const r of (statusRows ?? []) as { status: string }[]) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
  const classes = (classRows ?? []) as { id: string; title: string; posts_tutes: boolean; is_active: boolean }[];
  const skips = new Map(((skipRows ?? []) as { class_id: string; note: string | null }[]).map((s) => [s.class_id, s.note]));
  const perClass = new Map<string, { waiting: number; sent: number }>();
  for (const r of (monthRows ?? []) as { class_id: string; status: string }[]) {
    const c = perClass.get(r.class_id) ?? { waiting: 0, sent: 0 };
    if (r.status === "to_pack" || r.status === "packed") c.waiting++; else if (r.status === "posted" || r.status === "delivered") c.sent++;
    perClass.set(r.class_id, c);
  }

  // Links keep every filter except the one being changed.
  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    const base: Record<string, string> = { status: filter.status, month: filter.month, class: filter.classId, kind: filter.kind, method: filter.method, q: filter.q, ...patch };
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    return `?${p}`;
  };
  const tabs: TabNavItem[] = [
    ...DELIVERY_STATUSES.map((s) => ({ href: `/admin/deliveries${qs({ status: s })}`, label: t(`status.${s}`), badge: counts.get(s) ?? 0, alert: s === "returned" && (counts.get(s) ?? 0) > 0 })),
    { href: `/admin/deliveries${qs({ status: "all" })}`, label: t("all"), badge: [...counts.values()].reduce((a, b) => a + b, 0) },
  ];
  const months = Array.from({ length: 15 }, (_, i) => shiftMonth(cur, 2 - i));
  const board: BoardRow[] = rows.map((r) => ({
    id: r.id, kind: r.kind, status: r.status, method: r.method,
    name: r.profiles?.full_name ?? tc("dash"), sid: r.profiles?.student_id ?? null, phone: r.phone ?? r.profiles?.mobile ?? null,
    item: itemLabel(r, f.month), address: r.address, courier: r.courier, tracking: r.tracking_no, note: r.note,
    when: r.status === "posted" && r.posted_at ? t("postedOn", { date: f.date(r.posted_at) })
      : r.status === "delivered" && r.delivered_at ? t("deliveredOn", { date: f.date(r.delivered_at) })
      : t("queuedOn", { date: f.date(r.created_at) }),
  }));
  const listQs = qs({}).slice(1);

  return (
    <div className="space-y-5">
      <PageHeader title={t("title")} description={t("subtitle")} icon={Truck}>
        <a href={`/admin/deliveries/labels?${listQs}`} target="_blank" rel="noreferrer" className={buttonVariants({ size: "sm", variant: "outline" })}><Printer /> {t("labelsAll")}</a>
        <a href={`/admin/deliveries/export?${listQs}`} className={buttonVariants({ size: "sm", variant: "outline" })}><Download /> {t("csv")}</a>
      </PageHeader>

      <TabNav items={tabs} current={`/admin/deliveries${qs({ status: filter.status })}`} label={t("statusTabs")} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-3">
          <Suspense fallback={<div className="h-11 rounded-xl bg-muted/60" />}>
            <FilterToolbar testId="delivery-filters" searchLabel={t("search")} searchPlaceholder={t("searchPh")} clearLabel={t("clear")}
              selects={[
                { param: "month", label: t("month"), value: filter.month, options: [{ value: "", label: t("allMonths") }, ...months.map((m) => ({ value: m, label: f.month(m) }))] },
                { param: "class", label: t("class"), value: filter.classId, options: [{ value: "", label: t("allClasses") }, ...classes.map((c) => ({ value: c.id, label: c.title }))] },
                { param: "kind", label: t("kind"), value: filter.kind, options: [{ value: "", label: t("allKinds") }, { value: "class_tute", label: t("classTutes") }, { value: "order", label: t("books") }] },
                { param: "method", label: t("method"), value: filter.method, options: [{ value: "", label: t("allMethods") }, { value: "post", label: t("byPost") }, { value: "class", label: t("atClass") }] },
              ]} />
          </Suspense>
          <p className="text-sm text-muted-foreground">{t("count", { n: rows.length })}</p>
          {rows.length
            ? <DeliveryBoard rows={board} />
            : <EmptyState icon={Truck} title={t("empty")} description={filter.status === "to_pack" ? t("emptyToPack") : undefined} />}
        </div>

        <Card className="h-fit xl:sticky xl:top-24">
          <CardHeader icon={BookOpen} title={t("months.title", { month: f.month(panelMonth) })} description={t("months.hint")} />
          <CardContent className="space-y-2">
            {classes.filter((c) => c.is_active || perClass.has(c.id)).map((c) => {
              const skipped = skips.has(c.id);
              const pc = perClass.get(c.id) ?? { waiting: 0, sent: 0 };
              return (
                <div key={c.id} className="rounded-xl border border-border/80 p-3 dark:border-white/10">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 text-sm font-semibold leading-snug">{c.title}</p>
                    {!c.posts_tutes ? <Badge variant="secondary">{t("months.never")}</Badge>
                      : skipped ? <Badge variant="warning">{t("months.none")}</Badge>
                      : <Badge variant="success">{t("months.has")}</Badge>}
                  </div>
                  {c.posts_tutes && !skipped && <p className="mt-1 text-xs text-muted-foreground">{t("months.counts", { waiting: pc.waiting, sent: pc.sent })}</p>}
                  {skipped && skips.get(c.id) && <p className="mt-1 text-xs text-muted-foreground">{skips.get(c.id)}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {c.posts_tutes && (
                      <ActionForm action={tuteSkipAction} confirm={skipped ? undefined : t("months.confirm", { month: f.month(panelMonth) })}>
                        <input type="hidden" name="class_id" value={c.id} />
                        <input type="hidden" name="month" value={panelMonth} />
                        <input type="hidden" name="skip" value={skipped ? "0" : "1"} />
                        <SubmitButton size="sm" variant={skipped ? "soft" : "outline"}>{skipped ? t("months.undo") : t("months.mark")}</SubmitButton>
                      </ActionForm>
                    )}
                    {isOwner && (
                      <ActionForm action={postsTutesAction}>
                        <input type="hidden" name="class_id" value={c.id} />
                        <input type="hidden" name="on" value={c.posts_tutes ? "0" : "1"} />
                        <SubmitButton size="sm" variant="ghost" className="text-xs">{c.posts_tutes ? t("months.turnOff") : t("months.turnOn")}</SubmitButton>
                      </ActionForm>
                    )}
                  </div>
                </div>
              );
            })}
            <p className="pt-1 text-xs text-muted-foreground">{t("months.pick")} <Link href={`/admin/deliveries${qs({ month: shiftMonth(panelMonth, 1) })}`} className="font-semibold text-primary hover:underline">{f.month(shiftMonth(panelMonth, 1))} →</Link></p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
