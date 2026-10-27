import Link from "next/link";
import { ClipboardList, FileText, Timer, Trophy } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import type { Exam, ExamSubmission } from "@/lib/types";
import { getFormat, getT } from "@/i18n/server";

export async function generateMetadata() {
  return { title: (await getT("portal.nav"))("exams") };
}

export default async function ExamsPage() {
  const { db, user } = await requireUser();
  const [t, f] = await Promise.all([getT("portal.exams"), getFormat()]);
  const [{ data: exams }, { data: subs }] = await Promise.all([
    db.from("exams").select("*, classes(title)").eq("is_published", true).order("created_at", { ascending: false }),
    db.from("exam_submissions").select("*").eq("student_id", user.id),
  ]);
  const byExam = new Map(((subs ?? []) as ExamSubmission[]).map((s) => [s.exam_id, s]));
  const list = (exams ?? []) as (Exam & { classes: { title: string } | null })[];

  return (
    <div>
      <PageHeader title={t("title")} description={t("subtitle")} />
      {!list.length ? (
        <EmptyState icon={ClipboardList} title={t("empty")} description={t("emptyText")} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {list.map((e) => {
            const s = byExam.get(e.id);
            const done = s && s.status !== "in_progress";
            const closed = e.closes_at && new Date(e.closes_at) < new Date();
            return (
              <div key={e.id} className="flex flex-col rounded-2xl bg-card p-5 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant={e.exam_type === "mcq" ? "default" : "secondary"}>{e.exam_type === "mcq" ? t("mcq") : t("structured")}</Badge>
                      {s && <StatusBadge status={s.status} />}
                    </div>
                    <h3 className="mt-2 font-display font-semibold">{e.title}</h3>
                    <p className="text-xs text-muted-foreground">{e.classes?.title}</p>
                  </div>
                  {done && s.score !== null && (
                    <div className="text-right"><p className="font-display text-2xl font-bold text-primary">{Number(s.score)}</p><p className="text-xs text-muted-foreground">{t("of", { total: Number(s.total_marks) })}</p></div>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {e.exam_type === "mcq" ? <span className="flex items-center gap-1"><Timer className="h-3.5 w-3.5" />{t("meta", { min: e.duration_minutes, n: e.total_questions })}</span>
                    : <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{t("uploadSheets")}</span>}
                  {e.closes_at && <span>{t("closes", { date: f.dateTime(e.closes_at) })}</span>}
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                  {done ? (
                    <>
                      {e.exam_type === "mcq" && <Link href={`/dashboard/exams/${e.id}/review`} className={buttonVariants({ size: "sm" })}>{t("review")}</Link>}
                      {e.exam_type === "structured" && <Link href={`/dashboard/exams/${e.id}`} className={buttonVariants({ size: "sm", variant: "outline" })}>{t("viewSubmission")}</Link>}
                      <Link href={`/dashboard/exams/${e.id}/leaderboard`} className={buttonVariants({ size: "sm", variant: "outline" })}><Trophy /> {t("leaderboard")}</Link>
                    </>
                  ) : closed && !s ? (
                    <span className="text-sm text-muted-foreground">{t("closed")}</span>
                  ) : (
                    <Link href={`/dashboard/exams/${e.id}`} className={buttonVariants({ size: "sm" })}>{s ? t("continue") : e.exam_type === "mcq" ? t("start") : t("open")}</Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
