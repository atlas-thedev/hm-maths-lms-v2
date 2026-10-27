import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, PageHeader, Table } from "@/components/ui/misc";
import type { Exam } from "@/lib/types";
import { getFormat, getT } from "@/i18n/server";

export async function generateMetadata() {
  return { title: (await getT("admin.nav"))("exams") };
}

export default async function AdminExamsPage() {
  const { db } = await requireAdmin();
  const [t, tc, f] = await Promise.all([getT("admin.exams"), getT("common"), getFormat()]);
  const { data } = await db.from("exams").select("*, classes(title), exam_submissions(count)").order("created_at", { ascending: false });
  const exams = (data ?? []) as (Exam & { classes: { title: string } | null; exam_submissions: { count: number }[] })[];
  return (
    <div>
      <PageHeader title={t("title")} description={t("subtitle")}>
        <Link href="/admin/exams/new" className={buttonVariants()}><Plus /> {t("new")}</Link>
      </PageHeader>
      {!exams.length ? <EmptyState icon={ClipboardList} title={t("empty")} /> : (
        <Table>
          <thead><tr><th>{t("cols.paper")}</th><th>{t("cols.class")}</th><th>{t("cols.type")}</th><th>{t("cols.questions")}</th><th>{t("cols.submissions")}</th><th>{t("cols.status")}</th><th>{t("cols.created")}</th></tr></thead>
          <tbody>
            {exams.map((e) => (
              <tr key={e.id}>
                <td><Link href={`/admin/exams/${e.id}`} className="font-medium text-primary hover:underline">{e.title}</Link></td>
                <td>{e.classes?.title}</td>
                <td><Badge variant="secondary">{tc(`examTypes.${e.exam_type}`)}</Badge></td>
                <td>{e.exam_type === "mcq" ? e.total_questions : tc("dash")}</td>
                <td>{e.exam_submissions?.[0]?.count ?? 0}</td>
                <td>{e.is_published ? <Badge variant="success">{t("published")}</Badge> : <Badge variant="secondary">{t("draft")}</Badge>}</td>
                <td className="text-xs text-muted-foreground">{f.date(e.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
