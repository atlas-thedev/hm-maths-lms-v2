import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { getT } from "@/i18n/server";

export default async function AccountIssuePage() {
  const t = await getT("common.accountIssue");
  return (
    <main className="container flex min-h-dvh max-w-md flex-col justify-center gap-4">
      <h1 className="font-display text-2xl font-bold">{t("title")}</h1>
      <Alert variant="error">{t("text")}</Alert>
      <p className="text-sm text-muted-foreground">{t("admin")}</p>
      <p className="text-sm text-muted-foreground">{t("student")}</p>
      <form action="/auth/logout" method="post"><Button type="submit" variant="outline" className="w-full">{t("logout")}</Button></form>
    </main>
  );
}
