"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type TabNavItem = {
  href: string; label: string; exact?: boolean;
  /** Icon component — only from client components (a function can't cross from a server component). */
  icon?: LucideIcon;
  /** Already-rendered icon, e.g. <Users className="h-4 w-4" /> — use this from server components. */
  iconNode?: React.ReactNode;
  /** Small count after the label (0 / undefined = hidden). `alert` makes it red, for things to fix. */
  badge?: number; alert?: boolean;
};

/**
 * Tabs that are real pages (sub-routes) or query tabs (?tab=…). Scrolls sideways on phones; the active tab
 * follows the URL path, or `current` (an item href) when the page knows it (query tabs).
 * Used by the Owner Console, the Developer panel and the admin class page.
 */
export function TabNav({ items, className, label, current: currentHref }: { items: TabNavItem[]; className?: string; label?: string; current?: string }) {
  const path = usePathname();
  const active = (i: TabNavItem) => (i.exact ? path === i.href : path === i.href || path.startsWith(i.href + "/"));
  const current = currentHref !== undefined ? items.find((i) => i.href === currentHref) : [...items].sort((a, b) => b.href.length - a.href.length).find(active);
  const navRef = useRef<HTMLElement>(null);
  // On a phone the row scrolls sideways: bring the active tab into view instead of leaving it half cut off.
  useEffect(() => {
    const el = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    const box = navRef.current;
    if (!el || !box || box.scrollWidth <= box.clientWidth) return;
    box.scrollTo({ left: el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2, behavior: "auto" });
  }, [current?.href]);
  return (
    <nav ref={navRef} aria-label={label} className={cn("-mx-4 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0", className)}>
      <div className="inline-flex min-w-full gap-1 rounded-2xl border border-border/80 bg-card p-1 shadow-soft dark:border-white/10 sm:min-w-0">
        {items.map((i) => {
          const on = i === current;
          const Icon = i.icon;
          return (
            <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined} scroll={false}
              className={cn("flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition active:scale-[0.97]",
                on ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
              {Icon ? <Icon className="h-4 w-4" /> : i.iconNode ?? null}{i.label}
              {i.badge ? (
                <span className={cn("min-w-5 rounded-full px-1.5 text-center text-[11px] font-bold tabular-nums",
                  i.alert ? "bg-destructive text-white" : on ? "bg-white/25" : "bg-muted text-muted-foreground")}>{i.badge}</span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
