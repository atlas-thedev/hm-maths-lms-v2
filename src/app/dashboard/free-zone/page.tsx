import { PlayCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { RecordingGrid, type RecordingItem } from "@/components/recording-grid";
import type { ClassRow, Lesson } from "@/lib/types";
import { youtubeId, youtubeThumb } from "@/lib/youtube";
import { getFormat, getT } from "@/i18n/server";

export async function generateMetadata() {
  return { title: (await getT("portal.nav"))("free") };
}

export default async function FreeZonePage() {
  const { db } = await requireUser();
  const [t, tc, f] = await Promise.all([getT("portal.free"), getT("common"), getFormat()]);
  const { data: classes } = await db.from("classes").select("*").eq("is_free", true).eq("is_active", true).order("created_at", { ascending: false });
  const ids = (classes ?? []).map((c) => c.id);
  // Newest month and week first.
  const { data: lessons } = ids.length
    ? await db.from("lessons").select("*").in("class_id", ids).order("month", { ascending: false }).order("week_number", { ascending: false }).order("sort_order", { ascending: false })
    : { data: [] };
  const weekAgo = Date.now() - 7 * 86_400_000;

  return (
    <div>
      <PageHeader title={t("title")} description={t("subtitle")} />
      {!classes?.length ? (
        <EmptyState icon={PlayCircle} title={t("empty")} description={t("emptyText")} />
      ) : (
        <div className="space-y-5">
          {(classes as ClassRow[]).map((c) => {
            const ls = ((lessons ?? []) as Lesson[]).filter((l) => l.class_id === c.id);
            const items: RecordingItem[] = ls.map((l) => {
              const id = youtubeId(l.youtube_url);
              return {
                id: l.id, href: `/dashboard/classes/${c.id}/lessons/${l.id}`, title: l.title, description: l.description,
                week: l.week_number, tag: `${f.month(l.month)} · ${t("week", { n: l.week_number })}`, thumb: id ? youtubeThumb(id) : null,
                date: f.date(l.live_start_time ?? l.created_at), isNew: new Date(l.live_start_time ?? l.created_at).getTime() > weekAgo,
              };
            });
            return (
              <Card key={c.id} padding="md">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-lg font-semibold">{c.title}</h2><Badge>{tc(`classTypes.${c.class_type}`)}</Badge>
                  <span className="rounded-full bg-muted px-2 text-xs font-bold tabular-nums text-muted-foreground">{ls.length}</span>
                </div>
                {/* Lessons here span several months, so no week filter. */}
                {items.length ? <RecordingGrid items={items} filter={false} /> : <p className="text-sm text-muted-foreground">{t("soon")}</p>}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
