import Link from "next/link";
import { ArrowLeft, Medal, Trophy } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Alert, EmptyState, Table } from "@/components/ui/misc";
import { getT } from "@/i18n/server";
import { dbError } from "@/i18n/translate";
import { cn } from "@/lib/utils";

type Row = { rank: number; full_name: string; student_id: string | null; town: string; score: number; total_marks: number; is_me: boolean };

export default async function LeaderboardPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const { db } = await requireUser();
  const [t, tc, tr] = await Promise.all([getT("portal.leaderboard"), getT("common"), getT()]);
  const [{ data, error }, { data: exam }] = await Promise.all([
    db.rpc("get_leaderboard", { p_exam: examId }),
    db.from("exams").select("title").eq("id", examId).maybeSingle(),
  ]);
  const back = <Link href="/dashboard/exams" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-primary"><ArrowLeft className="h-4 w-4" />{t("back")}</Link>;
  if (error) return <div className="space-y-4">{back}<Alert variant="error">{dbError(tr, error.message)}</Alert></div>;
  const rows = (data ?? []) as Row[];
  const me = rows.find((r) => r.is_me);
  const medal = ["text-warning-soft-foreground", "text-slate-500", "text-warning-soft-foreground"];

  return (
    <div className="space-y-6">
      {back}
      <div className="ph flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="font-display text-2xl font-bold">{t("title")}</h1><p className="text-sm text-muted-foreground">{t("subtitle", { title: exam?.title ?? "", n: rows.length })}</p></div>
        {me && <div className="rounded-2xl bg-card px-5 py-3 text-center"><p className="text-xs text-muted-foreground">{t("yourRank")}</p><p className="font-display text-3xl font-bold text-primary">#{me.rank}</p></div>}
      </div>
      {!rows.length ? <EmptyState icon={Trophy} title={t("empty")} /> : (
        <Table>
          <thead><tr><th className="w-16">{t("rank")}</th><th>{t("student")}</th><th>{t("center")}</th><th className="text-right">{t("marks")}</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.student_id}-${r.rank}-${r.full_name}`} className={cn(r.is_me && "bg-primary/10 font-semibold")}>
                <td>{r.rank <= 3 ? <Medal className={cn("h-5 w-5", medal[r.rank - 1])} /> : <span className="font-mono">#{r.rank}</span>}</td>
                <td><p>{r.full_name}{r.is_me && ` ${t("you")}`}</p><p className="font-mono text-xs text-muted-foreground">{r.student_id}</p></td>
                <td className="text-muted-foreground">{tc(`towns.${r.town}`)}</td>
                <td className="text-right font-display font-bold">{Number(r.score)} <span className="text-xs font-normal text-muted-foreground">/ {Number(r.total_marks)}</span></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
