import { CalendarDays, ScanLine } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { asService } from "@/lib/db/pg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader, Table } from "@/components/ui/misc";
import { getFormat, getT } from "@/i18n/server";
import { Scanner, UndoCheckIn } from "./scanner";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: (await getT("admin.nav"))("attendance") };
}

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });

type Row = { student_id: string; scanned_at: string; method: "qr" | "manual"; full_name: string; sid: string | null; town: string; al_year: number | null; attempt: number; school: string | null };

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ day?: string; scan?: string }> }) {
  await requireAdmin();
  const { day: dayParam, scan } = await searchParams;
  const day = dayParam && /^\d{4}-\d{2}-\d{2}$/.test(dayParam) ? dayParam : today();
  const [t, tc, f] = await Promise.all([getT("admin.attendance"), getT("common"), getFormat()]);
  const rows = await asService(async (c) => (await c.query(
    `select a.student_id, a.scanned_at, a.method, p.full_name, p.student_id as sid, p.town, p.al_year, p.attempt, p.school
       from public.attendance a join public.profiles p on p.id = a.student_id
      where a.day = $1 order by a.scanned_at desc limit 1000`, [day])).rows as Row[]);
  const byTown = rows.reduce<Record<string, number>>((m, r) => ({ ...m, [r.town]: (m[r.town] ?? 0) + 1 }), {});
  const isToday = day === today();

  return (
    <div className="space-y-5">
      <PageHeader title={t("title")} description={t("subtitle")} icon={ScanLine} />
      <Scanner autoStart={scan === "1"} />

      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 border-b sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="h-4 w-4 text-teal-700" /> {isToday ? t("todayTitle") : t("dayTitle", { date: f.date(day) })}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground" data-testid="attendance-count">
              {t("count", { n: rows.length })}
              {Object.keys(byTown).length > 0 && <> · {Object.entries(byTown).map(([k, n]) => `${tc(`towns.${k}`)} ${n}`).join(" · ")}</>}
            </p>
          </div>
          <form className="flex gap-2">
            <Input type="date" name="day" defaultValue={day} max={today()} className="h-9 w-[160px]" aria-label={t("pickDay")} />
            <button className={buttonVariants({ variant: "outline", size: "sm" })}>{t("show")}</button>
          </form>
        </CardHeader>
        <CardContent className="pt-4 sm:pt-4">
          {rows.length ? (
            <Table>
              <thead><tr><th>{t("cols.time")}</th><th>{t("cols.student")}</th><th>{t("cols.batch")}</th><th>{t("cols.center")}</th><th>{t("cols.method")}</th><th /></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.student_id}>
                    <td className="whitespace-nowrap font-mono text-xs">{f.time(r.scanned_at)}</td>
                    <td>
                      <p className="font-medium">{r.full_name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{r.sid ?? tc("dash")}{r.school ? ` · ${r.school}` : ""}</p>
                    </td>
                    <td className="whitespace-nowrap text-xs">{r.al_year ?? tc("dash")} · {tc(`attempts.${r.attempt ?? 1}`)}</td>
                    <td className="text-xs">{tc(`towns.${r.town}`)}</td>
                    <td className="text-xs">{t(`method.${r.method}`)}</td>
                    <td className="text-right"><UndoCheckIn studentId={r.student_id} day={day} label={t("undo")} confirmText={t("undoConfirm", { name: r.full_name })} /></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : <p className="py-6 text-center text-sm text-muted-foreground">{t("empty")}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
