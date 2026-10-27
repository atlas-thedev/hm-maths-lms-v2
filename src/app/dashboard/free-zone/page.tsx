import Link from "next/link";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { PlayCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Badge, Card, EmptyState, PageHeader, cardVariants } from "@/components/ui";
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
  const { data: lessons } = ids.length
    ? await db.from("lessons").select("*").in("class_id", ids).order("month", { ascending: false }).order("week_number").order("sort_order")
    : { data: [] };

  return (
    <div>
      <PageHeader title={t("title")} description={t("subtitle")} />
      {!classes?.length ? (
        <EmptyState icon={PlayCircle} title={t("empty")} description={t("emptyText")} />
      ) : (
        <div className="space-y-5">
          {(classes as ClassRow[]).map((c) => {
            const ls = ((lessons ?? []) as Lesson[]).filter((l) => l.class_id === c.id);
            return (
              <Card key={c.id} padding="md">
                <div className="mb-4 flex items-center gap-2">
                  <h2 className="font-display text-lg font-semibold">{c.title}</h2><Badge>{tc(`classTypes.${c.class_type}`)}</Badge>
                </div>
                {ls.length ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {ls.map((l) => {
                      const id = youtubeId(l.youtube_url);
                      return (
                        <Link key={l.id} href={`/dashboard/classes/${c.id}/lessons/${l.id}`} className={cn(cardVariants({ variant: "interactive" }), "group overflow-hidden")}>
                          <div className="relative aspect-video bg-muted">
                            {id && <Image src={youtubeThumb(id)} alt="" fill sizes="400px" className="object-cover" />}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"><PlayCircle className="h-12 w-12 text-white" /></div>
                          </div>
                          <div className="p-4">
                            <p className="font-semibold group-hover:text-primary">{l.title}</p>
                            <p className="text-xs text-muted-foreground">{f.month(l.month)} · {t("week", { n: l.week_number })}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : <p className="text-sm text-muted-foreground">{t("soon")}</p>}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
