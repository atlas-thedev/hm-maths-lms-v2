import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, QrCode } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { Card, CardContent, CardHeader, PageHeader, buttonVariants } from "@/components/ui";
import { StudentIdCard } from "@/components/student-id-card";
import { qrSvg } from "@/lib/qr";
import { getT } from "@/i18n/server";
import type { Profile } from "@/lib/types";
import { PrintButton } from "./print-button";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata() {
  return { title: (await getT("admin.students"))("qrTitle") };
}

export default async function StudentQrPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  if (!UUID.test(studentId)) notFound();
  const { db } = await requireAdmin();
  const [t, tc] = await Promise.all([getT("admin.students"), getT("common")]);
  const { data } = await db.from("profiles").select("*").eq("id", studentId).maybeSingle();
  const student = data as Profile | null;
  if (!student || student.role !== "student") notFound();

  const [avatar, qr] = await Promise.all([
    student.avatar_path ? db.storage.from("avatars").createSignedUrl(student.avatar_path, 3600) : null,
    qrSvg(student.id),
  ]);
  const meta = [tc(`attempts.${student.attempt ?? 1}`), student.al_year ? tc("alBatch", { year: student.al_year }) : null].filter(Boolean).join(" · ");

  return (
    <div className="space-y-5">
      <PageHeader title={t("qrTitle")} description={t("qrPageHint")} icon={QrCode}>
        <Link href="/admin/students" className={buttonVariants({ variant: "outline" })}><ArrowLeft /> {t("qrBack")}</Link>
        <PrintButton label={t("qrPrint")} />
      </PageHeader>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2" data-print>
        <StudentIdCard profile={student} photoUrl={avatar?.data?.signedUrl ?? null} />

        <Card>
          <CardHeader icon={QrCode} title={t("qrTitle")} description={t("qrPageHint")} />
          <CardContent>
            <div className="force-light mx-auto max-w-[280px] rounded-2xl border bg-white p-4 text-center text-ink shadow-sm">
              <div className="mx-auto aspect-square w-full [&>svg]:h-full [&>svg]:w-full" role="img" aria-label={t("qrTitle")} dangerouslySetInnerHTML={{ __html: qr }} />
              <p className="mt-3 truncate font-display text-base font-bold">{student.full_name}</p>
              {student.student_id && <p className="font-mono text-sm font-semibold tracking-wider text-primary">{student.student_id}</p>}
              <p className="mt-1 text-xs font-medium text-slate-600">{meta}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
