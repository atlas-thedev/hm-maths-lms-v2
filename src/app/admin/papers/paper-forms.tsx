"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Eye, EyeOff, Loader2, Search, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { ActionForm } from "@/components/action-form";
import { FileUpload } from "@/components/file-upload";
import { Avatar, Field, IconTile, Input, Select, Textarea, buttonVariants, cardVariants } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { AL_YEARS } from "@/lib/constants";
import { PAPER_TYPES, pct, type Paper } from "@/lib/papers";
import type { ClassRow } from "@/lib/types";
import { cn, initials } from "@/lib/utils";
import { useT } from "@/i18n/client";
import { deleteMarkAction, deletePaperAction, saveMarkAction, savePaperAction, searchStudentsAction, type StudentHit } from "./actions";

export function PaperForm({ paper, newId, classes, today }: {
  paper?: Paper; newId?: string; classes: Pick<ClassRow, "id" | "title">[]; today: string;
}) {
  const t = useT("admin.papers.form");
  const tc = useT("common");
  const tp = useT("common.paperTypes");
  const id = paper?.id ?? newId!;
  const [type, setType] = useState<string>(paper?.paper_type ?? "weekly");
  const [published, setPublished] = useState(paper?.is_published ?? true);
  return (
    <ActionForm action={savePaperAction} className="space-y-5">
      <input type="hidden" name="id" value={id} />
      {!paper && <input type="hidden" name="is_new" value="1" />}
      <Field label={t("title")} htmlFor={`title-${id}`} hint={t("titleHint")}>
        <Input id={`title-${id}`} name="title" defaultValue={paper?.title} placeholder={t("titlePlaceholder")} required minLength={2} maxLength={160} className="h-11" />
      </Field>
      <Field label={t("type")}>
        <div className="grid grid-cols-2 gap-2">
          {PAPER_TYPES.map((x) => (
            <label key={x} className="flex cursor-pointer">
              <input type="radio" name="paper_type" value={x} checked={type === x} onChange={() => setType(x)} className="peer sr-only" />
              <span className="flex min-h-11 w-full items-center justify-center rounded-xl border px-3 py-2 text-center text-sm font-medium leading-snug transition hover:border-primary/40 peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                {tp(x)}
              </span>
            </label>
          ))}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label={t("date")} htmlFor={`date-${id}`}>
          <Input id={`date-${id}`} name="paper_date" type="date" defaultValue={paper?.paper_date ?? today} required />
        </Field>
        <Field label={t("total")} htmlFor={`total-${id}`}>
          <Input id={`total-${id}`} name="total_marks" type="number" min={1} max={1000} step="0.5" defaultValue={paper?.total_marks ?? 100} required />
        </Field>
        <Field label={t("batch")} htmlFor={`year-${id}`} className="col-span-2">
          <Select id={`year-${id}`} name="al_year" defaultValue={paper?.al_year ?? ""}>
            <option value="">{t("allBatches")}</option>
            {AL_YEARS.map((y) => <option key={y} value={y}>{tc("alBatch", { year: y })}</option>)}
          </Select>
        </Field>
      </div>
      <Field label={t("class")} htmlFor={`class-${id}`} hint={t("classHint")}>
        <Select id={`class-${id}`} name="class_id" defaultValue={paper?.class_id ?? ""}>
          <option value="">{t("noClass")}</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </Select>
      </Field>
      <Field label={t("description")} htmlFor={`desc-${id}`}>
        <Textarea id={`desc-${id}`} name="description" defaultValue={paper?.description ?? ""} placeholder={t("descriptionPlaceholder")} maxLength={2000} />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("paperFile")} hint={t("optional")}>
          <FileUpload bucket="papers" prefix={id} name="paper_path" accept="application/pdf,image/jpeg,image/png,image/webp" maxMB={25} defaultValue={paper?.paper_path} label={t("upload")} />
        </Field>
        <Field label={t("answersFile")} hint={t("optional")}>
          <FileUpload bucket="papers" prefix={id} name="answers_path" accept="application/pdf,image/jpeg,image/png,image/webp" maxMB={25} defaultValue={paper?.answers_path} label={t("upload")} />
        </Field>
      </div>
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border bg-muted/30 p-4">
        <span className="flex items-center gap-3">
          <IconTile icon={published ? Eye : EyeOff} tone={published ? "success" : "neutral"} />
          <span>
            <span className="block text-sm font-semibold">{t("published")}</span>
            <span className="block text-xs text-muted-foreground">{published ? t("publishedOn") : t("publishedOff")}</span>
          </span>
        </span>
        <input type="checkbox" name="is_published" checked={published} onChange={(e) => setPublished(e.target.checked)} className="peer sr-only" />
        <span className="relative h-6 w-11 shrink-0 rounded-full bg-input transition after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:bg-success peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-ring" />
      </label>
      <div className="flex justify-end">
        <SubmitButton size="lg" pendingText={tc("actions.saving")}>{paper ? tc("actions.saveChanges") : t("create")}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function DeletePaperButton({ id }: { id: string }) {
  const t = useT("admin.papers");
  return (
    <ActionForm action={deletePaperAction} confirm={t("deleteConfirm")}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 /> {t("delete")}</SubmitButton>
    </ActionForm>
  );
}

/** Search a student by name / mobile / student ID and enter the marks without leaving the keyboard. */
export function MarksEntry({ paperId, total }: { paperId: string; total: number }) {
  const t = useT("admin.papers.entry");
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<StudentHit[]>([]);
  const [searching, startSearch] = useTransition();
  const [searched, setSearched] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setHits([]); setSearched(false); return; }
    const h = setTimeout(() => startSearch(async () => { setHits(await searchStudentsAction(paperId, term)); setSearched(true); }), 250);
    return () => clearTimeout(h);
  }, [q, paperId]);

  const done = (name: string, marks: number) => {
    toast.success(t("saved", { name, marks, total }));
    setQ(""); setHits([]);
    router.refresh();
    searchRef.current?.focus();
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} className="h-12 rounded-2xl pl-10 text-base" autoComplete="off" aria-label={t("search")}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); document.querySelector<HTMLInputElement>("[data-mark-input]")?.focus(); } }} />
        {searching && <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />}
      </div>
      <p className="px-1 text-xs text-muted-foreground">{t("searchHint")}</p>
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {hits.map((s, i) => (
            <motion.div key={s.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.03 } }} exit={{ opacity: 0, scale: 0.98 }}>
              <HitRow hit={s} paperId={paperId} total={total} first={i === 0} onSaved={done} />
            </motion.div>
          ))}
        </AnimatePresence>
        {searched && !searching && !hits.length && (
          <div className="flex items-center gap-2 rounded-2xl border border-dashed p-4 text-sm text-muted-foreground"><UserRound className="h-4 w-4" /> {t("noMatch")}</div>
        )}
      </div>
    </div>
  );
}

function HitRow({ hit, paperId, total, first, onSaved }: { hit: StudentHit; paperId: string; total: number; first: boolean; onSaved: (n: string, m: number) => void }) {
  const t = useT("admin.papers.entry");
  const tc = useT("common");
  const [marks, setMarks] = useState(hit.marks === null ? "" : String(hit.marks));
  const [remark, setRemark] = useState(hit.remark ?? "");
  const [pending, start] = useTransition();
  const n = Number(marks);
  const valid = marks !== "" && Number.isFinite(n) && n >= 0 && n <= total;
  const save = () => {
    if (!valid) { toast.error(t("range", { total })); return; }
    start(async () => {
      const r = await saveMarkAction(paperId, hit.id, n, remark || null);
      if (r.ok) onSaved(hit.full_name, n); else toast.error(r.error);
    });
  };
  return (
    <div className={cn(cardVariants(), "flex flex-col gap-3 p-3 sm:flex-row sm:items-center")}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={hit.full_name} size="md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{hit.full_name}</p>
          <p className="truncate text-xs text-muted-foreground">
            <span className="font-mono">{hit.student_id ?? tc("dash")}</span> · {hit.mobile ?? tc("dash")} · {tc(`towns.${hit.town}`)}{hit.al_year ? ` · ${hit.al_year}` : ""}
          </p>
        </div>
        {hit.marks !== null && <span className="ml-auto shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success-soft-foreground">{t("current", { marks: hit.marks })}</span>}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Input data-mark-input={first ? "" : undefined} value={marks} onChange={(e) => setMarks(e.target.value)} inputMode="decimal" type="number" min={0} max={total} step="0.5"
            placeholder="0" aria-label={t("marksFor", { name: hit.full_name })} className={cn("h-10 w-32 pr-14 text-right font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none", marks !== "" && !valid && "border-destructive")}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); save(); } }} />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">/{total}</span>
        </div>
        <Input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder={t("remark")} maxLength={200} className="hidden h-10 w-36 md:block"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); save(); } }} />
        <button type="button" onClick={save} disabled={pending} className={buttonVariants({ size: "icon" })} aria-label={t("save")}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </button>
        {valid && <span className="hidden w-12 text-xs font-semibold text-primary lg:block">{pct(n, total)}%</span>}
      </div>
    </div>
  );
}

export function EditMarkCell({ paperId, studentId, name, marks, remark, total }: { paperId: string; studentId: string; name: string; marks: number; remark: string | null; total: number }) {
  const t = useT("admin.papers.entry");
  const router = useRouter();
  const [v, setV] = useState(String(marks));
  const [pending, start] = useTransition();
  const changed = v !== String(marks);
  const save = () => {
    const n = Number(v);
    if (!(v !== "" && Number.isFinite(n) && n >= 0 && n <= total)) { toast.error(t("range", { total })); return; }
    start(async () => {
      const r = await saveMarkAction(paperId, studentId, n, remark);
      if (r.ok) { toast.success(t("saved", { name, marks: n, total })); router.refresh(); } else toast.error(r.error);
    });
  };
  return (
    <div className="flex items-center justify-end gap-1.5">
      <Input value={v} onChange={(e) => setV(e.target.value)} type="number" min={0} max={total} step="0.5" aria-label={t("marksFor", { name })}
        className="h-8 w-20 text-right font-semibold" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); save(); } }} />
      {changed && (
        <button type="button" onClick={save} disabled={pending} aria-label={t("save")} className={buttonVariants({ size: "icon-sm" })}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        </button>
      )}
      <ActionForm action={deleteMarkAction} confirm={t("removeConfirm", { name })}>
        <input type="hidden" name="paper_id" value={paperId} />
        <input type="hidden" name="student_id" value={studentId} />
        <SubmitButton variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={t("remove")}><Trash2 /></SubmitButton>
      </ActionForm>
    </div>
  );
}
