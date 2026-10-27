import { requireOwner } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { PageHeader } from "@/components/ui";
import { OwnerTabs } from "./owner-tabs";

export async function generateMetadata() {
  return { title: (await getT("admin.nav"))("owner") };
}

/** Owner Console: one header + tabs, each tab is its own page. */
export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  await requireOwner();
  const t = await getT("admin.owner");
  return (
    <div className="space-y-5">
      <PageHeader title={t("title")} description={t("subtitle")} sticker="teacher" className="mb-0" />
      <OwnerTabs />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
