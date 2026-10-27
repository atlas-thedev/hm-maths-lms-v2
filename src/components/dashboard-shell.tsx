"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity, Code2, Images, Link2, MapPin, Palette, Tag, Type, Power, Shapes, UsersRound, Wrench,
  ArrowLeft, Bell, BookOpen, CalendarDays, ChevronDown, ChevronRight, ClipboardList, CreditCard, FileText, Flame, GraduationCap, HelpCircle, Home,
  LayoutDashboard, LogOut, Megaphone, Menu, Moon, Package, Phone, PlayCircle, Radio, ScanLine, ShieldCheck, ShoppingBag, Sun, Trophy, User, Users, X, type LucideIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { LogoMark } from "@/components/logo";
import { toneSolid } from "@/components/ui/tone";
import { CountBadge } from "@/components/ui/blocks";
import { AnnouncementBar, type Announcement } from "@/components/announcement-bar";
import { buttonVariants } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useT } from "@/i18n/client";
import { cn, initials } from "@/lib/utils";
import { STREAK_KEYS, hottestStreak, type Streaks } from "@/lib/papers";
import { STREAK_META } from "@/components/portal/progress-widgets";
import { Sticker } from "@/components/sticker";
import { STICKER_FOR } from "@/components/sticker-map";
import { PROFILE_SYNC_EVENT, type ProfileSyncPayload, useBellCount } from "@/components/notices-realtime";

const ICONS = {
  dashboard: LayoutDashboard, classes: BookOpen, free: PlayCircle, exams: ClipboardList, papers: FileText, trophy: Trophy,
  payments: CreditCard, store: ShoppingBag, notices: Bell, profile: User, students: Users, megaphone: Megaphone,
  package: Package, grad: GraduationCap, home: Home, events: CalendarDays, channels: Radio, contact: Phone, faq: HelpCircle, qr: ScanLine, shield: ShieldCheck,
  images: Images, map: MapPin, link: Link2, type: Type, brand: Tag, code: Code2, palette: Palette, power: Power, activity: Activity, wrench: Wrench, kit: Shapes, team: UsersRound,
} satisfies Record<string, LucideIcon>;
export type IconKey = keyof typeof ICONS;

export type ShellItem = { href: string; label: string; icon: IconKey; badge?: number; exact?: boolean; /** Short label for the phone tab bar. */ tab?: string };
export type ShellGroup = { label: string; items: ShellItem[] };
export type Streak = Streaks;

const isId = (s: string) => /^[0-9a-f-]{20,}$/i.test(s);

export function DashboardShell({ area, groups, tabs, user, notices, menu, streak, crumbNs, announcement, children }: {
  area: "student" | "admin" | "dev";
  /** Site-wide banner set in the Developer panel. */
  announcement?: Announcement | null;
  groups: ShellGroup[];
  /** hrefs shown in the mobile bottom bar (max 4, the 5th button opens the full menu). */
  tabs: string[];
  user: { name: string; subtitle: string; avatar?: string | null };
  notices?: { href: string; count: number };
  menu: ShellItem[];
  streak?: Streak | null;
  crumbNs: string;
  children: React.ReactNode;
}) {
  const tc = useT("common");
  const tCrumb = useT(crumbNs);
  const ts = useT("portal.streak");
  const pathname = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  // The drawer stays in the page only while open or sliding closed; it is removed once the close animation ends.
  const [drawerMounted, setDrawerMounted] = useState(false);
  useEffect(() => { if (drawer) setDrawerMounted(true); }, [drawer]);
  const [account, setAccount] = useState(false);
  const [liveUser, setLiveUser] = useState(user);
  const accRef = useRef<HTMLDivElement>(null);
  const all = groups.flatMap((g) => g.items);
  const isActive = (i: Pick<ShellItem, "href" | "exact">) => (i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(i.href + "/"));
  // Most specific active item wins (e.g. /admin/papers over /admin).
  const current = all.filter(isActive).sort((a, b) => b.href.length - a.href.length)[0];
  const activeHref = current?.href;
  const home = area === "admin" ? "/admin" : area === "dev" ? "/dev" : "/dashboard";
  const initialPending = all.find((i) => i.href === "/admin/payments")?.badge ?? 0;
  const { bell, pendingReceipts } = useBellCount(notices?.count ?? 0, !!notices, area === "dev" ? "admin" : area, initialPending);
  const badgeOf = (item: ShellItem) => {
    if (notices && item.href === notices.href) return bell;
    if (area === "admin" && item.href === "/admin/payments") return pendingReceipts;
    return item.badge;
  };

  useEffect(() => {
    setLiveUser(user);
  }, [user.name, user.subtitle, user.avatar]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onSync = (e: Event) => {
      const detail = (e as CustomEvent<ProfileSyncPayload>).detail;
      if (!detail) return;
      setLiveUser((prev) => ({
        ...prev,
        ...(detail.name !== undefined ? { name: detail.name } : {}),
        ...(detail.avatar !== undefined ? { avatar: detail.avatar } : {}),
      }));
    };
    window.addEventListener(PROFILE_SYNC_EVENT, onSync);
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("hm_realtime_v1");
      bc.onmessage = (ev) => {
        if (ev.data?.type === PROFILE_SYNC_EVENT && ev.data?.payload) {
          const p = ev.data.payload as ProfileSyncPayload;
          setLiveUser((prev) => ({
            ...prev,
            ...(p.name !== undefined ? { name: p.name } : {}),
            ...(p.avatar !== undefined ? { avatar: p.avatar } : {}),
          }));
        }
      };
    } catch {
      bc = null;
    }
    return () => {
      window.removeEventListener(PROFILE_SYNC_EVENT, onSync);
      bc?.close();
    };
  }, []);

  useEffect(() => { setDrawer(false); setAccount(false); }, [pathname]);
  useEffect(() => {
    if (!account) return;
    const close = (e: PointerEvent) => { if (accRef.current && !accRef.current.contains(e.target as Node)) setAccount(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [account]);

  useEffect(() => {
    if (!drawer) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setDrawer(false); };
    document.addEventListener("keydown", close);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", close); };
  }, [drawer]);

  // Phone top bar: a detail page (deeper than its menu item) gets a back arrow, like a native app.
  const isDetail = !!activeHref && pathname !== activeHref && pathname !== home;
  const mobileTitle = isDetail ? undefined : current?.label;
  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1 && document.referrer.startsWith(window.location.origin)) router.back();
    else router.push(activeHref ?? home);
  };

  const segs = pathname.split("/").filter(Boolean);
  const crumbs = segs.slice(1).map((s, i) => ({ href: "/" + segs.slice(0, i + 2).join("/"), s, parent: segs[i] }))
    .filter((c) => !["class", "product", "lessons"].includes(c.s))
    .map((c) => ({
      href: c.href,
      label: isId(c.s)
        ? tCrumb(area === "student" && ["classes", "class"].includes(c.parent) ? "classDetail" : area === "student" && c.parent === "lessons" ? "lesson" : "details")
        : tCrumb(c.s),
    }));

  const renderNav = (layout: string) => (
    <nav className="space-y-5">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">{g.label}</p>
          <div className="space-y-0.5">
            {g.items.map((item) => {
              const active = item.href === activeHref;
              const badge = badgeOf(item);
              return (
                <Link key={item.href} href={item.href}
                  className={cn("group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors",
                    active ? "text-primary" : "text-foreground/70 hover:bg-accent/70 hover:text-foreground")}>
                  {active && (
                    <motion.span layoutId={`${layout}-pill`} className="absolute inset-0 rounded-xl bg-accent ring-1 ring-primary/15"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                  )}
                  {active && <motion.span layoutId={`${layout}-bar`} className="absolute -left-3 bottom-2 top-2 w-1 rounded-r-full bg-primary" />}
                  <Sticker name={STICKER_FOR[item.icon]} size={24} mode={active ? "auto" : "static"} className={cn("relative transition-transform group-hover:scale-125", !active && "opacity-90")} />
                  <span className="relative min-w-0 flex-1 leading-snug">{item.label}</span>
                  <CountBadge count={badge} className="relative ml-auto" />
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const renderStreak = () => {
    if (!streak) return null;
    const hot = hottestStreak(streak);
    const Icon = hot ? STREAK_META[hot.key].icon : Flame;
    return (
      <Link href="/dashboard/papers#streaks" className={cn("group relative block overflow-hidden rounded-2xl p-3 text-white shadow-lg transition hover:-translate-y-0.5",
        hot ? toneSolid[STREAK_META[hot.key].tone] : "bg-gradient-dark")}>
        <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/15 blur-xl transition group-hover:scale-125" />
        <div className="relative flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/20"><Icon className={cn("h-[18px] w-[18px]", hot && "animate-flicker")} /></span>
          <div className="min-w-0">
            <p className="truncate font-display text-[15px] font-bold leading-tight">
              {hot ? `${ts(`types.${hot.key}.name`)} · ${hot.value.current}` : ts("none")}
            </p>
            <p className="truncate text-[11px] text-white/90">{hot ? ts("papersRow", { n: hot.value.current }) : ts("noneSub")}</p>
          </div>
        </div>
        <div className="relative mt-2.5 flex gap-1">
          {STREAK_KEYS.map((k) => {
            const KIcon = STREAK_META[k].icon;
            const v = streak[k].current;
            return (
              <span key={k} title={`${ts(`types.${k}.name`)}: ${v}`}
                className={cn("flex h-6 flex-1 items-center justify-center gap-0.5 rounded-md text-[10px] font-bold", v > 0 ? "bg-white/25" : "bg-black/15 text-white/45")}>
                <KIcon className="h-3 w-3" />{v}
              </span>
            );
          })}
        </div>
      </Link>
    );
  };

  const tabItems = tabs.map((h) => all.find((i) => i.href === h)).filter(Boolean) as ShellItem[];

  return (
    <div className="min-h-dvh bg-background bg-mesh text-foreground">
      {/* ── Desktop sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] p-3 lg:block">
        <div className="flex h-full flex-col rounded-[22px] border border-border/70 bg-card/85 p-3 shadow-soft backdrop-blur-xl dark:border-white/10">
          <Link href={home} className="flex items-center gap-3 px-2 py-2">
            <LogoMark tone="tile" />
            <span className="leading-tight">
              <span className="block font-display text-[15px] font-bold tracking-tight">{tc("brand.short")}</span>
              <span className="block text-[11px] font-medium text-muted-foreground">{area === "admin" ? tc("shell.adminConsole") : area === "dev" ? tc("shell.devConsole") : tc("brand.sub")}</span>
            </span>
          </Link>
          <ScrollFade className="mt-4">{renderNav("side")}</ScrollFade>
          <div className="space-y-3 pt-3">
            {renderStreak()}
            <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-2.5">
              <Avatar user={liveUser} className="h-9 w-9 text-xs" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{liveUser.name}</p>
                <p className="truncate font-mono text-[11px] text-muted-foreground">{liveUser.subtitle}</p>
              </div>
              <form action="/auth/logout" method="post">
                <button type="submit" aria-label={tc("actions.logout")} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive-soft hover:text-destructive-soft-foreground dark:hover:bg-destructive/40">
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 lg:pl-[272px]">
        {/* ── Top bar ── */}
        <header className="glass sticky top-0 z-30 border-b border-border/60 pt-[env(safe-area-inset-top)] dark:border-white/10">
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-1.5 px-3 sm:h-16 sm:gap-3 sm:px-6">
            {isDetail ? (
              <button type="button" onClick={goBack} aria-label={tc("actions.back")} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-foreground transition active:scale-95 active:bg-accent lg:hidden">
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : (
              <button type="button" onClick={() => setDrawer(true)} aria-label={tc("shell.openMenu")} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-foreground transition active:scale-95 active:bg-accent lg:hidden">
                <Menu className="h-5 w-5" />
              </button>
            )}
            {pathname === home ? (
              <Link href={home} className="flex min-w-0 shrink items-center gap-2 lg:hidden" aria-label={tc("brand.short")}>
                <LogoMark tone="tile" className="h-8 w-8 shrink-0" />
                <span className="truncate font-display text-base font-bold">{tc("brand.short")}</span>
              </Link>
            ) : (
              <p className="min-w-0 flex-1 truncate font-display text-[17px] font-bold leading-tight sm:hidden">{mobileTitle ?? crumbs.at(-1)?.label ?? current?.label}</p>
            )}
            <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-sm sm:flex">
              <Link href={home} aria-label={tc("actions.home")} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground"><Home className="h-4 w-4" /></Link>
              {crumbs.map((c, i) => (
                <span key={c.href} className="flex min-w-0 items-center gap-1.5">
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                  {i === crumbs.length - 1
                    ? <span className="truncate font-semibold">{c.label}</span>
                    : <Link href={c.href} className="truncate text-muted-foreground transition hover:text-foreground">{c.label}</Link>}
                </span>
              ))}
              {!crumbs.length && <span className="font-semibold">{current?.label}</span>}
            </nav>
            <div className="ml-auto flex shrink-0 items-center gap-1">
              {area === "admin" && (
                <Link href="/admin/attendance?scan=1" title={tc("shell.qrScanner")} aria-label={tc("shell.qrScanner")} data-testid="topbar-qr-scanner"
                  className={buttonVariants({ variant: "soft", className: "px-2.5 text-xs ring-1 ring-primary/20" })}>
                  <ScanLine className="h-4 w-4" />
                  <span className="hidden md:inline">{tc("shell.qrScanner")}</span>
                </Link>
              )}
              <LanguageSwitcher className="hidden sm:inline-flex" />
              <ThemeButton label={tc("shell.toggleTheme")} />
              {notices && (
                <Link href={notices.href} aria-label={bell > 0 ? `${tc("shell.notifications")} (${bell})` : tc("shell.notifications")} data-testid="topbar-notifications-bell" className="relative grid h-10 w-10 place-items-center rounded-xl text-foreground/70 transition hover:bg-accent hover:text-foreground">
                  <Bell className="h-5 w-5" />
                  {bell > 0 && (
                    <CountBadge data-testid="topbar-notifications-count" count={bell} max={9} className="absolute right-1 top-1 h-4 min-w-4 px-1 ring-2 ring-card" />
                  )}
                </Link>
              )}
              <div ref={accRef} className="relative ml-1">
                <button type="button" onClick={() => setAccount((m) => !m)} aria-label={tc("shell.account")} aria-expanded={account}
                  className="block rounded-xl shadow-md shadow-teal-500/25 transition hover:scale-105">
                  <Avatar user={liveUser} className="h-10 w-10 text-sm" />
                </button>
                <AnimatePresence>
                  {account && (
                    <motion.div initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute right-0 z-50 mt-2 w-64 origin-top-right overflow-hidden rounded-2xl border border-border/80 bg-popover p-2 shadow-2xl dark:border-white/10">
                      <div className="px-3 py-2">
                        <p className="truncate text-sm font-semibold">{liveUser.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{liveUser.subtitle}</p>
                      </div>
                      <div className="my-1 h-px bg-border" />
                      {menu.map((m) => {
                        const Icon = ICONS[m.icon];
                        return (
                          <Link key={m.href} href={m.href} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground">
                            <Icon className="h-4 w-4 text-muted-foreground" /> {m.label}
                          </Link>
                        );
                      })}
                      <Link href="/" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground">
                        <Home className="h-4 w-4 text-muted-foreground" /> {tc("shell.backToSite")}
                      </Link>
                      <form action="/auth/logout" method="post">
                        <button type="submit" className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-destructive-soft-foreground hover:bg-destructive-soft dark:hover:bg-destructive/30">
                          <LogOut className="h-4 w-4" /> {tc("actions.logout")}
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        {/* ── Page ── */}
        <main className="mx-auto w-full min-w-0 max-w-7xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 sm:pt-6 sm:px-6 lg:pb-12 lg:pt-8">
          {announcement ? <AnnouncementBar {...announcement} /> : null}
          <motion.div className="min-w-0" key={pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
            {children}
          </motion.div>
        </main>
        <footer className="mx-auto hidden max-w-7xl justify-end gap-4 px-6 pb-8 text-xs text-muted-foreground lg:flex">
          <Link href="/#support" className="font-medium transition hover:text-primary">{tc("shell.helpDesk")}</Link>
          <span className="font-medium">© {new Date().getFullYear()} {tc("brand.short")}</span>
        </footer>
      </div>

      {/* ── Mobile bottom tab bar (docked, like a native app) ── */}
      <nav aria-label={tc("shell.tabs")} className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px_rgba(20,14,10,.18)] backdrop-blur-xl dark:border-white/10 dark:bg-card/95 lg:hidden">
        <div className="mx-auto grid max-w-lg px-1" style={{ gridTemplateColumns: `repeat(${tabItems.length + 1}, minmax(0, 1fr))` }}>
          {tabItems.map((item) => {
            const active = item.href === activeHref;
            const badge = badgeOf(item);
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
                className="group relative flex min-h-[58px] min-w-0 touch-manipulation select-none flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold transition active:scale-95">
                {active && <motion.span layoutId="tab-pill" className="absolute inset-x-2 top-0 h-[3px] rounded-b-full bg-primary" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <span className="relative">
                  <Sticker name={STICKER_FOR[item.icon]} size={24} mode={active ? "auto" : "static"} className={cn("transition", !active && "opacity-80 grayscale-[35%]")} />
                  <CountBadge count={badge} max={9} className="absolute -right-2.5 -top-1.5 h-4 min-w-4 px-1 ring-2 ring-card" />
                </span>
                <span className={cn("relative max-w-full truncate px-0.5", active ? "text-primary dark:text-teal-300" : "text-muted-foreground")}>{item.tab ?? item.label}</span>
              </Link>
            );
          })}
          <button type="button" onClick={() => setDrawer(true)} aria-label={tc("shell.openMenu")}
            className="relative flex min-h-[58px] min-w-0 touch-manipulation select-none flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold text-muted-foreground transition active:scale-95">
            <Menu className="h-6 w-6" /><span>{tc("shell.more")}</span>
          </button>
        </div>
      </nav>

      {/* ── Mobile drawer ── */}
      {/* Mounted while open or closing, removed when the slide-out finishes. (The old AnimatePresence version
          never removed it, leaving an invisible full-screen backdrop that swallowed every tap on phones.) */}
      {drawerMounted && (<>
      <motion.div aria-hidden className={cn("fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm lg:hidden", !drawer && "pointer-events-none")}
        initial={{ opacity: 0 }} animate={{ opacity: drawer ? 1 : 0 }} onClick={() => setDrawer(false)} />
      <motion.aside role="dialog" aria-modal="true" aria-hidden={!drawer} inert={!drawer} aria-label={tc("shell.openMenu")} className="fixed inset-y-0 left-0 z-50 flex w-[86%] max-w-[320px] flex-col bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl lg:hidden"
              initial={{ x: "-100%" }} animate={{ x: drawer ? 0 : "-100%" }} transition={{ type: "spring", damping: 30, stiffness: 320 }}
        onAnimationComplete={() => { if (!drawer) setDrawerMounted(false); }}>
              <div className="mb-5 flex items-center justify-between">
                <Link href={home} className="flex items-center gap-2.5"><LogoMark tone="tile" /><span className="font-display font-bold">{tc("brand.short")}</span></Link>
                <button type="button" aria-label={tc("shell.closeMenu")} onClick={() => setDrawer(false)} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-accent"><X className="h-5 w-5" /></button>
              </div>
              <ScrollFade>{renderNav("drawer")}</ScrollFade>
              <div className="mt-4 space-y-3 border-t pt-4">
                {renderStreak()}
                <div className="flex items-center justify-between">
                  <LanguageSwitcher />
                  <form action="/auth/logout" method="post">
                    <button type="submit" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-destructive-soft-foreground hover:bg-destructive-soft dark:hover:bg-destructive/30"><LogOut className="h-4 w-4" /> {tc("actions.logout")}</button>
                  </form>
                </div>
              </div>
            </motion.aside>
      </>)}
    </div>
  );
}

/** Profile photo, or initials when the student has none. */
function Avatar({ user, className }: { user: { name: string; avatar?: string | null }; className?: string }) {
  if (user.avatar) {
    return <img src={user.avatar} alt="" className={cn("shrink-0 rounded-xl object-cover", className)} />;
  }
  return <span className={cn("grid shrink-0 place-items-center rounded-xl bg-gradient-brand font-display font-bold text-white", className)}>{initials(user.name)}</span>;
}

function ThemeButton({ label }: { label: string }) {
  const { resolvedTheme, setTheme, forcedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  if (forcedTheme) return null; // switching turned off in Developer panel → Theme
  return (
    <button type="button" aria-label={label} onClick={() => setTheme(dark ? "light" : "dark")}
      className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl text-foreground/70 transition hover:bg-accent hover:text-foreground">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={dark ? "moon" : "sun"} initial={{ y: -16, opacity: 0, rotate: -60 }} animate={{ y: 0, opacity: 1, rotate: 0 }} exit={{ y: 16, opacity: 0, rotate: 60 }} transition={{ duration: 0.2 }}>
          {dark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

/** Scrollable column with fade edges + a bouncing "more below" button, so it's obvious the list scrolls. */
function ScrollFade({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ up: false, down: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setEdges({ up: el.scrollTop > 4, down: el.scrollTop + el.clientHeight < el.scrollHeight - 4 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, []);
  return (
    <div className={cn("relative min-h-0 flex-1", className)}>
      <div ref={ref} className="scrollbar-thin h-full overflow-y-auto overscroll-contain px-3 pb-2">{children}</div>
      <div aria-hidden className={cn("pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-card to-transparent transition-opacity", edges.up ? "opacity-100" : "opacity-0")} />
      <div aria-hidden className={cn("pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card via-card/80 to-transparent transition-opacity", edges.down ? "opacity-100" : "opacity-0")} />
      <button type="button" aria-label="Scroll down" tabIndex={-1}
        onClick={() => ref.current?.scrollBy({ top: ref.current.clientHeight * 0.7, behavior: "smooth" })}
        className={cn("absolute bottom-1 left-1/2 grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full border border-border bg-card text-primary shadow-md transition",
          edges.down ? "animate-bounce opacity-100" : "pointer-events-none opacity-0")}>
        <ChevronDown className="h-4 w-4" />
      </button>
    </div>
  );
}

