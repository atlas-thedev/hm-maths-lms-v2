"use client";
import { livePlatform } from "@/lib/schedule";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Radio, Video } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { VideoPlayer, type Watermark } from "@/components/video-player";
import { LIVE_UNLOCK_MINUTES } from "@/lib/constants";
import { youtubeId } from "@/lib/youtube";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";

function split(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/**
 * Pre-join countdown. The server only sends `liveUrl` once we are inside the unlock window
 * (start − 20 min), so the link cannot be read from the page source early. When the countdown
 * reaches zero we refresh the server component to receive it.
 */
export function LiveCountdown({ title, startISO, endISO, liveUrl, serverNow, watermark, protect = false }: {
  title: string; startISO: string; endISO: string; liveUrl: string | null; serverNow: string; watermark: Watermark; protect?: boolean;
}) {
  const tr = useT("common.live");
  const ts = useT("common.schedule");
  const router = useRouter();
  const offset = useRef(new Date(serverNow).getTime() - Date.now());
  const [now, setNow] = useState(() => Date.now() + offset.current);
  const refreshed = useRef(false);

  const start = new Date(startISO).getTime();
  const unlock = start - LIVE_UNLOCK_MINUTES * 60 * 1000;
  const end = new Date(endISO).getTime();

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offset.current), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (now >= unlock && now < end && !liveUrl && !refreshed.current) {
      refreshed.current = true;
      router.refresh();
    }
  }, [now, unlock, end, liveUrl, router]);

  if (now >= end) {
    return <p className="text-sm text-muted-foreground">{tr("ended")}</p>;
  }

  if (now < unlock) {
    const t = split(unlock - now);
    const toStart = split(start - now);
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Lock className="h-3.5 w-3.5" /> {tr("opensBefore", { min: LIVE_UNLOCK_MINUTES })}</div>
        <div className="flex gap-2">
          {([[tr("days"), t.d], [tr("hours"), t.h], [tr("minutes"), t.m], [tr("seconds"), t.s]] as const).map(([l, v]) => (
            <div key={l} className="min-w-14 rounded-lg border bg-background px-3 py-2 text-center">
              <p className="font-mono text-xl font-bold tabular-nums">{String(v).padStart(2, "0")}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{l}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{tr("startsIn", { time: toStart.d ? tr("durationDHM", toStart) : tr("durationHM", toStart) })}</p>
        <button disabled className={cn(buttonVariants({ variant: "secondary" }), "w-full sm:w-auto")}><Lock /> {tr("join")}</button>
      </div>
    );
  }

  const started = now >= start;
  const ytId = youtubeId(liveUrl);
  const platform = livePlatform(liveUrl);
  return (
    <div className="flex flex-col gap-3">
      <div className={cn("inline-flex self-start items-center gap-2 rounded-full px-3 py-1 text-xs font-bold", started ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning")}>
        <Radio className={cn("h-3.5 w-3.5", started && "animate-pulse")} /> {started ? tr("liveNow") : tr("startingIn", { min: split(start - now).m + 1 })}
      </div>
      {!liveUrl ? (
        <p className="text-sm text-muted-foreground">{refreshed.current ? tr("noLink") : tr("loading")}</p>
      ) : ytId ? (
        <VideoPlayer videoId={ytId} watermark={watermark} title={title} live protect={protect} />
      ) : (
        <a href={liveUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "gradient", size: "lg" }), "self-start")}>
          <Video /> {platform && platform !== "other" ? tr("joinOn", { platform: ts(`platforms.${platform}`) }) : tr("join")}
        </a>
      )}
    </div>
  );
}
