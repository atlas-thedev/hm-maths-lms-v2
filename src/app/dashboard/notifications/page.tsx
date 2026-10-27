import Link from "next/link";
import { ArrowRight, Bell, CheckCircle2, CreditCard, Megaphone, Package, Pin, Truck, XCircle, type LucideIcon } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getNotices } from "@/lib/data";
import { NoticeTagBadge } from "@/components/status-badge";
import { BackButton } from "@/components/back-button";
import { Badge, EmptyState, IconTile, PageHeader, type Tone } from "@/components/ui";
import type { AppNotification, NotificationKind } from "@/lib/types";
import { getFormat, getT } from "@/i18n/server";
import { cn } from "@/lib/utils";
import { MarkAllRead } from "./mark-read";

const FILTERS = ["all", "payments", "delivery", "updates"] as const;
type Filter = (typeof FILTERS)[number];

type Item = {
  key: string; at: string; unread: boolean; group: Exclude<Filter, "all">;
  title: string; body: string | null; note?: string | null; link?: string | null;
  icon: LucideIcon; tone: Tone; tag?: string; pinned?: boolean; meta?: string;
};

const KIND_META: Record<NotificationKind, { group: Item["group"]; icon: LucideIcon; tone: Tone }> = {
  payment_approved: { group: "payments", icon: CheckCircle2, tone: "success" },
  payment_rejected: { group: "payments", icon: XCircle, tone: "danger" },
  order_approved: { group: "delivery", icon: Package, tone: "info" },
  order_rejected: { group: "delivery", icon: XCircle, tone: "danger" },
  order_shipped: { group: "delivery", icon: Truck, tone: "brand" },
  update: { group: "updates", icon: Megaphone, tone: "brand" },
};

export async function generateMetadata() {
  return { title: (await getT("portal.nav"))("notifications") };
}

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter: raw } = await searchParams;
  const filter: Filter = FILTERS.find((x) => x === raw) ?? "all";
  const { db, user, profile } = await requireUser();
  const [t, f] = await Promise.all([getT("portal.notifications"), getFormat()]);
  const [{ data: rows }, notices, { data: classes }] = await Promise.all([
    db.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
    getNotices(db, 100),
    db.from("classes").select("id, title"),
  ]);
  const className = new Map((classes ?? []).map((c) => [c.id, c.title as string]));
  const seenAt = profile.notices_seen_at ?? new Date(Date.now() - 7 * 86400000).toISOString();

  const fromNotification = (n: AppNotification): Item => {
    const m = KIND_META[n.kind];
    const vars = { class: n.data.class ?? "", month: n.data.month ? f.month(n.data.month) : "", product: n.data.product ?? "" };
    return {
      key: `n-${n.id}`, at: n.created_at, unread: !n.read_at, group: m.group, icon: m.icon, tone: m.tone, link: n.link,
      title: n.kind === "update" ? (n.title ?? t("kinds.update.title")) : t(`kinds.${n.kind}.title`),
      body: n.kind === "update" ? n.body : t(`kinds.${n.kind}.body`, vars),
      note: n.kind.endsWith("_rejected") ? n.data.note : null,
    };
  };
  const items: Item[] = [
    ...((rows ?? []) as AppNotification[]).map(fromNotification),
    ...notices.map((n): Item => ({
      key: `x-${n.id}`, at: n.created_at, unread: n.created_at > seenAt, group: "updates", icon: Bell,
      tone: n.tag === "Urgent" ? "danger" : "brand",
      title: n.title, body: n.content, tag: n.tag, pinned: n.is_pinned,
      meta: [n.class_id ? className.get(n.class_id) ?? t("class") : null, n.target_year ? t("batch", { year: n.target_year }) : null].filter(Boolean).join(" · "),
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const shown = items.filter((i) => filter === "all" || i.group === filter);
  const pinned = shown.filter((i) => i.pinned);
  const rest = shown.filter((i) => !i.pinned);
  const unreadIn = (g: Filter) => items.filter((i) => i.unread && (g === "all" || i.group === g)).length;
  const pill = (active: boolean) => cn("inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
    active ? "bg-primary text-primary-foreground shadow-md shadow-primary/25" : "border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground");

  return (
    <div data-testid="notifications-page">
      <MarkAllRead hasUnread={items.some((i) => i.unread)} />
      <BackButton label={t("back")} fallback="/dashboard" className="mb-5" />
      <PageHeader icon={Bell} title={t("title")} description={t("subtitle")} />
      <div className="mb-5 flex flex-wrap gap-2" role="tablist">
        {FILTERS.map((x) => {
          const n = unreadIn(x);
          return (
            <Link key={x} href={x === "all" ? "/dashboard/notifications" : `/dashboard/notifications?filter=${x}`} className={pill(filter === x)}
              role="tab" aria-selected={filter === x} data-testid={`notifications-filter-${x}`}>
              {t(`filters.${x}`)}
              {n > 0 && <span className={cn("grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold", filter === x ? "bg-white/25" : "bg-destructive text-white")}>{n > 9 ? "9+" : n}</span>}
            </Link>
          );
        })}
      </div>
      {!shown.length ? <EmptyState icon={Bell} title={t("empty")} description={t("emptyText")} /> : (
        <div className="space-y-6">
          {pinned.length > 0 && (
            <section>
              <h2 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground"><Pin className="h-3.5 w-3.5" />{t("pinned")}</h2>
              <ItemList items={pinned} newLabel={t("new")} viewLabel={t("view")} noteLabel={(note) => t("note", { note })} when={f.dateTime} />
            </section>
          )}
          {rest.length > 0 && <ItemList items={rest} newLabel={t("new")} viewLabel={t("view")} noteLabel={(note) => t("note", { note })} when={f.dateTime} />}
        </div>
      )}
    </div>
  );
}

function ItemList({ items, newLabel, viewLabel, noteLabel, when }: {
  items: Item[]; newLabel: string; viewLabel: string; noteLabel: (note: string) => string; when: (iso: string) => string;
}) {
  return (
    <ul className="space-y-3">
      {items.map((i) => {
        const Icon = i.icon;
        return (
          <li key={i.key} data-testid="notification-item"
            className={cn("relative flex gap-3 rounded-2xl border bg-card p-3.5 shadow-soft sm:gap-3.5 sm:p-5",
              i.unread ? "border-primary/30 ring-1 ring-primary/15" : "border-transparent", i.tag === "Urgent" && "border-destructive/40")}>
            <IconTile icon={Icon} tone={i.tone} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {i.tag && <NoticeTagBadge tag={i.tag} />}
                {i.unread && <Badge variant="solid" className="bg-destructive uppercase tracking-wide">{newLabel}</Badge>}
                {i.meta && <span className="text-xs text-muted-foreground">{i.meta}</span>}
                <span className="ml-auto text-xs text-muted-foreground">{when(i.at)}</span>
              </div>
              <h3 className="mt-1.5 font-display text-base font-semibold leading-snug">{i.title}</h3>
              {i.body && <p className="mt-0.5 whitespace-pre-line text-sm text-muted-foreground">{i.body}</p>}
              {i.note && <p className="mt-2 rounded-xl bg-destructive-soft px-3 py-2 text-sm text-destructive-soft-foreground">{noteLabel(i.note)}</p>}
              {i.link && (
                <Link href={i.link} className="mt-2 inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-primary hover:underline">
                  {viewLabel} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
