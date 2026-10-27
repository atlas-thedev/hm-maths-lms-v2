import Link from "next/link";
import { isOwnerRole, requireAdmin } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, PageHeader } from "@/components/ui/misc";
import { ExamForm } from "../../forms";
import { getT } from "@/i18n/server";

export default async function NewExamPage() {
  const { db, profile } = await requireAdmin();
  const t = await getT("admin.exams");
  const { data: classes } = await db.from("classes").select("id, title").order("title");
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("new")} />
      {classes?.length ? <Card><CardContent className="pt-5 sm:pt-5"><ExamForm classes={classes} /></CardContent></Card> :
        <Alert>{t("needClass")} {isOwnerRole(profile.role) && <Link href="/admin/classes/new" className={buttonVariants({ variant: "link", size: "sm" })}>{t("newClass")}</Link>}</Alert>}
    </div>
  );
}
