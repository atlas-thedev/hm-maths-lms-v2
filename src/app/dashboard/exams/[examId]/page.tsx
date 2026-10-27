import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, FileText, Trophy } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/misc";
import type { Exam, ExamSubmission } from "@/lib/types";
import { getFormat, getT } from "@/i18n/server";
import { McqRunner } from "./mcq-runner";
import { StructuredForm } from "./structured-form";

export default async function ExamPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const { db, user } = await requireUser();
  const [t, f] = await Promise.all([getT("portal.exam"), getFormat()]);
  const { data } = await db.from("exams").select("*").eq("id", examId).maybeSingle();
  if (!data) notFound();
  const exam = data as Exam;
  const { data: sub } = await db.from("exam_submissions").select("*").eq("exam_id", examId).eq("student_id", user.id).maybeSingle();
  const s = sub as ExamSubmission | null;
  const back = <Link href="/dashboard/exams" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-primary"><ArrowLeft className="h-4 w-4" />{t("back")}</Link>;
  const notOpen = exam.opens_at && new Date(exam.opens_at) > new Date();
  const closed = exam.closes_at && new Date(exam.closes_at) < new Date();

  if (exam.exam_type === "mcq") {
    if (s && s.status !== "in_progress") {
      return (<div>{back}<Alert variant="success">{t("alreadySubmitted")} <Link className="font-semibold underline" href={`/dashboard/exams/${examId}/review`}>{t("reviewLink")}</Link></Alert></div>);
    }
    if (!s && notOpen) return <div>{back}<Alert>{t("opensOn", { date: f.dateTime(exam.opens_at) })}</Alert></div>;
    if (!s && closed) return <div>{back}<Alert variant="error">{t("closedOn", { date: f.dateTime(exam.closes_at) })}</Alert></div>;
    return <div>{back}<McqRunner examId={examId} title={exam.title} durationMinutes={exam.duration_minutes} totalQuestions={exam.total_questions} /></div>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      {back}
      <Card>
        <CardHeader>
          <CardTitle>{exam.title}</CardTitle>
          {exam.description && <p className="whitespace-pre-line text-sm text-muted-foreground">{exam.description}</p>}
          {exam.closes_at && <p className="text-xs text-muted-foreground">{t("deadline", { date: f.dateTime(exam.closes_at) })}</p>}
        </CardHeader>
        <CardContent className="space-y-6">
          {exam.paper_pdf_url ? (
            <a href={`/api/files/tute-pdfs?path=${encodeURIComponent(exam.paper_pdf_url)}&download=1`} className={buttonVariants({ variant: "outline", className: "w-full" })}>
              <Download /> {t("download")}
            </a>
          ) : <Alert>{t("paperSoon")}</Alert>}

          {s && s.status !== "in_progress" ? (
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between"><p className="font-semibold">{t("yourSubmission")}</p><StatusBadge status={s.status} /></div>
              <p className="text-xs text-muted-foreground">{t("submittedAt", { date: f.dateTime(s.submitted_at) })}</p>
              <div className="flex flex-wrap gap-2">
                {s.answer_sheet_urls.map((p, i) => (
                  <a key={p} href={`/api/files/answer-sheets?path=${encodeURIComponent(p)}`} target="_blank" className={buttonVariants({ size: "sm", variant: "secondary" })}><FileText /> {t("page", { n: i + 1 })}</a>
                ))}
              </div>
              {s.status === "graded" ? (
                <div className="rounded-lg bg-primary/5 p-4">
                  <p className="font-display text-3xl font-bold text-primary">{Number(s.score)} <span className="text-base text-muted-foreground">/ {Number(s.total_marks)}</span></p>
                  {s.feedback && <p className="mt-2 whitespace-pre-line text-sm">{s.feedback}</p>}
                  <Link href={`/dashboard/exams/${examId}/leaderboard`} className={buttonVariants({ size: "sm", className: "mt-3" })}><Trophy /> {t("leaderboard")}</Link>
                </div>
              ) : <p className="text-sm text-muted-foreground">{t("marking")}</p>}
            </div>
          ) : null}

          {(!s || s.status !== "graded") && !closed && (
            <div>
              <p className="mb-2 text-sm font-semibold">{s ? t("replace") : t("upload")}</p>
              <StructuredForm examId={examId} userId={user.id} />
            </div>
          )}
          {closed && !s && <Alert variant="error">{t("submissionsClosed")}</Alert>}
        </CardContent>
      </Card>
    </div>
  );
}
