"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import { AlertTriangle, Camera, CameraOff, CheckCircle2, Keyboard, Loader2, MapPin, Phone, RotateCcw, School, ShieldAlert, Trash2, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { WhatsAppIcon } from "@/components/brand-icons";
import { useLocale, useT } from "@/i18n/client";
import { cn, formatDate, formatTime, initials, whatsappLink } from "@/lib/utils";
import { removeAttendanceAction, scanAction, type ScanResult } from "./actions";

type CamState = "off" | "starting" | "on" | "denied" | "busy" | "insecure" | "unsupported";
type Fmt = { date: (iso: string) => string; time: (iso: string) => string };

const isIOS = () =>
  typeof navigator !== "undefined" && (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

/** WhatsApp / Facebook / Instagram and friends ship their own webview, which usually has no camera. */
const inAppBrowser = () =>
  typeof navigator !== "undefined" && /(WhatsApp|FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|Snapchat|TikTok|Twitter)/i.test(navigator.userAgent);

export type ClassOption = { id: string; title: string };

/**
 * Camera QR scanner for class days. The camera is only opened when the admin taps "Start camera"
 * (and this page is the only one allowed to use it — see next.config.ts). A Student ID / mobile can
 * also be typed in when a student has no phone with them.
 */
export function Scanner({ autoStart = false, classes = [] }: { autoStart?: boolean; classes?: ClassOption[] }) {
  const t = useT("admin.attendance");
  const tc = useT("common");
  const locale = useLocale();
  const f: Fmt = { date: (iso) => formatDate(iso, locale), time: (iso) => formatTime(iso, locale) };
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const raf = useRef<number | null>(null);
  const paused = useRef(false);
  const last = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const [cam, setCam] = useState<CamState>("off");
  const [camDetail, setCamDetail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [manual, setManual] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [, startTransition] = useTransition();

  const submit = useCallback(async (value: string, method: "qr" | "manual") => {
    paused.current = true;
    setBusy(true);
    try {
      const r = await scanAction(value, method, selectedClassId || null);
      setResult(r);
      if (r.ok) {
        navigator.vibrate?.(r.already ? [60, 60, 60] : 120);
        startTransition(() => router.refresh());
      } else navigator.vibrate?.([200, 80, 200]);
    } catch {
      setResult({ ok: false, error: t("errors.failed") });
    } finally {
      setBusy(false);
      // Keep scanning after a short pause; the same code is ignored for a few seconds.
      setTimeout(() => { paused.current = false; }, 1200);
    }
  }, [router, t, selectedClassId]);

  const stop = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    stream.current?.getTracks().forEach((tr) => tr.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    setCam((c) => (c === "on" || c === "starting" ? "off" : c));
  }, []);

  const tick = useCallback(() => {
    const v = video.current;
    if (v && v.readyState >= 2 && !paused.current) {
      const w = v.videoWidth, h = v.videoHeight;
      if (w && h) {
        const scale = Math.min(1, 640 / Math.max(w, h));
        const cw = Math.round(w * scale), ch = Math.round(h * scale);
        const c = (canvas.current ??= document.createElement("canvas"));
        if (c.width !== cw) c.width = cw;
        if (c.height !== ch) c.height = ch;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(v, 0, 0, cw, ch);
          const img = ctx.getImageData(0, 0, cw, ch);
          const code = jsQR(img.data, cw, ch, { inversionAttempts: "dontInvert" });
          const now = Date.now();
          if (code?.data && !(code.data === last.current.code && now - last.current.at < 5000)) {
            last.current = { code: code.data, at: now };
            void submit(code.data, "qr");
          }
        }
      }
    }
    raf.current = requestAnimationFrame(tick);
  }, [submit]);

  const start = useCallback(async () => {
    setCamDetail(null);
    // getUserMedia only exists in secure contexts; on plain http mediaDevices is undefined.
    if (typeof window !== "undefined" && !window.isSecureContext) { setCam("insecure"); return; }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCam("unsupported");
      setCamDetail("navigator.mediaDevices.getUserMedia is not available in this browser.");
      return;
    }
    setCam("starting");
    try {
      // Prefer the back camera at a readable size; some devices reject those constraints,
      // so fall back to any camera rather than failing outright.
      let s: MediaStream;
      try {
        s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      } catch (first) {
        const name = (first as DOMException)?.name;
        if (name !== "OverconstrainedError" && name !== "ConstraintNotSatisfiedError" && name !== "NotFoundError") throw first;
        s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      stream.current = s;
      if (video.current) {
        video.current.srcObject = s;
        await video.current.play().catch(() => {});
      }
      setCam("on");
      paused.current = false;
      raf.current = requestAnimationFrame(tick);
    } catch (e) {
      const name = (e as DOMException)?.name ?? "";
      console.warn("[QR scanner] camera failed:", e);
      setCamDetail([name, (e as Error)?.message].filter(Boolean).join(": ") || String(e));
      if (name === "NotAllowedError" || name === "SecurityError") setCam("denied");
      else if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") setCam("busy");
      else setCam("unsupported");
    }
  }, [tick]);

  useEffect(() => {
    // iPhone Safari only opens the camera from a real tap; auto-starting would just end in "blocked".
    if (autoStart && cam === "off" && !isIOS()) void start();
  }, [autoStart, cam, start]);
  useEffect(() => () => stop(), [stop]);

  const camMessage =
    cam === "denied" ? t("camDenied")
    : cam === "busy" ? t("camBusy")
    : cam === "insecure" ? t("camInsecure")
    : cam === "unsupported" ? t("camUnsupported")
    : t("camOff");
  const camFailed = cam !== "off" && cam !== "starting";

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,420px)_1fr]">
      {/* ── Camera ── */}
      <Card className="overflow-hidden">
        {classes.length > 0 && (
          <div className="border-b bg-muted/40 p-3">
            <label htmlFor="scanner-class-select" className="mb-1 block text-xs font-semibold text-muted-foreground">
              පන්තිය තෝරන්න (Select Class for Attendance):
            </label>
            <select
              id="scanner-class-select"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-xs font-medium shadow-sm transition-colors focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="">සාමාන්‍ය දෛනික පැමිණීම (General Daily Check-in)</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="relative aspect-square w-full bg-slate-950 sm:aspect-[4/3] lg:aspect-square">
          <video ref={video} playsInline muted className={cn("h-full w-full object-cover", cam !== "on" && "invisible")} data-testid="scanner-video" />
          {cam === "on" && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="relative h-3/5 w-3/5 rounded-3xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(2,6,23,0.45)]">
                <span className="absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 animate-pulse rounded-full bg-teal-400/90" />
              </div>
              {busy && <Loader2 className="absolute h-10 w-10 animate-spin text-white" />}
            </div>
          )}
          {cam !== "on" && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center text-white">
              <div className="space-y-3">
                {cam === "denied" || cam === "insecure" ? <ShieldAlert className="mx-auto h-10 w-10 text-white/90" /> : cam === "unsupported" || cam === "busy" ? <CameraOff className="mx-auto h-10 w-10 text-slate-400" /> : <Camera className="mx-auto h-10 w-10 text-teal-300" />}
                <p className="text-sm text-slate-200">{camMessage}</p>
                {camFailed && inAppBrowser() ? <p className="mx-auto max-w-xs text-xs leading-relaxed text-slate-400">{t("camInApp")}</p> : null}
                {camDetail ? <p className="mx-auto max-w-xs break-words font-mono text-[10px] leading-relaxed text-slate-500">{camDetail}</p> : null}
                <Button type="button" variant="gradient" onClick={start} disabled={cam === "starting"} data-testid="scanner-start">
                  {cam === "starting" ? <Loader2 className="animate-spin" /> : <Camera />} {cam === "off" || cam === "starting" ? t("start") : t("retry")}
                </Button>
              </div>
            </div>
          )}
        </div>
        <CardContent className="space-y-3 pt-4 sm:pt-4">
          {cam === "on" && (
            <Button type="button" variant="outline" size="sm" onClick={stop} className="w-full"><CameraOff /> {t("stop")}</Button>
          )}
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (manual.trim()) void submit(manual, "manual"); }}>
            <div className="relative flex-1">
              <Keyboard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder={t("manualPlaceholder")} aria-label={t("manualPlaceholder")} className="pl-9" inputMode="numeric" data-testid="scanner-manual" />
            </div>
            <Button type="submit" disabled={busy || !manual.trim()}>{t("check")}</Button>
          </form>
          <p className="text-xs text-muted-foreground">{t("manualHint")}</p>
        </CardContent>
      </Card>

      {/* ── Result ── */}
      <div className="min-w-0" aria-live="polite" data-testid="scan-result">
        {!result ? (
          <Card className="grid h-full min-h-[240px] place-items-center border-dashed p-8 text-center">
            <div className="space-y-2 text-muted-foreground">
              <UserRound className="mx-auto h-10 w-10 opacity-40" />
              <p className="text-sm">{t("waiting")}</p>
            </div>
          </Card>
        ) : !result.ok ? (
          <Card className="border-destructive/40 bg-destructive/5 p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div className="space-y-3">
                <p className="font-semibold text-destructive" data-testid="scan-error">{result.error}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => setResult(null)}><RotateCcw /> {t("again")}</Button>
              </div>
            </div>
          </Card>
        ) : (
          <StudentResult r={result} onNext={() => { setResult(null); setManual(""); }} t={t} tc={tc} f={f} />
        )}
      </div>
    </div>
  );
}

function StudentResult({ r, onNext, t, tc, f }: {
  r: Extract<ScanResult, { ok: true }>; onNext: () => void;
  t: ReturnType<typeof useT>; tc: ReturnType<typeof useT>; f: Fmt;
}) {
  const s = r.student;
  const phones: { label: string; value: string | null; wa?: boolean }[] = [
    { label: t("mobile"), value: s.mobile },
    { label: t("whatsapp"), value: s.whatsapp, wa: true },
    { label: t("guardian"), value: s.guardian },
  ];
  const facts: { icon: typeof MapPin; label: string; value: string | null }[] = [
    { icon: MapPin, label: t("center"), value: tc(`towns.${s.town}`) },
    { icon: School, label: t("institute"), value: s.school },
    { icon: Users, label: t("district"), value: [s.city, s.district].filter(Boolean).join(", ") || null },
  ];
  return (
    <Card className="overflow-hidden">
      <div className={cn("flex items-center gap-2 px-5 py-3 text-sm font-semibold", r.already ? "bg-warning-soft text-warning-soft-foreground" : "bg-success-soft text-success-soft-foreground")} data-testid={r.already ? "scan-already" : "scan-checked-in"}>
        <CheckCircle2 className="h-4 w-4" />
        {r.already ? t("already", { time: f.time(r.at) }) : t("checkedIn", { time: f.time(r.at) })}
      </div>
      <CardContent className="space-y-5 pt-5 sm:pt-5">
        <div className="flex items-center gap-4">
          {s.photo
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={s.photo} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover ring-2 ring-border" />
            : <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-gradient-brand font-display text-2xl font-bold text-white">{initials(s.name)}</div>}
          <div className="min-w-0">
            <p className="truncate font-display text-xl font-bold" data-testid="scan-name">{s.name}</p>
            {s.studentId && <p className="font-mono text-sm font-semibold tracking-wider text-teal-700 dark:text-teal-400">{s.studentId}</p>}
            <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
              {s.alYear && <span className="rounded-full bg-muted px-2.5 py-1 font-medium">{tc("alBatch", { year: s.alYear })}</span>}
              <span className="rounded-full bg-muted px-2.5 py-1 font-medium">{tc(`attempts.${s.attempt}`)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {facts.map(({ icon: I, label, value }) => (
            <div key={label} className="rounded-xl border bg-muted/30 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"><I className="h-3.5 w-3.5" /> {label}</p>
              <p className="mt-0.5 truncate text-sm font-semibold">{value ?? tc("dash")}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {phones.map((p) => (
            <div key={p.label} className="rounded-xl border px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{p.label}</p>
              {p.value ? (
                <div className="mt-0.5 flex items-center gap-2">
                  <a href={`tel:${p.value}`} className="inline-flex items-center gap-1 font-mono text-sm font-semibold hover:underline"><Phone className="h-3.5 w-3.5" />{p.value}</a>
                  {p.wa && <a href={whatsappLink(p.value, "") ?? "#"} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="text-success-soft-foreground"><WhatsAppIcon /></a>}
                </div>
              ) : <p className="mt-0.5 text-sm text-muted-foreground">{tc("dash")}</p>}
            </div>
          ))}
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("recentPapers")}</p>
          {r.papers.length ? (
            <ul className="divide-y rounded-xl border">
              {r.papers.map((p) => {
                const pct = p.marks === null ? null : Math.round((p.marks / p.total) * 100);
                return (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{f.date(p.date)}</p>
                    </div>
                    {p.marks === null
                      ? <span className="shrink-0 rounded-full bg-destructive-soft px-2.5 py-1 text-xs font-semibold text-destructive-soft-foreground">{t("missed")}</span>
                      : <span className="shrink-0 text-right">
                          <span className="font-mono font-semibold">{p.marks}/{p.total}</span>
                          <span className={cn("ml-2 rounded-full px-2 py-0.5 text-xs font-semibold", pct! >= 75 ? "bg-success-soft text-success-soft-foreground" : pct! >= 50 ? "bg-info-soft text-info-soft-foreground" : "bg-warning-soft text-warning-soft-foreground")}>{pct}%</span>
                        </span>}
                  </li>
                );
              })}
            </ul>
          ) : <p className="text-sm text-muted-foreground">{t("noPapers")}</p>}
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("recentDays")}</p>
          <div className="flex flex-wrap gap-1.5">
            {r.recentDays.map((d) => <span key={d} className="rounded-lg bg-teal-50 px-2 py-1 text-xs font-medium text-teal-800 dark:bg-teal-500/10 dark:text-teal-300">{f.date(d)}</span>)}
          </div>
        </div>

        <Button type="button" variant="gradient" className="w-full" onClick={onNext} data-testid="scan-next"><RotateCcw /> {t("next")}</Button>
      </CardContent>
    </Card>
  );
}

/** Remove a wrong check-in from the day's list. */
export function UndoCheckIn({ studentId, classId, day, label, confirmText }: { studentId: string; classId?: string | null; day: string; label: string; confirmText: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" disabled={busy} title={label} aria-label={label}
      onClick={async () => {
        if (!window.confirm(confirmText)) return;
        setBusy(true);
        await removeAttendanceAction(studentId, day, classId).catch(() => false);
        setBusy(false);
        router.refresh();
      }}
      className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  );
}
