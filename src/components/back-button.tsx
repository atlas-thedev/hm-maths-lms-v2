"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/** Goes back in history; falls back to `fallback` when the page was opened directly. */
export function BackButton({ label, fallback, className }: { label: string; fallback: string; className?: string }) {
  const router = useRouter();
  const back = () => {
    if (window.history.length > 1 && document.referrer.startsWith(window.location.origin)) router.back();
    else router.push(fallback);
  };
  return (
    <button type="button" onClick={back} data-testid="notifications-back-button"
      className={cn("inline-flex min-h-11 items-center gap-2 rounded-xl border border-border/80 bg-card px-4 py-2 text-sm font-semibold text-foreground/80 shadow-soft transition-colors hover:border-primary/30 hover:text-foreground", className)}>
      <ArrowLeft className="h-4 w-4" /> {label}
    </button>
  );
}
