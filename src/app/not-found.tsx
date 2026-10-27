import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getT } from "@/i18n/server";

export default async function NotFound() {
  const t = await getT("common.notFound");
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-mesh bg-background p-6 text-center">
      <p className="text-gradient font-display text-8xl font-black">404</p>
      <h1 className="font-display text-xl font-bold">{t("title")}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{t("text")}</p>
      <Link href="/" className={buttonVariants({ variant: "orange", className: "mt-3 px-6" })}>{t("home")}</Link>
    </main>
  );
}
