"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type TabNavItem = { href: string; label: string; icon?: LucideIcon; exact?: boolean };

/**
 * Tabs that are real pages (sub-routes). Scrolls sideways on phones, the active tab follows the URL.
 * Used by the Owner Console and the Developer panel.
 */
export function TabNav({ items, className, label }: { items: TabNavItem[]; className?: string; label?: string }) {
  const path = usePathname();
  const active = (i: TabNavItem) => (i.exact ? path === i.href : path === i.href || path.startsWith(i.href + "/"));
  const current = [...items].sort((a, b) => b.href.length - a.href.length).find(active);
  return (
    <nav aria-label={label} className={cn("-mx-4 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0", className)}>
      <div className="inline-flex min-w-full gap-1 rounded-2xl border border-border/80 bg-card p-1 shadow-soft dark:border-white/10 sm:min-w-0">
        {items.map((i) => {
          const on = i === current;
          const Icon = i.icon;
          return (
            <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined} scroll={false}
              className={cn("flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition active:scale-[0.97]",
                on ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")}>
              {Icon ? <Icon className="h-4 w-4" /> : null}{i.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
