import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { createFormTicket } from "@/lib/form-guard";
import { getAccessSettings } from "@/lib/settings";
import { Alert, ButtonLink } from "@/components/ui";
import { AuthCard } from "../auth-card";
import { RegisterForm } from "./register-form";
import { Sticker } from "@/components/sticker";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT("auth.register"))("metaTitle") };
}

export default async function RegisterPage() {
  const [t, access] = await Promise.all([getT("auth.register"), getAccessSettings()]);
  if (!access.registrationOpen) {
    return (
      <AuthCard title={t("closedTitle")} subtitle={access.registrationClosedMessage || t("closedText")}>
        <div className="mb-4 flex justify-center"><Sticker name="zzz" size={72} /></div>
        <Alert>{t("closedHint")}</Alert>
        <ButtonLink href="/login" block className="mt-4">{t("closedLogin")}</ButtonLink>
      </AuthCard>
    );
  }
  return (
    <AuthCard wide title={t("title")} subtitle={t("subtitle")} hashtag={t("hashtag")}>
      <div className="mb-4 flex justify-center"><Sticker name="hatch" size={72} /></div>
      <RegisterForm ticket={createFormTicket()} />
    </AuthCard>
  );
}
