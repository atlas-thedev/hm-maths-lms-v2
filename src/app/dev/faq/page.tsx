import { requireDeveloper } from "@/lib/auth";
import { getFaqs } from "@/lib/settings";
import { PageHeader } from "@/components/ui";
import { FaqForm } from "./faq-form";

export const metadata = { title: "Frequently asked questions (FAQ)" };
export const dynamic = "force-dynamic";

export default async function DevFaqPage() {
  await requireDeveloper();
  const faqs = await getFaqs();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Frequently asked questions (FAQ)"
        sticker="question"
        description="Add, edit, translate and reorder FAQs shown on the public home page and inside the student dashboard. Questions can be in English, Sinhala, or both."
      />
      <div className="max-w-4xl">
        <FaqForm initial={faqs} />
      </div>
    </div>
  );
}
