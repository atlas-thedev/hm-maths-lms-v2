import * as React from "react";
import { cn } from "@/lib/utils";
import { LoadingLabel } from "./loading-label";

/**
 * Loading placeholders. Each page has a `loading.tsx` that shows one of these while its data loads,
 * so the screen keeps its shape instead of going blank. Presets: <PageSkeleton kind="…" />.
 */
export function Skeleton({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn("skeleton", className)} {...p} />;
}

const card = "rounded-2xl border border-border/80 bg-card shadow-soft dark:border-white/10";

export function SkeletonHeader({ withButton }: { withButton?: boolean }) {
  return (
    <div className="mb-6 flex items-start gap-3.5">
      <Skeleton className="h-14 w-14 shrink-0 rounded-2xl" />
      <div className="min-w-0 flex-1 space-y-2.5 pt-1">
        <Skeleton className="h-6 w-2/3 max-w-xs" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      {withButton ? <Skeleton className="hidden h-10 w-28 sm:block" /> : null}
    </div>
  );
}

export function SkeletonStats({ n = 4 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className={cn(card, "p-4 sm:p-5")}>
          <div className="flex items-start justify-between gap-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-9 w-9 rounded-xl" /></div>
          <Skeleton className="mt-3 h-7 w-24" />
          <Skeleton className="mt-2 h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonRows({ n = 4, avatar = true, className }: { n?: number; avatar?: boolean; className?: string }) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border border-border/70 p-3 dark:border-white/10">
          {avatar ? <Skeleton className="h-10 w-10 shrink-0 rounded-xl" /> : null}
          <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-4 w-3/5" /><Skeleton className="h-3 w-4/5" /></div>
          <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard({ title = true, rows = 3, className }: { title?: boolean; rows?: number; className?: string }) {
  return (
    <div className={cn(card, "p-4 sm:p-5", className)}>
      {title ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5"><Skeleton className="h-7 w-7 rounded-lg" /><Skeleton className="h-5 w-36" /></div>
          <Skeleton className="h-8 w-20" />
        </div>
      ) : null}
      <SkeletonRows n={rows} />
    </div>
  );
}

/** Class / product cards (poster on top, text below). */
export function SkeletonGrid({ n = 4, className }: { n?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className={cn(card, "overflow-hidden")}>
          <Skeleton className="aspect-[16/8] w-full rounded-none" />
          <div className="space-y-2.5 p-4"><Skeleton className="h-5 w-4/5" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-2/3" />
            <div className="flex items-center justify-between pt-2"><Skeleton className="h-5 w-24" /><Skeleton className="h-8 w-20" /></div></div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonChips({ n = 5 }: { n?: number }) {
  return <div className="flex gap-2 overflow-hidden">{Array.from({ length: n }).map((_, i) => <Skeleton key={i} className="h-9 w-20 shrink-0 rounded-full sm:w-24" />)}</div>;
}

export function SkeletonHero({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-3xl border border-border/80 bg-card p-5 shadow-soft sm:p-8 dark:border-white/10", className)}>
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-3 h-8 w-3/4 max-w-sm" />
      <Skeleton className="mt-3 h-4 w-full max-w-md" />
      <div className="mt-5 flex flex-wrap gap-2"><Skeleton className="h-10 w-44 rounded-2xl" /><Skeleton className="h-8 w-24 rounded-full" /><Skeleton className="h-8 w-24 rounded-full" /></div>
    </div>
  );
}

export function SkeletonForm({ fields = 5 }: { fields?: number }) {
  return (
    <div className={cn(card, "space-y-5 p-4 sm:p-5")}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-11 w-full" /></div>
      ))}
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className={cn(card, "p-4 sm:p-5")}>
      <Skeleton className="mb-4 h-5 w-40" />
      <div className="flex h-44 items-end gap-3 px-2">{[55, 80, 40, 90, 65, 75].map((h, i) => <Skeleton key={i} className="flex-1 rounded-t-lg rounded-b-none" style={{ height: `${h}%` }} />)}</div>
    </div>
  );
}

type Kind = "list" | "grid" | "stats" | "dashboard" | "detail" | "form" | "board" | "overview";

/** Whole-page skeleton presets, matched to the page layouts. Put one in a route's `loading.tsx`. */
export function PageSkeleton({ kind = "list", header = true }: { kind?: Kind; header?: boolean }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="min-w-0 space-y-5">
      <LoadingLabel />
      {header && kind !== "dashboard" ? <SkeletonHeader withButton={kind === "list" || kind === "grid"} /> : null}
      {kind === "dashboard" && (
        <>
          <SkeletonHero />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <div key={i} className={cn(card, "space-y-3 p-4")}><Skeleton className="h-12 w-12 rounded-2xl" /><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-28" /></div>)}
          </div>
          <SkeletonCard rows={3} />
          <SkeletonChart />
        </>
      )}
      {kind === "overview" && (<><SkeletonStats /><SkeletonCard rows={4} /><div className="grid gap-5 xl:grid-cols-2"><SkeletonCard rows={3} /><SkeletonCard rows={3} /></div></>)}
      {kind === "stats" && (<><SkeletonStats /><SkeletonChart /><SkeletonCard rows={3} /></>)}
      {kind === "list" && (<><SkeletonChips /><SkeletonRows n={6} /></>)}
      {kind === "grid" && (<><SkeletonChips /><SkeletonGrid n={6} /></>)}
      {kind === "detail" && (<><SkeletonHero /><SkeletonStats n={2} /><SkeletonCard rows={4} /></>)}
      {kind === "form" && <SkeletonForm />}
      {kind === "board" && (<><SkeletonChips n={4} /><div className="grid grid-cols-3 items-end gap-3 px-2">{[70, 100, 55].map((h, i) => <div key={i} className="flex flex-col items-center gap-2"><Skeleton className="h-14 w-14 rounded-full" /><Skeleton className="h-3 w-16" /><Skeleton className="w-full rounded-b-none" style={{ height: `${h}px` }} /></div>)}</div><SkeletonRows n={5} /></>)}
    </div>
  );
}
