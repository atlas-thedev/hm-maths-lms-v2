import { CalendarDays, Clock, ExternalLink, MapPin } from "lucide-react";
import { isOwnerRole, requireAdmin } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import type { EventRow } from "@/lib/types";
import { getFormat, getT } from "@/i18n/server";
import { cn } from "@/lib/utils";
import { EventForm, EventRowActions } from "../forms";

export async function generateMetadata() {
  return { title: (await getT("admin.nav"))("events") };
}

/** Seminars, paper days, exam dates, parent meetings… Students see published events for their class / batch. */
export default async function AdminEventsPage() {
  const { db, profile } = await requireAdmin();
  const [t, f] = await Promise.all([getT("admin.events"), getFormat()]);
  const [{ data }, { data: classes }] = await Promise.all([
    db.from("events").select("*").order("starts_at", { ascending: false }).limit(200),
    db.from("classes").select("id, title").order("title"),
  ]);
  const events = (data ?? []) as EventRow[];
  const cname = new Map((classes ?? []).map((c) => [c.id, c.title as string]));
  const now = Date.now();
  return (
    <div>
      <PageHeader title={t("title")} description={t("subtitle")} icon={CalendarDays} sticker="party" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[440px_1fr]">
        <Card className="lg:sticky lg:top-6 lg:self-start"><CardHeader><CardTitle className="text-base">{t("new")}</CardTitle></CardHeader><CardContent><EventForm classes={classes ?? []} /></CardContent></Card>
        <div className="space-y-3" data-testid="admin-events">
          {events.map((e) => {
            const past = new Date(e.ends_at ?? e.starts_at).getTime() < now;
            return (
              <div key={e.id} className={cn("rounded-2xl border border-border/80 bg-card p-4 shadow-soft", past && "opacity-70")}>
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {e.is_published ? <Badge variant="success">{t("published")}</Badge> : <Badge variant="secondary">{t("hidden")}</Badge>}
                      {past && <Badge variant="secondary">{t("past")}</Badge>}
                      <span>{e.class_id ? cname.get(e.class_id) ?? t("class") : t("everyone")}{e.target_year ? ` · ${t("batch", { year: e.target_year })}` : ""}</span>
                    </div>
                    <p className="font-semibold">{e.title}</p>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" />{f.dateTime(e.starts_at)}{e.ends_at ? ` – ${f.time(e.ends_at)}` : ""}</p>
                    {e.venue && <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{e.venue}</p>}
                    {e.online_url && <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground"><ExternalLink className="h-3.5 w-3.5 shrink-0" />{e.online_url}</p>}
                    {e.description && <p className="whitespace-pre-line pt-1 text-sm text-muted-foreground">{e.description}</p>}
                  </div>
                  <EventRowActions id={e.id} published={e.is_published} canDelete={isOwnerRole(profile.role)} />
                </div>
              </div>
            );
          })}
          {!events.length && <p className="rounded-2xl bg-card p-8 text-center text-sm text-muted-foreground">{t("empty")}</p>}
        </div>
      </div>
    </div>
  );
}
