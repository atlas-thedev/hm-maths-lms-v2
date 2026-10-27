"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, Timer } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/db/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";
import { dbError } from "@/i18n/translate";

type Q = { id: string; question_text: string; options: string[]; marks: number };
type Start = { status: string; deadline: string; server_now: string; questions: Q[]; answers: Record<string, number> };

export function McqRunner({ examId, title, durationMinutes, totalQuestions }: { examId: string; title: string; durationMinutes: number; totalQuestions: number }) {
  const t = useT("portal.mcq");
  const tr = useT();
  const router = useRouter();
  const db = useMemo(() => createClient(), []);
  const [phase, setPhase] = useState<"intro" | "loading" | "running" | "submitting">("intro");
  const [data, setData] = useState<Start | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const offset = useRef(0);
  const submitted = useRef(false);
  const answersRef = useRef<Record<string, number>>({});
  const storageKey = `hm-exam-${examId}`;

  const submit = useCallback(async (auto = false) => {
    if (submitted.current) return;
    submitted.current = true;
    setPhase("submitting");
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
    const { data: res, error } = await db.rpc("submit_mcq", { p_exam: examId, p_answers: { ...saved, ...answersRef.current } });
    if (error) { submitted.current = false; setPhase("running"); toast.error(dbError(tr, error.message)); return; }
    localStorage.removeItem(storageKey);
    toast.success(`${auto ? t("autoSubmitted") + " " : ""}${t("score", { score: res.score, total: res.total })}`);
    router.push(`/dashboard/exams/${examId}/review`);
    router.refresh();
  }, [examId, router, storageKey, db, t, tr]);

  useEffect(() => { answersRef.current = answers; localStorage.setItem(storageKey, JSON.stringify(answers)); }, [answers, storageKey]);

  async function start() {
    setPhase("loading");
    const { data: res, error } = await db.rpc("start_exam", { p_exam: examId });
    if (error) { toast.error(dbError(tr, error.message)); setPhase("intro"); return; }
    const s = res as Start;
    if (s.status !== "in_progress") { router.push(`/dashboard/exams/${examId}/review`); return; }
    offset.current = new Date(s.server_now).getTime() - Date.now();
    const saved = { ...(s.answers ?? {}), ...JSON.parse(localStorage.getItem(storageKey) ?? "{}") };
    setAnswers(saved);
    setData(s);
    setPhase("running");
  }

  useEffect(() => {
    if (phase !== "running" || !data) return;
    const tick = () => {
      const left = new Date(data.deadline).getTime() - (Date.now() + offset.current);
      setRemaining(Math.max(0, left));
      if (left <= 0) submit(true);
    };
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [phase, data, submit]);

  useEffect(() => {
    if (phase !== "running") return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase]);

  if (phase === "intro" || phase === "loading") {
    return (
      <div className="mx-auto max-w-xl rounded-2xl bg-card p-6 text-center shadow-soft sm:p-10">
        <Timer className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 font-display text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("meta", { n: totalQuestions, min: durationMinutes })}</p>
        <ul className="mx-auto mt-6 max-w-sm space-y-2 text-left text-sm text-muted-foreground">
          {(t.raw<string[]>("rules") ?? []).map((r) => <li key={r}>• {r}</li>)}
        </ul>
        <Button size="lg" variant="gradient" className="mt-8 w-full" onClick={start} disabled={phase === "loading"}>
          {phase === "loading" && <Loader2 className="animate-spin" />} {t("start")}
        </Button>
      </div>
    );
  }

  const qs = data!.questions;
  const q = qs[current];
  const answered = Object.keys(answers).filter((k) => qs.some((x) => x.id === k)).length;
  const mm = Math.floor(remaining / 60000), ss = Math.floor((remaining % 60000) / 1000);
  const low = remaining < 60_000;

  return (
    <div className="space-y-4">
      <div className="sticky top-16 z-30 flex items-center justify-between gap-3 rounded-2xl bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
        <div className="min-w-0"><p className="truncate font-display font-semibold">{title}</p><p className="text-xs text-muted-foreground">{t("answered", { done: answered, total: qs.length })}</p></div>
        <div className={cn("flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-lg font-bold tabular-nums", low ? "animate-pulse bg-destructive/15 text-destructive" : "bg-primary/10 text-primary")}>
          <Timer className="h-4 w-4" />{String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_240px]">
        {q ? (
          <div className="rounded-2xl bg-card p-5 shadow-soft sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("questionOf", { n: current + 1, total: qs.length })} · {Number(q.marks) === 1 ? t("mark") : t("marks", { n: q.marks })}</p>
            <p className="mt-3 whitespace-pre-line text-base font-medium leading-relaxed">{q.question_text}</p>
            <div className="mt-5 space-y-2">
              {q.options.map((opt, i) => {
                const selected = answers[q.id] === i;
                return (
                  <button key={i} type="button" onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                    className={cn("flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition", selected ? "border-primary bg-primary/10 ring-1 ring-primary" : "hover:border-primary/50 hover:bg-accent")}>
                    <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold", selected && "border-primary bg-primary text-primary-foreground")}>{i + 1}</span>
                    <span className="whitespace-pre-line">{opt}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex justify-between gap-2">
              <Button variant="outline" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>{t("previous")}</Button>
              {current < qs.length - 1 ? <Button onClick={() => setCurrent((c) => c + 1)}>{t("next")}</Button> :
                <Button variant="success" onClick={() => { if (confirm(t("confirm", { n: qs.length - answered }))) submit(); }} disabled={phase === "submitting"}>
                  {phase === "submitting" ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} {t("submit")}
                </Button>}
            </div>
          </div>
        ) : <p className="rounded-2xl bg-card p-6 text-sm text-muted-foreground">{t("noQuestions")}</p>}

        <aside className="space-y-4">
          <div className="rounded-2xl bg-card p-4 shadow-soft">
            <p className="mb-3 text-sm font-semibold">{t("questions")}</p>
            <div className="grid grid-cols-5 gap-2">
              {qs.map((x, i) => (
                <button key={x.id} onClick={() => setCurrent(i)} aria-label={t("questionN", { n: i + 1 })}
                  className={cn("h-9 rounded-md border text-xs font-semibold", i === current && "ring-2 ring-primary", answers[x.id] !== undefined ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent")}>{i + 1}</button>
              ))}
            </div>
          </div>
          <Button variant="success" className="w-full" disabled={phase === "submitting"} onClick={() => { if (confirm(t("confirm", { n: qs.length - answered }))) submit(); }}>
            {phase === "submitting" ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} {t("submit")}
          </Button>
          {low && <p className="flex items-center gap-1.5 text-xs font-medium text-destructive"><AlertTriangle className="h-3.5 w-3.5" />{t("lastMinute")}</p>}
        </aside>
      </div>
    </div>
  );
}
