"use client";
import { startTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { useT } from "@/i18n/client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT("common.error");
  const router = useRouter();
  // reset() alone only re-renders the client tree; refresh first so the server parts are fetched again.
  const retry = () => startTransition(() => { router.refresh(); reset(); });
  return (
    <main className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="font-display text-xl font-bold">{t("title")}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{t("text")}</p>
      {error.digest ? <p className="font-mono text-xs text-muted-foreground">{t("reference", { digest: error.digest })}</p> : null}
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Button onClick={retry}>{t("retry")}</Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>{t("home")}</Link>
      </div>
    </main>
  );
}
