import { ArrowUpRight, CalendarDays, Clock, ExternalLink, MapPin } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { DateTile } from "@/components/date-tile";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { getFormat, getT } from "@/i18n/server";
import { cn } from "@/lib/utils";
import type { EventRow } from "@/lib/types";

export async function generateMetadata() {
  return { title: (await getT("portal.nav"))("events") };
}

export default async function EventsPage() {
  const { db } = await requireUser();
  const [t, f] = await Promise.all([getT("portal.events"), getFormat()]);
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data } = await db.from("events").select("*").gte("starts_at", since).order("starts_at", { ascending: true }).limit(100);
  const events = (data ?? []) as EventRow[];
  const now = Date.now();
  const isPast = (e: EventRow) => new Date(e.ends_at ?? e.starts_at).getTime() < now - 3 * 3600000;
  const upcoming = events.filter((e) => !isPast(e));
  const past = events.filter(isPast).reverse();

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} description={t("subtitle")} icon={CalendarDays} sticker="party" />
      {!upcoming.length ? <EmptyState icon={CalendarDays} sticker="zzz" title={t("empty")} description={t("emptyText")} /> : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {upcoming.map((e) => <EventCard key={e.id} e={e} f={f} t={t} />)}
        </div>
      )}
      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">{t("past")}</h2>
          <div className="grid grid-cols-1 gap-3 opacity-70 lg:grid-cols-2">
            {past.map((e) => <EventCard key={e.id} e={e} f={f} t={t} past />)}
          </div>
        </section>
      )}
    </div>
  );
}

type Fmt = Awaited<ReturnType<typeof getFormat>>;
type T = Awaited<ReturnType<typeof getT>>;

function EventCard({ e, f, t, past = false }: { e: EventRow; f: Fmt; t: T; past?: boolean }) {
  return (
    <article className={cn("overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft transition", !past && "hover:-translate-y-0.5 hover:shadow-lift")}>
      {e.poster_url && !past && (
        <div className="relative aspect-[16/7] w-full bg-muted">
          <img src={e.poster_url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        </div>
      )}
      <div className="flex gap-4 p-4 sm:p-5">
        <DateTile date={e.starts_at} />
        <div className="min-w-0 flex-1 space-y-1.5">
          <h3 className="break-words font-display text-base font-bold leading-snug [overflow-wrap:anywhere]">{e.title}</h3>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" /> {f.dateTime(e.starts_at)}{e.ends_at ? ` – ${f.time(e.ends_at)}` : ""}
          </p>
          {e.venue && <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0" /> {e.venue}</p>}
          {e.description && !past && <p className="whitespace-pre-line pt-1 text-sm leading-relaxed text-foreground/80">{e.description}</p>}
          {e.online_url && !past && (
            <a href={e.online_url} target="_blank" rel="noopener noreferrer"
              className="mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition hover:-translate-y-px">
              <ExternalLink className="h-4 w-4" /> {t("join")} <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
