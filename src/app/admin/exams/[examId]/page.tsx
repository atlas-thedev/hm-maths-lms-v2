import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { isOwnerRole, requireAdmin } from "@/lib/auth";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle, Table, buttonVariants, cardVariants } from "@/components/ui";
import type { Exam, ExamQuestion } from "@/lib/types";
import { getFormat, getT } from "@/i18n/server";
import { DeleteButton, ExamForm, GradeForm, QuestionForm } from "../../forms";
import { deleteExamAction, deleteQuestionAction } from "../../actions";
import { cn } from "@/lib/utils";

type Sub = { id: string; score: number | null; total_marks: number | null; status: string; is_late: boolean; feedback: string | null; submitted_at: string | null; answer_sheet_urls: string[];
  profiles: { full_name: string; student_id: string | null; town: string } | null };

export default async function AdminExamPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const { db, profile } = await requireAdmin();
  const isOwner = isOwnerRole(profile.role);
  const [t, tc, f] = await Promise.all([getT("admin.exam"), getT("common"), getFormat()]);
  const [{ data: exam }, { data: classes }, { data: questions }, { data: subs }] = await Promise.all([
    db.from("exams").select("*").eq("id", examId).maybeSingle(),
    db.from("classes").select("id, title").order("title"),
    db.from("exam_questions").select("*").eq("exam_id", examId).order("sort_order").order("created_at"),
    db.from("exam_submissions").select("id, score, total_marks, status, is_late, feedback, submitted_at, answer_sheet_urls, profiles(full_name, student_id, town)")
      .eq("exam_id", examId).order("score", { ascending: false, nullsFirst: false }),
  ]);
  if (!exam) notFound();
  const e = exam as Exam;
  const qs = (questions ?? []) as ExamQuestion[];
  const submissions = (subs ?? []) as unknown as Sub[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/exams" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />{t("back")}</Link>
        {isOwner && <DeleteButton action={deleteExamAction} id={examId} label={t("delete")} confirm={t("deleteConfirm")} />}
      </div>
      <h1 className="font-display text-2xl font-bold">{e.title}</h1>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-base">{t("settings")}</CardTitle></CardHeader><CardContent><ExamForm exam={e} classes={classes ?? []} /></CardContent></Card>
        {e.exam_type === "mcq" && (
          <Card><CardHeader><CardTitle className="text-base">{t("addQuestion")}</CardTitle></CardHeader><CardContent><QuestionForm examId={examId} /></CardContent></Card>
        )}
      </div>

      {e.exam_type === "mcq" && (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">{t("questions", { n: qs.length })}</h2>
          <div className="space-y-2">
            {qs.map((q, i) => (
              <div key={q.id} className={cn(cardVariants(), "flex gap-3 p-4")}>
                <span className="font-mono text-sm text-muted-foreground">{t("q", { n: i + 1 })}</span>
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-line font-medium">{q.question_text}</p>
                  <ol className="mt-2 grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                    {q.options_json.map((o, j) => <li key={j} className={j === q.correct_answer ? "font-semibold text-success-soft-foreground" : "text-muted-foreground"}>{j + 1}. {o}{j === q.correct_answer && " ✓"}</li>)}
                  </ol>
                  <p className="mt-1 text-xs text-muted-foreground">{t("marks", { n: Number(q.marks) })}{q.explanation ? ` · ${q.explanation}` : ""}</p>
                </div>
                <DeleteButton action={deleteQuestionAction} id={q.id} size="icon" confirm={t("deleteQuestion")} />
              </div>
            ))}
            {!qs.length && <p className="text-sm text-muted-foreground">{t("noQuestions")}</p>}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">{t("submissions", { n: submissions.length })}</h2>
        <Table>
          <thead><tr><th>{t("cols.student")}</th><th>{t("cols.status")}</th><th>{t("cols.submitted")}</th><th>{e.exam_type === "mcq" ? t("cols.score") : t("cols.sheets")}</th></tr></thead>
          <tbody>
            {submissions.map((s) => (
              <tr key={s.id}>
                <td><p className="font-medium">{s.profiles?.full_name}</p><p className="font-mono text-xs text-muted-foreground">{s.profiles?.student_id} · {s.profiles?.town ? tc(`towns.${s.profiles.town}`) : ""}</p></td>
                <td><StatusBadge status={s.status} />{s.is_late && <span className="ml-1 text-xs text-warning">{t("late")}</span>}</td>
                <td className="text-xs text-muted-foreground">{f.dateTime(s.submitted_at)}</td>
                <td>
                  {e.exam_type === "mcq" ? (s.score !== null ? <b>{Number(s.score)} / {Number(s.total_marks)}</b> : tc("dash")) : (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {s.answer_sheet_urls.map((p, i) => <a key={p} href={`/api/files/answer-sheets?path=${encodeURIComponent(p)}`} target="_blank" className={buttonVariants({ size: "sm", variant: "secondary" })}><FileText />{t("page", { n: i + 1 })}</a>)}
                      </div>
                      <GradeForm id={s.id} score={s.score} total={s.total_marks} feedback={s.feedback} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!submissions.length && <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">{t("noSubmissions")}</td></tr>}
          </tbody>
        </Table>
      </section>
    </div>
  );
}
