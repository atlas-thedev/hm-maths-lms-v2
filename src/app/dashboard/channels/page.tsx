import { ArrowUpRight, Radio } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/misc";
import { getSiteData } from "@/lib/settings";
import { getLocale, getT } from "@/i18n/server";
import { channelTitle } from "@/lib/site-data";
import { ChannelAvatar } from "@/components/channel-avatar";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  return { title: (await getT("portal.nav"))("channels") };
}

export default async function ChannelsPage() {
  const SITE = await getSiteData();
  const { profile } = await requireUser();
  const locale = await getLocale();
  const [t, tl] = await Promise.all([getT("portal.channels"), getT("landing.home.channels")]);
  const mine = (key: string) => !!profile.al_year && key.includes(String(profile.al_year));
  const channels = [...SITE.channels].sort((a, b) => Number(mine(b.key)) - Number(mine(a.key)));

  return (
    <div>
      <PageHeader title={t("title")} description={t("subtitle")} icon={Radio} sticker="channel" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {channels.map((c) => (
          <a key={c.key} href={c.url} target="_blank" rel="noopener noreferrer"
            className={cn("group flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift",
              mine(c.key) ? "border-primary/40 ring-1 ring-primary/20" : "border-border/80")}>
            <ChannelAvatar image={c.image} kind={c.kind} ring="ring-transparent" badgeBg="bg-card" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display font-bold group-hover:text-primary">{channelTitle(c, locale)}</span>
              <span className="block truncate text-xs text-muted-foreground">{c.handle}</span>
              {mine(c.key) && <span className="mt-1 inline-block rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">{t("yourBatch")}</span>}
            </span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
          </a>
        ))}
      </div>
    </div>
  );
}
