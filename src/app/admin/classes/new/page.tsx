import { requireOwner } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { ClassForm } from "../../forms";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  return { title: (await getT("admin.classes"))("new") };
}

export default async function NewClassPage() {
  await requireOwner();
  const t = await getT("admin.classes");
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("new")} description={t("newText")} />
      <Card><CardContent className="pt-5 sm:pt-5"><ClassForm /></CardContent></Card>
    </div>
  );
}
