import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { getSiteData } from "@/lib/settings";
import { AuthCard } from "../auth-card";
import { ForgotHelp } from "./forgot-help";
import { Sticker } from "@/components/sticker";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT("auth.forgot"))("metaTitle") };
}

/** No e-mail / SMS codes: the student messages an admin, who resets the password from Admin → Students. */
export default async function ForgotPasswordPage() {
  const SITE = await getSiteData();
  const t = await getT("auth.forgot");
  return (
    <AuthCard title={t("title")} subtitle={t("subtitle")}>
      <div className="mb-3 flex justify-center sm:mb-4"><Sticker name="detective" size={56} /></div>
      <ForgotHelp whatsapp={SITE.contact.whatsapp} phone={SITE.contact.phone} />
    </AuthCard>
  );
}
