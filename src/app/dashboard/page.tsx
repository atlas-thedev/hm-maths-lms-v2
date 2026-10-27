import Link from "next/link";
import { ArrowRight, BookOpen, CreditCard, FileText, PlayCircle, Radio, ShoppingBag, Trophy, Truck, type LucideIcon } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getMyEnrollments, getNotices, getUpcomingLive, liveWindow } from "@/lib/data";
import { NoticeTagBadge, StatusBadge } from "@/components/status-badge";
import { ActionCard, Alert, Badge, ButtonLink, Card, CardAction, CardContent, CardHeader, CardSubheading, HeroCard, HeroChip, HeroPanel, ListRow, stickerFor } from "@/components/ui";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { CopyButton } from "@/components/copy-button";
import { BannerCarousel } from "@/components/portal/banner-carousel";
import { Gauge, ResultsChart } from "@/components/portal/charts";
import { RankTile } from "@/components/portal/progress-widgets";
import { getMyPapers, getPaperStats } from "@/lib/paper-data";
import { PremiumMark } from "@/components/premium-badge";
import { pct } from "@/lib/papers";
import { getFormat, getScheduleLabel, getT } from "@/i18n/server";
import { Sticker } from "@/components/sticker";
import type { ClassRow } from "@/lib/types";
import { currentMonth } from "@/lib/utils";

export async function generateMetadata() {
  return { title: (await getT("portal.nav"))("dashboard") };
}


function greetingKey() {
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Colombo", hour: "numeric", hourCycle: "h23" }).format(new Date()));
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  const { db, user, profile } = await requireUser();
  const [t, tc, f, sched] = await Promise.all([getT("portal.dashboard"), getT("common"), getFormat(), getScheduleLabel()]);
  const month = currentMonth();
  const [enrollments, notices, live, orders, stats, papers, { data: freeRows }, { data: isPremium }] = await Promise.all([
    getMyEnrollments(db, user.id),
    getNotices(db, 3),
    getUpcomingLive(db, 4),
    db.from("orders").select("id, status, quantity, admin_note, created_at, products(title)").eq("student_id", user.id).order("created_at", { ascending: false }).limit(3),
    getPaperStats(db),
    getMyPapers(db, user.id, profile.al_year ?? null),
    db.from("classes").select("*, lessons(count)").eq("is_free", true).eq("is_active", true).order("created_at", { ascending: false }).limit(4),
    db.rpc("is_premium", { p_student: user.id }),
  ]);
  const thisMonth = enrollments.filter((e) => e.month === month && e.status === "approved" && e.classes);
  // Class fees: the most recent slips first (whatever their status), so an approval or a rejection shows up here.
  const fees = [...enrollments].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 3);
  type FreeClass = ClassRow & { lessons: { count: number }[] | null };
  const free = (freeRows ?? []) as FreeClass[];
  const firstName = profile.full_name.split(" ")[0];
  const next = live[0] ?? null;
  const nextOpen = next ? liveWindow(next, next.classes?.duration_minutes)?.open : false;

  const sat = papers.filter((p) => p.mine).slice(0, 8).reverse();
  const results = sat.map((p, i) => ({ title: p.title, value: Math.round(pct(p.mine!.marks, p.total_marks)), label: t("paperN", { n: i + 1 }) }));
  const avg = stats?.avg_pct ?? 0;
  const last = stats?.last ?? null;
  type Ord = { id: string; status: string; quantity: number; admin_note: string | null; created_at: string; products: { title: string } | null };
  const ords = (orders.data ?? []) as unknown as Ord[];

  const tiles: { href: string; label: string; hint: string; icon: LucideIcon }[] = [
    { href: "/dashboard/classes", label: t("tiles.classes"), hint: t("tiles.classesHint", { n: thisMonth.length }), icon: BookOpen },
    { href: "/dashboard/papers", label: t("tiles.papers"), hint: t("tiles.papersHint", { n: stats?.papers ?? 0 }), icon: FileText },
    { href: "/dashboard/leaderboard", label: t("tiles.leaderboard"), hint: last ? t("tiles.leaderboardHint", { rank: last.rank_island }) : t("tiles.leaderboardNone"), icon: Trophy },
    { href: "/dashboard/store", label: t("tiles.store"), hint: t("tiles.storeHint"), icon: ShoppingBag },
  ];

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      {welcome && <Alert variant="success">{t("welcomeNew", { name: firstName, id: profile.student_id ?? "" })}</Alert>}

      {/* Welcome */}
      <Reveal>
        <HeroCard symbol="∑">
          <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-medium text-white/90"><Sticker name="cool-ducks" size={22} /> {t(`greeting.${greetingKey()}`)}</p>
              <h1 className="mt-1 flex flex-wrap items-center gap-x-2 font-display text-[1.6rem] font-extrabold leading-tight tracking-tight sm:text-4xl">
                <span className="min-w-0">{t("welcome", { name: firstName })}</span>
                {isPremium === true && <PremiumMark label={tc("premium.name")} className="text-white [&_svg]:h-6 [&_svg]:w-6" />}
                <Sticker name="wave" size={34} />
              </h1>
              <p className="mt-2 max-w-xl text-sm text-white/90">{t("heroText")}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {profile.student_id && (
                  <span className="inline-flex items-center gap-2 rounded-2xl bg-white/20 py-1 pl-3.5 pr-1 ring-1 ring-white/25 backdrop-blur [&_button]:text-white [&_button:hover]:bg-white/20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">{t("sid")}</span>
                    <span data-testid="student-id" className="font-mono text-lg font-extrabold tabular-nums tracking-tight">{profile.student_id}</span>
                    <CopyButton value={profile.student_id} />
                  </span>
                )}
                {profile.town && <HeroChip>{tc(`towns.${profile.town}`)}</HeroChip>}
                {profile.al_year && <HeroChip>{tc("alBatch", { year: profile.al_year })}</HeroChip>}
              </div>
            </div>
            <HeroPanel className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/90"><Radio className="h-3.5 w-3.5" /> {t("nextClass")}</p>
              {next ? (
                <>
                  <p className="mt-1 break-words font-display text-lg font-bold leading-snug [overflow-wrap:anywhere]">{next.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/90 [overflow-wrap:anywhere]">{next.classes?.title} · {f.dateTime(next.live_start_time)}</p>
                  <ButtonLink variant="inverse" size="sm" className="mt-3" href={`/dashboard/classes/${next.class_id}?month=${next.month}#live`}>
                    {nextOpen ? t("joinNow") : t("open")} <ArrowRight />
                  </ButtonLink>
                </>
              ) : (
                <>
                  <p className="mt-1 text-sm text-white/95">{t("noUpcoming")}</p>
                  <ButtonLink variant="inverse" size="sm" className="mt-3" href="/dashboard/store">{t("browseClasses")} <ArrowRight /></ButtonLink>
                </>
              )}
            </HeroPanel>
          </div>
        </HeroCard>
      </Reveal>

      {/* Shortcuts */}
      <Stagger className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {tiles.map(({ href, label, hint, icon }) => (
          <StaggerItem key={href} className="h-full">
            <ActionCard href={href} title={label} description={hint} sticker={stickerFor(icon) ?? "star"} />
          </StaggerItem>
        ))}
      </Stagger>

      {/* Payment & Delivery */}
      <Reveal>
        <Card data-testid="payment-delivery">
          <CardHeader sticker="mailbox" title={t("payDelivery.title")} action={<CardAction href="/dashboard/payments">{t("payDelivery.all")}</CardAction>} />
          <CardContent className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="min-w-0">
              <CardSubheading icon={CreditCard}>{t("payDelivery.fees")}</CardSubheading>
              <div className="space-y-2">
                {fees.length ? fees.map((e) => (
                  <ListRow key={e.id} className="bg-muted/40"
                    title={`${e.classes?.title ?? t("payDelivery.classFee")} · ${f.month(e.month)}`}
                    subtitle={e.status === "rejected" && e.admin_note ? <span className="text-destructive-soft-foreground">{t("payDelivery.note", { note: e.admin_note })}</span> : undefined}
                    trailing={<StatusBadge status={e.status} />} />
                )) : <p className="py-2 text-sm text-muted-foreground">{t("payDelivery.noFees")}</p>}
              </div>
            </div>
            <div className="min-w-0">
              <CardSubheading icon={Truck}>{t("payDelivery.delivery")}</CardSubheading>
              <div className="space-y-2">
                {ords.length ? ords.map((o) => (
                  <ListRow key={o.id} className="bg-muted/40" icon={o.status === "shipped" ? Truck : ShoppingBag} tone={o.status === "shipped" ? "brand" : "neutral"}
                    title={`${o.products?.title ?? t("order")}${o.quantity > 1 ? ` × ${o.quantity}` : ""}`}
                    subtitle={o.status === "rejected" && o.admin_note ? <span className="text-destructive-soft-foreground">{t("payDelivery.note", { note: o.admin_note })}</span> : undefined}
                    trailing={<StatusBadge status={o.status} />} />
                )) : <p className="py-2 text-sm text-muted-foreground">{t("payDelivery.noOrders")}</p>}
              </div>
            </div>
            <ButtonLink href="/dashboard/store" block className="md:col-span-2 md:w-auto md:justify-self-start"><CreditCard /> {t("payDelivery.payFees")}</ButtonLink>
          </CardContent>
        </Card>
      </Reveal>

      <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)]">
        <div className="min-w-0 space-y-5 sm:space-y-6">
          <Card>
            <CardHeader sticker="online" title={t("upcoming")} action={<CardAction href="/dashboard/classes">{tc("actions.more")}</CardAction>} />
            <CardContent className="space-y-2">
              {live.length ? live.map((l) => (
                <ListRow key={l.id} href={`/dashboard/classes/${l.class_id}?month=${l.month}#live`} icon={Radio} tone="danger"
                  title={l.title} subtitle={`${l.classes?.title ?? ""} · ${f.dateTime(l.live_start_time)}`} />
              )) : <p className="py-2 text-sm text-muted-foreground">{t("noUpcoming")}</p>}

              {/* Free seminars */}
              <div className="!mt-4 border-t pt-4" data-testid="free-seminars">
                <CardSubheading icon={PlayCircle} action={free.length > 0 ? <Link href="/dashboard/free-zone" className="text-xs font-semibold text-primary hover:underline">{t("free.all")}</Link> : null}>
                  {t("free.title")}
                </CardSubheading>
                <div className="space-y-2">
                  {free.length ? free.map((c) => {
                    const videos = c.lessons?.[0]?.count ?? 0;
                    const when = sched(c);
                    return (
                      <ListRow key={c.id} href={`/dashboard/classes/${c.id}`} icon={PlayCircle} tone="highlight" title={c.title}
                        subtitle={[when, videos ? t(videos === 1 ? "free.video" : "free.videos", { n: videos }) : t("free.soon")].filter(Boolean).join(" · ")}
                        trailing={<Badge variant="success" className="uppercase">{t("free.badge")}</Badge>} />
                    );
                  }) : <p className="text-sm text-muted-foreground">{t("free.none")}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader sticker="megaphone" title={t("notices")} action={<CardAction href="/dashboard/notifications?filter=updates">{tc("actions.viewAll")}</CardAction>} />
            <CardContent className="space-y-2">
              {notices.length ? notices.map((n) => (
                <div key={n.id} className="rounded-2xl border border-border/70 bg-gradient-brand-soft p-3 dark:border-white/10">
                  <div className="flex items-center gap-2"><NoticeTagBadge tag={n.tag} />{n.is_pinned && <span className="text-xs">📌</span>}</div>
                  <p className="mt-1.5 line-clamp-1 text-sm font-semibold">{n.title}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{n.content}</p>
                </div>
              )) : <p className="text-sm text-muted-foreground">{t("noNotices")}</p>}
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-5 sm:space-y-6">
          <BannerCarousel />
          <Card>
            <CardHeader sticker="charts" title={t("results")} description={t("resultsHint")} action={<CardAction href="/dashboard/papers">{t("myResults")}</CardAction>} />
            <CardContent><ResultsChart data={results} emptyLabel={t("noResults")} emptyHint={t("noResultsText")} /></CardContent>
          </Card>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
            <Card>
              <CardHeader sticker="target" title={t("average")} />
              <CardContent className="pt-0"><Gauge value={avg} label={t("averageLabel", { n: stats?.papers ?? 0 })} /></CardContent>
            </Card>
            <Card>
              <CardHeader sticker="star" title={t("ranksTitle")} />
              <CardContent className="space-y-2.5">
                <RankTile label={t("rankIsland")} rank={last?.rank_island ?? null} of={last?.entrants_island} href="/dashboard/leaderboard" tone="warning" />
                <RankTile icon="pin" tone="info" label={profile.town ? tc(`towns.${profile.town}`) : t("rankTown")} rank={last?.rank_town ?? null} of={last?.entrants_town} href={`/dashboard/leaderboard?scope=${profile.town}`} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
