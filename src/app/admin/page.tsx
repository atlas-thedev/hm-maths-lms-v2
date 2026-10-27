import Link from "next/link";
import {
  ArrowRight, BookOpen, ClipboardCheck, CreditCard, FileText, Megaphone, Package, Plus, Trophy, Users, Wallet,
  type LucideIcon,
} from "lucide-react";
import { isOwnerRole, requireAdmin } from "@/lib/auth";
import { ActionCard, Avatar, ButtonLink, Card, CardAction, CardContent, CardHeader, CardTitle, CountBadge, HeroCard, ListRow, StatCard, buttonVariants, type Tone } from "@/components/ui";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { StatusBadge } from "@/components/status-badge";
import { DateTile } from "@/components/date-tile";
import { RankMedal } from "@/components/leaderboard";
import { townKeys } from "@/lib/centers";
import { getCenters } from "@/lib/settings";
import { periodRange, type Paper } from "@/lib/papers";
import { getOverallBoard } from "@/lib/paper-data";
import { cn, currentMonth, formatLKR } from "@/lib/utils";
import { getFormat, getT } from "@/i18n/server";
import { Sticker } from "@/components/sticker";

export async function generateMetadata() {
  return { title: (await getT("admin.nav"))("overview") };
}

export default async function AdminHome() {
  const { db, profile } = await requireAdmin();
  const [t, tc, f, centers] = await Promise.all([getT("admin.overview"), getT("common"), getFormat(), getCenters()]);
  const month = currentMonth();
  const { from, to } = periodRange("month");
  const [students, classes, pending, approvedThisMonth, recent, papers, towns, top] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
    db.from("classes").select("id", { count: "exact", head: true }).eq("is_active", true),
    db.from("enrollments").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("enrollments").select("amount").eq("status", "approved").eq("month", month),
    db.from("enrollments").select("id, month, status, created_at, profiles:profiles!enrollments_student_id_fkey(full_name, student_id), classes(title)").order("created_at", { ascending: false }).limit(8),
    db.from("papers").select("*").order("paper_date", { ascending: false }).limit(4),
    db.from("profiles").select("town").eq("role", "student").limit(20000),
    getOverallBoard(db, { from, to, limit: 5 }),
  ]);
  const revenue = (approvedThisMonth.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);
  type Recent = { id: string; month: string; status: string; created_at: string; profiles: { full_name: string; student_id: string } | null; classes: { title: string } | null };
  const perTown = townKeys(centers).map((x) => ({ town: x, n: (towns.data ?? []).filter((r) => r.town === x).length }));
  const maxTown = Math.max(1, ...perTown.map((x) => x.n));
  const quick: { href: string; label: string; icon: LucideIcon; tone: Tone }[] = [
    { href: "/admin/papers#new", label: t("quick.paper"), icon: FileText, tone: "brand" },
    ...(isOwnerRole(profile.role) ? [{ href: "/admin/classes/new", label: t("quick.class"), icon: BookOpen, tone: "success" as Tone }] : []),
    { href: "/admin/notices", label: t("quick.notice"), icon: Megaphone, tone: "highlight" },
    { href: "/admin/store", label: t("quick.store"), icon: Package, tone: "info" },
  ];

  return (
    <div className="space-y-6">
      <Reveal>
        <HeroCard tone="dark">
          <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-sm text-white/90"><Sticker name="cool-ducks" size={22} /> {tc("brand.tutor")} · {f.month(month)}</p>
              <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">{t("hello", { name: profile.full_name.split(" ")[0] })}</h1>
              <p className="mt-1 text-sm text-white/90">{t("title")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/admin/payments" variant="inverse">
                <ClipboardCheck /> {t("reviewSlips")} <CountBadge count={pending.count} />
              </ButtonLink>
              {isOwnerRole(profile.role) && <Link href="/admin/classes/new" className={buttonVariants({ variant: "ghost", className: "bg-white/15 text-white ring-1 ring-white/25 backdrop-blur hover:bg-white/25 hover:text-white" })}><Plus className="h-4 w-4" /> {t("newClass")}</Link>}
            </div>
          </div>
        </HeroCard>
      </Reveal>

      <Stagger className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StaggerItem><StatCard label={t("students")} value={students.count ?? 0} icon={Users} /></StaggerItem>
        <StaggerItem><StatCard label={t("activeClasses")} value={classes.count ?? 0} icon={BookOpen} tone="info" /></StaggerItem>
        <StaggerItem><StatCard label={t("slips")} value={pending.count ?? 0} icon={CreditCard} tone="warning" hint={t("slipsHint")} /></StaggerItem>
        <StaggerItem><StatCard label={t("approvedMonth")} value={formatLKR(revenue)} icon={Wallet} tone="success" hint={t("enrollmentsN", { n: approvedThisMonth.data?.length ?? 0 })} /></StaggerItem>
      </Stagger>

      {/* Quick actions: app-style shortcuts on phones, cards on larger screens */}
      <Card padding="sm" className="grid grid-cols-4 gap-1 sm:hidden">
        {quick.map(({ href, label, icon: Icon, tone }) => <ActionCard key={href} layout="icon" href={href} title={label} icon={Icon} tone={tone} />)}
      </Card>
      <Stagger className="hidden gap-3 sm:grid sm:grid-cols-4">
        {quick.map(({ href, label, icon: Icon, tone }) => (
          <StaggerItem key={href} className="h-full">
            <ActionCard layout="row" href={href} title={label} icon={Icon} tone={tone} />
          </StaggerItem>
        ))}
      </Stagger>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card className="min-w-0 self-start">
          <CardHeader sticker="bag" title={t("latest")} action={<CardAction href="/admin/payments">{t("openCenter")}</CardAction>} />
          <CardContent className="space-y-2">
            {((recent.data ?? []) as unknown as Recent[]).map((r) => (
              <ListRow key={r.id} href="/admin/payments" leading={<Avatar name={r.profiles?.full_name ?? "?"} />}
                title={r.profiles?.full_name ?? ""}
                subtitle={`${r.classes?.title ?? ""} · ${f.month(r.month)} · ${f.dateTime(r.created_at)}`}
                trailing={<StatusBadge status={r.status} />} />
            ))}
            {!recent.data?.length && <p className="py-6 text-center text-sm text-muted-foreground">{t("none")}</p>}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader icon={FileText} title={t("papers")} action={<CardAction href="/admin/papers">{t("allPapers")}</CardAction>} />
            <CardContent className="space-y-2">
              {((papers.data ?? []) as Paper[]).map((p) => (
                <Link key={p.id} href={`/admin/papers/${p.id}`} className="flex items-center gap-3 rounded-2xl border border-border/70 p-2.5 transition hover:border-primary/40 hover:bg-accent/50">
                  <DateTile date={p.paper_date} className="h-11 w-11" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{p.title}</span>
                    <span className="block text-xs text-muted-foreground">{tc(`paperTypes.${p.paper_type}`)} · {t("outOf", { total: Number(p.total_marks) })}</span>
                  </span>
                </Link>
              ))}
              {!papers.data?.length && <p className="py-2 text-sm text-muted-foreground">{t("noPapers")}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader icon={Trophy} title={t("topMonth")} />
            <CardContent className="space-y-2">
              {top.map((r) => (
                <div key={`${r.student_code}-${r.rank}`} className="flex items-center gap-3 rounded-2xl bg-muted/50 p-2.5">
                  <RankMedal rank={r.rank} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{r.full_name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{[r.student_code, tc(`towns.${r.town}`), t("papersN", { n: r.papers })].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className="font-display text-sm font-bold">{Math.round(r.points)}</span>
                </div>
              ))}
              {!top.length && <p className="py-2 text-sm text-muted-foreground">{t("noRanks")}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4 text-primary" /> {t("centers")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {perTown.map(({ town, n }) => (
                <div key={town}>
                  <div className="mb-1 flex justify-between text-xs"><span className="font-medium">{tc(`towns.${town}`)}</span><span className="text-muted-foreground">{n}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-gradient-brand transition-all duration-1000" style={{ width: `${(n / maxTown) * 100}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
