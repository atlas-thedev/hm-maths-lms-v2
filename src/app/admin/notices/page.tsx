import { requireAdmin } from "@/lib/auth";
import { NoticeTagBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle, PageHeader, cardVariants } from "@/components/ui";
import type { Notice } from "@/lib/types";
import { getFormat, getT } from "@/i18n/server";
import { NoticeForm, NoticeRowActions } from "../forms";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  return { title: (await getT("admin.nav"))("notices") };
}

export default async function AdminNoticesPage() {
  const { db } = await requireAdmin();
  const [t, f] = await Promise.all([getT("admin.notices"), getFormat()]);
  const [{ data }, { data: classes }] = await Promise.all([
    db.from("notices").select("*").order("is_pinned", { ascending: false }).order("created_at", { ascending: false }).limit(100),
    db.from("classes").select("id, title").order("title"),
  ]);
  const notices = (data ?? []) as Notice[];
  const cname = new Map((classes ?? []).map((c) => [c.id, c.title]));
  return (
    <div>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
        <Card className="lg:sticky lg:top-6 lg:self-start"><CardHeader><CardTitle className="text-base">{t("new")}</CardTitle></CardHeader><CardContent><NoticeForm classes={classes ?? []} /></CardContent></Card>
        <div className="space-y-3">
          {notices.map((n) => (
            <div key={n.id} className={cn(cardVariants(), "p-4")}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <NoticeTagBadge tag={n.tag} />{n.is_pinned && <span>📌 {t("pinned")}</span>}
                    <span>{n.class_id ? cname.get(n.class_id) : t("allStudents")}{n.target_year ? ` · ${t("batch", { year: n.target_year })}` : ""}</span>
                    <span>· {f.dateTime(n.created_at)}</span>
                  </div>
                  <p className="mt-1.5 font-semibold">{n.title}</p>
                  <p className="whitespace-pre-line text-sm text-muted-foreground">{n.content}</p>
                </div>
                <NoticeRowActions id={n.id} pinned={n.is_pinned} />
              </div>
            </div>
          ))}
          {!notices.length && <p className="rounded-2xl bg-card p-8 text-center text-sm text-muted-foreground">{t("empty")}</p>}
        </div>
      </div>
    </div>
  );
}
