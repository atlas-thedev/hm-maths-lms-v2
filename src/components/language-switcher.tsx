"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { setLocaleAction } from "@/i18n/actions";
import { useLocale } from "@/i18n/client";
import { LOCALES, LOCALE_LABELS } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";

export function LanguageSwitcher({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  const locale = useLocale();
  const router = useRouter();
  const t = useT("common.language");
  const [pending, start] = useTransition();
  const next = LOCALES[(LOCALES.indexOf(locale) + 1) % LOCALES.length];
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => { await setLocaleAction(next); router.refresh(); })}
      className={cn("inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition disabled:opacity-60",
        tone === "dark" ? "text-white/90 hover:bg-white/10 hover:text-white" : "text-foreground/70 hover:bg-accent hover:text-foreground", className)}
      aria-label={t("switchTo", { lang: LOCALE_LABELS[next] })}
    >
      <Languages className="h-4 w-4" /> {LOCALE_LABELS[next]}
    </button>
  );
}
