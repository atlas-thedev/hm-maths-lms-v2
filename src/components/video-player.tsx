"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Maximize, Minimize, Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { startWatermarkGuard } from "@/components/video-guard";

/** Who is watching — printed over the picture. Falls back studentId → mobile → account id (staff have no student ID). */
export type Watermark = { userId: string | null; studentId: string | null; mobile: string | null; nic?: string | null };

/* Minimal typings for the YouTube IFrame API (loaded once from youtube.com). */
type YTPlayer = {
  playVideo(): void; pauseVideo(): void; seekTo(s: number, allow: boolean): void; mute(): void; unMute(): void;
  isMuted(): boolean; setVolume(v: number): void; getVolume(): number; getCurrentTime(): number; getDuration(): number;
  getPlayerState(): number; setPlaybackRate(r: number): void; destroy(): void;
};
type YTNamespace = { Player: new (el: HTMLIFrameElement, opts: { events: Record<string, (e: { data: number; target: YTPlayer }) => void> }) => YTPlayer };
declare global { interface Window { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void } }

let apiPromise: Promise<YTNamespace> | null = null;
function loadYT(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT!); };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    document.head.appendChild(s);
  });
  return apiPromise;
}

const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
};
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const controlButton = "grid h-11 w-11 shrink-0 place-items-center rounded-full text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:opacity-40";

/**
 * YouTube embed with a click shield and app-owned controls:
 *  - YouTube's native controls, keyboard and fullscreen buttons are disabled;
 *    branding within the third-party embed is still controlled by YouTube.
 *  - the iframe is sandboxed WITHOUT allow-popups / allow-top-navigation, so even a click that
 *    reached YouTube could not open youtube.com or a new tab;
 *  - a full-size shield sits above the iframe so it never receives a click; our own controls
 *    drive the video through the IFrame API;
 *  - a cover hides YouTube's pause / end screens, and the watermark stays on top in fullscreen.
 */
export function VideoPlayer({ videoId, lessonId, watermark, title, live = false, protect = false }: {
  /** Live streams pass the id directly. Recordings pass `lessonId` instead and the id is fetched when the player opens (it is not in the page HTML). */
  videoId?: string; lessonId?: string; watermark?: Watermark | null; title: string; live?: boolean;
  /** Students: lock the player if the watermark is tampered with, pause while developer tools are open. */
  protect?: boolean;
}) {
  const t = useT("common.video");
  const wrapRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [ytId, setYtId] = useState<string | null>(videoId ?? null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState(-1); // -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(live);
  const [volume, setVolume] = useState(100);
  const [speed, setSpeed] = useState(1);
  const [nativeFs, setNativeFs] = useState(false);
  // The control bar sits over the picture, so it only shows while the mouse moves / after a tap, and always when paused.
  const [uiVisible, setUiVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overBar = useRef(false);
  const actions = useRef({ tap: () => {}, dbl: () => {} });
  // iPhone Safari can't put a custom player in fullscreen, so there we fill the screen with CSS instead.
  const [pseudoFs, setPseudoFs] = useState(false);
  const isFs = nativeFs || pseudoFs;

  const msgLimit = t("limit"), msgLoadError = t("loadError");
  // Recordings: ask the server for the YouTube id (it checks that this student may watch the lesson).
  useEffect(() => {
    if (videoId || !lessonId) return;
    let cancelled = false;
    fetch(`/api/video/${lessonId}`, { cache: "no-store", credentials: "same-origin" })
      .then(async (r) => {
        if (cancelled) return;
        if (r.ok) { setYtId(((await r.json()) as { id: string }).id); return; }
        setLoadError(r.status === 429 ? msgLimit : msgLoadError);
      })
      .catch(() => { if (!cancelled) setLoadError(msgLoadError); });
    return () => { cancelled = true; };
  }, [videoId, lessonId, msgLimit, msgLoadError]);

  // Build the embed URL on the client (origin is required by the IFrame API).
  useEffect(() => {
    if (!ytId) return;
    const p = new URLSearchParams({
      enablejsapi: "1", controls: "0", disablekb: "1", fs: "0", rel: "0", modestbranding: "1", iv_load_policy: "3",
      playsinline: "1", cc_load_policy: "0", origin: window.location.origin, widget_referrer: window.location.origin,
      ...(live ? { autoplay: "1", mute: "1" } : {}),
    });
    setSrc(`https://www.youtube-nocookie.com/embed/${encodeURIComponent(ytId)}?${p}`);
    setReady(false); setState(-1); setTime(0); setDuration(0);
  }, [ytId, live]);

  // Attach the IFrame API to our (sandboxed) iframe once it has a src.
  useEffect(() => {
    if (!src || !frameRef.current) return;
    let cancelled = false;
    loadYT().then((YT) => {
      if (cancelled || !frameRef.current) return;
      playerRef.current = new YT.Player(frameRef.current, {
        events: {
          onReady: (e) => {
            setReady(true);
            setDuration(e.target.getDuration() || 0);
            setMuted(e.target.isMuted());
            setVolume(e.target.getVolume() ?? 100);
          },
          onStateChange: (e) => { setState(e.data); setDuration(e.target.getDuration() || 0); },
        },
      });
    });
    return () => { cancelled = true; try { playerRef.current?.destroy(); } catch { /* ignore */ } playerRef.current = null; };
  }, [src]);

  // Progress polling.
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      try { setTime(p.getCurrentTime() || 0); const d = p.getDuration(); if (d) setDuration(d); } catch { /* ignore */ }
    }, 400);
    return () => clearInterval(id);
  }, [ready]);

  // Fullscreen keeps the video and our control bar together.
  useEffect(() => {
    const onFs = () => setNativeFs(document.fullscreenElement === wrapRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Watermark: drawn and defended by video-guard.ts (re-created if removed, repairs hidden/edited copies, locks on repeat tampering).
  const idText = watermark?.studentId ? `ID ${watermark.studentId}` : watermark?.mobile ?? (watermark?.userId ? `ID ${watermark.userId.replace(/-/g, "").slice(0, 8).toUpperCase()}` : null);
  const label = idText ? [idText, watermark?.mobile && watermark.studentId ? watermark.mobile : null].filter(Boolean).join(" · ") : null;
  const msgTamper = t("lockTamper"), msgDevtools = t("lockDevtools");
  useEffect(() => {
    const host = screenRef.current, root = wrapRef.current;
    if (!host || !root || !label) return;
    const g = startWatermarkGuard({
      host, root, label, enforce: protect,
      messages: { tamper: msgTamper, devtools: msgDevtools },
      onTap: () => actions.current.tap(), onDoubleTap: () => actions.current.dbl(),
      pause: () => { try { playerRef.current?.pauseVideo(); playerRef.current?.mute(); } catch { /* player not ready */ } },
      report: (kind) => { try { navigator.sendBeacon("/api/video/event", new Blob([JSON.stringify({ kind, lessonId: lessonId ?? null })], { type: "application/json" })); } catch { /* ignore */ } },
    });
    return g.stop;
  }, [label, protect, lessonId, msgTamper, msgDevtools]);

  const playing = state === 1 || state === 3;
  const reveal = useCallback(() => {
    setUiVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => { if (!overBar.current) setUiVisible(false); }, 2500);
  }, []);
  // Paused, ended, loading → bar stays up. Playing → starts the countdown to hide.
  useEffect(() => {
    if (!playing) { if (hideTimer.current) clearTimeout(hideTimer.current); setUiVisible(true); } else reveal();
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [playing, reveal]);
  const barShown = uiVisible || !playing;
  const toggle = useCallback(() => {
    const p = playerRef.current;
    if (!p || !ready) return;
    if (state === 1 || state === 3) p.pauseVideo();
    else { if (state === 0) p.seekTo(0, true); p.playVideo(); }
  }, [ready, state]);
  const seek = (s: number) => { const bounded = Math.max(0, Math.min(duration || Math.max(0, s), s)); playerRef.current?.seekTo(bounded, true); setTime(bounded); };
  const toggleMute = () => {
    const p = playerRef.current; if (!p) return;
    if (p.isMuted()) { p.unMute(); setMuted(false); } else { p.mute(); setMuted(true); }
  };
  const changeSpeed = (r: number) => { playerRef.current?.setPlaybackRate(r); setSpeed(r); };
  const toggleFs = () => {
    if (pseudoFs) { setPseudoFs(false); return; }
    if (document.fullscreenElement) { void document.exitFullscreen(); return; }
    const el = wrapRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    if (el?.requestFullscreen) {
      el.requestFullscreen().then(() => {
        // Phones: turn sideways for a bigger picture (Android Chrome supports this in fullscreen).
        const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
        o?.lock?.("landscape").catch(() => {});
      }).catch(() => setPseudoFs(true));
    } else if (el?.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else setPseudoFs(true);
  };

  // While the CSS fullscreen is on: lock page scroll and let the Back/Escape key close it.
  useEffect(() => {
    if (!pseudoFs) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPseudoFs(false); };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); };
  }, [pseudoFs]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    const k = e.key.toLowerCase();
    if (k === " " || k === "k") { e.preventDefault(); toggle(); }
    else if (k === "f") toggleFs();
    else if (k === "m") toggleMute();
    else if (!live && k === "arrowright") seek(time + 10);
    else if (!live && k === "arrowleft") seek(time - 10);
  };

  // On touch screens the first tap only brings the bar up; the next one plays / pauses.
  actions.current.tap = () => {
    if (!barShown && window.matchMedia("(pointer: coarse)").matches) { reveal(); return; }
    toggle(); reveal();
  };
  actions.current.dbl = toggleFs;
  const covered = !ready || state === -1 || state === 0 || state === 2 || state === 5;

  return (
    <div
      ref={wrapRef}
      tabIndex={0}
      onKeyDown={(e) => { reveal(); onKey(e); }}
      onPointerMove={(e) => { if (e.pointerType === "mouse") reveal(); }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse" && playing) { if (hideTimer.current) clearTimeout(hideTimer.current); hideTimer.current = setTimeout(() => setUiVisible(false), 800); } }}
      onFocusCapture={(e) => { if ((e.target as HTMLElement).matches?.(":focus-visible")) reveal(); }}
      onContextMenu={(e) => e.preventDefault()}
      className={cn("no-select group relative aspect-video w-full min-w-0 overflow-hidden rounded-xl bg-black shadow-xl outline-none ring-1 ring-border focus-visible:ring-2 focus-visible:ring-primary",
        nativeFs && "h-full !aspect-auto rounded-none",
        pseudoFs && "!fixed inset-0 z-[100] h-[100dvh] w-screen !aspect-auto rounded-none ring-0 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]")}
    >
      <div ref={screenRef} className="absolute inset-0 isolate overflow-hidden bg-black" data-player-screen>
      {src && (
        <iframe
          ref={frameRef}
          // Match the original in-video presentation.
          className="pointer-events-none absolute left-1/2 top-1/2 h-[118%] w-[118%] -translate-x-1/2 -translate-y-1/2"
          src={src}
          title={title}
          tabIndex={-1}
          allow="autoplay; encrypted-media; picture-in-picture"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      )}

      {/* Cover over YouTube's own start / pause / end screens (suggested videos, "Watch on YouTube"). */}
      {covered && (
        <button type="button" onClick={toggle} aria-label={state === 0 ? t("replay") : t("play")}
          className="absolute inset-0 z-[6] grid place-items-center bg-black pb-12 sm:pb-0">
          {loadError ? <span className="max-w-xs px-6 text-center text-sm font-semibold text-white/90">{loadError}</span> : !ready ? <Loader2 className="h-10 w-10 animate-spin text-white/90" /> : (
            <span className="grid h-12 w-12 place-items-center rounded-full sm:h-16 sm:w-16 bg-white/90 text-black shadow-xl transition group-hover:scale-105">
              {state === 0 ? <RotateCcw className="h-7 w-7" /> : <Play className="ml-1 h-7 w-7 fill-black" />}
            </span>
          )}
          <span className="absolute left-4 top-3 max-w-[80%] truncate text-left text-sm font-semibold text-white/90">{title}</span>
        </button>
      )}

      </div>

      {/* Compact control bar stays inside the original video frame. */}
      <div className={cn("pointer-events-none absolute inset-x-0 bottom-0 z-20 h-24 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300", barShown ? "opacity-100" : "opacity-0")} aria-hidden />
      <div data-player-controls onPointerEnter={() => { overBar.current = true; reveal(); }} onPointerLeave={() => { overBar.current = false; if (playing) reveal(); }}
        className={cn("absolute inset-x-1 bottom-1 z-30 flex flex-wrap items-center gap-0 rounded-2xl sm:gap-0.5 border border-white/10 bg-gray-800/95 px-0.5 py-0.5 text-white shadow-lg backdrop-blur-md sm:inset-x-2 sm:bottom-2 sm:flex-nowrap sm:rounded-full sm:px-2 transition duration-300", barShown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0")}>
        {!live && (
          <div className="order-first flex w-full items-center gap-2 px-2 sm:order-none sm:w-auto sm:min-w-0 sm:flex-1 sm:px-0">
            <span className="shrink-0 font-mono text-[11px] tabular-nums sm:hidden">{fmt(time)}</span>
            <input type="range" min={0} max={Math.max(1, duration)} step={1} value={Math.min(time, duration || time)}
              onChange={(e) => seek(Number(e.target.value))} aria-label={t("seek")} disabled={!ready}
              className="h-6 min-w-0 flex-1 cursor-pointer accent-white disabled:opacity-40" />
            <span className="shrink-0 font-mono text-[11px] tabular-nums sm:hidden">-{fmt(Math.max(0, duration-time))}</span>
          </div>
        )}
        <button type="button" onClick={toggle} disabled={!ready} aria-label={playing ? t("pause") : t("play")} className={controlButton + " sm:order-first"}>
          {playing ? <Pause className="h-4 w-4 fill-white" /> : <Play className="h-4 w-4 fill-white" />}
        </button>
        {!live && <>
          <button type="button" onClick={() => seek(time-10)} disabled={!ready} aria-label={t("back10")} className={controlButton + " sm:order-first"}>
            <span className="relative"><RotateCcw className="h-[18px] w-[18px]" /><span className="absolute inset-0 grid place-items-center pt-0.5 text-[7px] font-bold">10</span></span>
          </button>
          <button type="button" onClick={() => seek(time+10)} disabled={!ready} aria-label={t("forward10")} className={controlButton + " sm:order-first"}>
            <span className="relative"><RotateCw className="h-[18px] w-[18px]" /><span className="absolute inset-0 grid place-items-center pt-0.5 text-[7px] font-bold">10</span></span>
          </button>
          <span className="order-first hidden shrink-0 pr-1 font-mono text-[11px] tabular-nums sm:inline">{fmt(time)}</span>
          <span className="hidden shrink-0 px-1 font-mono text-[11px] tabular-nums xl:inline">-{fmt(Math.max(0,duration-time))}</span>
        </>}
        {live && <span className="flex-1 text-xs font-semibold text-white">● {t("live")}</span>}
        <span className="flex-1 sm:hidden" />
        <button type="button" onClick={toggleMute} disabled={!ready} aria-label={muted ? t("unmute") : t("mute")} className={controlButton}>
          {muted || volume === 0 ? <VolumeX className="h-[18px] w-[18px]" /> : <Volume2 className="h-[18px] w-[18px]" />}
        </button>
        {!live && <select value={speed} onChange={(e) => changeSpeed(Number(e.target.value))} aria-label={t("speed")} disabled={!ready}
          className="h-11 w-12 shrink-0 appearance-none rounded-full bg-transparent text-center text-xs text-white outline-none hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:opacity-40 [&>option]:text-black">
          {SPEEDS.map((r) => <option key={r} value={r}>{r}×</option>)}
        </select>}
        <button type="button" onClick={toggleFs} aria-label={isFs ? t("exitFullscreen") : t("fullscreen")} className={controlButton}>
          {isFs ? <Minimize className="h-[18px] w-[18px]" /> : <Maximize className="h-[18px] w-[18px]" />}
        </button>
      </div>
    </div>
  );
}
