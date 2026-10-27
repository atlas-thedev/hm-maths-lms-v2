import { HelpCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/misc";
import { Faq } from "@/components/landing/faq";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  return { title: (await getT("portal.nav"))("faq") };
}

export default async function FaqPage() {
  await requireUser();
  const t = await getT("portal.faqPage");
  return (
    <div>
      <PageHeader title={t("title")} description={t("subtitle")} icon={HelpCircle} sticker="question" />
      <Faq bare />
    </div>
  );
}
