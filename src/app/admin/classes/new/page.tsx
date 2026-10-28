import { requireOwner } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { ClassForm } from "../../forms";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  return { title: (await getT("admin.classes"))("new") };
}

export default async function NewClassPage() {
  const { db } = await requireOwner();
  const t = await getT("admin.classes");
  const { data: classesData } = await db
    .from("classes")
    .select("id, title, class_type, target_year")
    .neq("class_type", "Combo")
    .eq("is_active", true)
    .order("target_year", { ascending: false })
    .order("title");
  const availableClasses = (classesData ?? []) as { id: string; title: string; class_type: string; target_year: number | null }[];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("new")} description={t("newText")} />
      <Card><CardContent className="pt-5 sm:pt-5"><ClassForm availableClasses={availableClasses} /></CardContent></Card>
    </div>
  );
}
