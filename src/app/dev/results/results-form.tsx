"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, Award, ChevronDown, Plus, Trash2, UserRound } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { FileUpload } from "@/components/file-upload";
import { Badge, Button, Card, CardContent, CardHeader, Field, Input, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { RESULT_GRADES, blankResult, initialsOf, type ExamResult, type ResultsSettings } from "@/lib/results";
import { cn } from "@/lib/utils";
import { saveResultsAction } from "../content-actions";

type Row = ExamResult & { uid: number };
let uid = 0;

const GRADE_STYLE: Record<string, string> = {
  A: "bg-brand-500 text-white", B: "bg-info text-white", C: "bg-success text-white",
  S: "bg-warning text-white", W: "bg-slate-400 text-white", F: "bg-destructive text-white", "-": "bg-slate-200 text-slate-600",
};

/**
 * Results editor (Developer panel → Results). One list holds both kinds of row:
 *   · District result — the big card at the top of /results (name, year, district, grade, note).
 *   · Student result  — a normal line, where the grade (A / B / C …) is shown in the rank slot.
 * Rows without a photo show the student's initials, so nothing looks broken while photos are being collected.
 */
export function ResultsForm({ initial }: { initial: ResultsSettings }) {
  const [rows, setRows] = useState<Row[]>(() => initial.results.map((r) => ({ ...r, uid: ++uid })));
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [head, setHead] = useState({
    eyebrowEn: initial.eyebrowEn, eyebrowSi: initial.eyebrowSi,
    titleEn: initial.titleEn, titleSi: initial.titleSi,
    introEn: initial.introEn, introSi: initial.introSi,
    sort: initial.sort,
  });

  const patch = (id: number, p: Partial<Row>) => setRows((r) => r.map((x) => (x.uid === id ? { ...x, ...p } : x)));
  const move = (i: number, d: number) => setRows((r) => {
    const n = [...r]; const j = i + d;
    if (j < 0 || j >= n.length) return r;
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  });
  const toggle = (id: number) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const add = (kind: "district" | "student") => {
    const blank = blankResult(kind);
    const next = ++uid;
    setRows((r) => [...r, { ...blank, uid: next }]);
    setOpen((s) => new Set(s).add(next));
  };

  const stats = useMemo(() => ({
    total: rows.length,
    a: rows.filter((r) => r.grade === "A").length,
    hidden: rows.filter((r) => !r.enabled).length,
  }), [rows]);

  const payload = JSON.stringify({
    ...head,
    results: rows.map(({ uid: _u, ...rest }) => rest),
  });

  const tools = (r: Row, i: number) => (
    <>
      <Button type="button" variant="ghost" size="icon" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp /></Button>
      <Button type="button" variant="ghost" size="icon" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)}><ArrowDown /></Button>
      <Button type="button" variant="ghost" size="icon" aria-label="Remove result"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setRows((x) => x.filter((y) => y.uid !== r.uid))}><Trash2 /></Button>
    </>
  );

  return (
    <ActionForm action={saveResultsAction} className="space-y-5" resetOnSuccess={false}>
      <input type="hidden" name="results" value={payload} />

      {/* ── Page wording ── */}
      <Card>
        <CardHeader icon={Award} title="Page heading" description="What the top of /results says. English and Sinhala are written separately, so both read naturally." />
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Small label (English)" htmlFor="r-ey-en"><Input id="r-ey-en" value={head.eyebrowEn} onChange={(e) => setHead((h) => ({ ...h, eyebrowEn: e.target.value }))} maxLength={60} /></Field>
            <Field label="Small label (සිංහල)" htmlFor="r-ey-si"><Input id="r-ey-si" value={head.eyebrowSi} onChange={(e) => setHead((h) => ({ ...h, eyebrowSi: e.target.value }))} maxLength={60} /></Field>
            <Field label="Title (English)" htmlFor="r-ti-en"><Input id="r-ti-en" value={head.titleEn} onChange={(e) => setHead((h) => ({ ...h, titleEn: e.target.value }))} maxLength={90} /></Field>
            <Field label="Title (සිංහල)" htmlFor="r-ti-si"><Input id="r-ti-si" value={head.titleSi} onChange={(e) => setHead((h) => ({ ...h, titleSi: e.target.value }))} maxLength={90} /></Field>
            <Field label="Introduction (English)" htmlFor="r-in-en"><Textarea id="r-in-en" rows={3} value={head.introEn} onChange={(e) => setHead((h) => ({ ...h, introEn: e.target.value }))} maxLength={600} /></Field>
            <Field label="Introduction (සිංහල)" htmlFor="r-in-si"><Textarea id="r-in-si" rows={3} value={head.introSi} onChange={(e) => setHead((h) => ({ ...h, introSi: e.target.value }))} maxLength={600} /></Field>
          </div>
          <Field label="Order" htmlFor="r-sort" hint="District toppers always come first, whatever this says.">
            <Select id="r-sort" value={head.sort} onChange={(e) => setHead((h) => ({ ...h, sort: e.target.value as ResultsSettings["sort"] }))}>
              <option value="year">Newest exam year first, then best grade</option>
              <option value="grade">Best grade first (A → B → C …)</option>
              <option value="district">By district name</option>
            </Select>
          </Field>
        </CardContent>
      </Card>

      {/* ── The results ── */}
      <Card>
        <CardHeader icon={UserRound} title="Results" description="Add a district top result (big card) or a normal student result (a line with the grade). Photos are optional."
          action={<div className="flex gap-1.5">
            <Badge variant="outline">{stats.total} rows</Badge>
            <Badge variant="solid">{stats.a} × A</Badge>
            {stats.hidden > 0 && <Badge variant="warning">{stats.hidden} hidden</Badge>}
          </div>} />
        <CardContent className="space-y-4">
          {rows.length === 0 && (
            <p className="rounded-xl border border-dashed bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
              No results yet. The page stays online with an “results coming soon” note until you add the first one.
            </p>
          )}

          <ul className="divide-y overflow-hidden rounded-2xl border">
            {rows.map((r, i) => {
              const isOpen = open.has(r.uid);
              const label = r.name || `Result #${i + 1}`;
              return (
                <li key={r.uid} className={cn(!r.enabled && "opacity-60")}>
                  <div className="flex items-center gap-1.5 px-3 py-2.5 sm:gap-2 sm:px-4">
                    <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-extrabold", GRADE_STYLE[r.grade] ?? GRADE_STYLE["-"])}>
                      {r.grade === "-" ? "—" : r.grade}
                    </span>
                    <button type="button" onClick={() => toggle(r.uid)} aria-expanded={isOpen}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-xl py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border">
                        {r.photo
                          ? <Image src={r.photo} alt="" fill sizes="40px" className="object-cover" />
                          : <span className="grid h-full w-full place-items-center text-[11px] font-bold text-muted-foreground">{initialsOf(r.name)}</span>}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2">
                          <span className="truncate font-display font-semibold">{label}</span>
                          {r.kind === "district" && <Badge variant="highlight">District</Badge>}
                          {r.featured && <Badge variant="solid">Featured</Badge>}
                          {!r.enabled && <Badge variant="outline">Hidden</Badge>}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {[r.year && `${r.year} A/L`, r.district, r.marks].filter(Boolean).join(" · ") || "Year, district and marks empty"}
                        </span>
                      </span>
                      <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition", isOpen && "rotate-180")} />
                    </button>
                    <div className="hidden shrink-0 gap-0.5 sm:flex">{tools(r, i)}</div>
                  </div>

                  {isOpen && (
                    <div className="space-y-3 border-t bg-muted/30 px-4 py-4">
                      <div className="flex items-center justify-between gap-2 border-b pb-3 sm:hidden">
                        <span className="text-sm font-medium">Order / remove</span>
                        <span className="flex gap-0.5">{tools(r, i)}</span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Kind of result" htmlFor={`k-${r.uid}`} hint="District = the big card at the top of the page.">
                          <Select id={`k-${r.uid}`} value={r.kind} onChange={(e) => patch(r.uid, { kind: e.target.value as ExamResult["kind"] })}>
                            <option value="student">Normal student result</option>
                            <option value="district">District top result (big card)</option>
                          </Select>
                        </Field>
                        <Field label="Grade" htmlFor={`g-${r.uid}`} hint="Shown in the rank slot on a normal result. “—” means not published yet.">
                          <Select id={`g-${r.uid}`} value={r.grade} onChange={(e) => patch(r.uid, { grade: e.target.value as ExamResult["grade"] })}>
                            {RESULT_GRADES.map((g) => <option key={g} value={g}>{g === "-" ? "— (none)" : g}</option>)}
                          </Select>
                        </Field>
                        <Field label="Student's name" htmlFor={`n-${r.uid}`}><Input id={`n-${r.uid}`} value={r.name} onChange={(e) => patch(r.uid, { name: e.target.value })} maxLength={80} required /></Field>
                        <Field label="Exam year" htmlFor={`y-${r.uid}`} hint="Four digits, e.g. 2025."><Input id={`y-${r.uid}`} inputMode="numeric" value={r.year} onChange={(e) => patch(r.uid, { year: e.target.value.replace(/\D/g, "").slice(0, 4) })} maxLength={4} required /></Field>
                        <Field label="District (or centre)" htmlFor={`d-${r.uid}`} hint="For example Panadura, or “Island”."><Input id={`d-${r.uid}`} value={r.district} onChange={(e) => patch(r.uid, { district: e.target.value })} maxLength={60} required /></Field>
                        <Field label="District in Sinhala (optional)" htmlFor={`ds-${r.uid}`}><Input id={`ds-${r.uid}`} value={r.districtSi} onChange={(e) => patch(r.uid, { districtSi: e.target.value })} maxLength={60} placeholder="පානදුර" /></Field>
                        <Field label="Marks / rank (optional)" htmlFor={`m-${r.uid}`} hint="Free text: “92”, “Top 10”, “Island rank 7”."><Input id={`m-${r.uid}`} value={r.marks} onChange={(e) => patch(r.uid, { marks: e.target.value })} maxLength={24} /></Field>
                        <Field label="Note (English, optional)" htmlFor={`noe-${r.uid}`}><Input id={`noe-${r.uid}`} value={r.noteEn} onChange={(e) => patch(r.uid, { noteEn: e.target.value })} maxLength={120} /></Field>
                        <Field label="Note (සිංහල, optional)" htmlFor={`nos-${r.uid}`}><Input id={`nos-${r.uid}`} value={r.noteSi} onChange={(e) => patch(r.uid, { noteSi: e.target.value })} maxLength={120} /></Field>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                        <div>
                          <p className="mb-1.5 text-sm font-medium">Photo (optional)</p>
                          <FileUpload bucket="class-banners" prefix="results" name={`photo-${r.uid}`} publicUrl
                            accept="image/jpeg,image/png,image/webp" maxMB={3} label={r.photo ? "Replace the photo" : "Upload a photo"}
                            defaultValue={r.photo || null} onUploaded={(v) => patch(r.uid, { photo: v[0] ?? "" })} />
                          <p className="mt-1 text-[11px] text-muted-foreground">Without a photo the card shows the student&apos;s initials ({initialsOf(r.name)}).</p>
                          {r.photo && (
                            <button type="button" onClick={() => patch(r.uid, { photo: "" })} className="mt-1 text-xs font-medium text-destructive hover:underline">Remove the photo</button>
                          )}
                        </div>
                        <div className="space-y-2 sm:mt-7">
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={r.enabled} onChange={(e) => patch(r.uid, { enabled: e.target.checked })} className="h-4 w-4 accent-[hsl(var(--primary))]" />
                            Show on the site
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={r.featured} onChange={(e) => patch(r.uid, { featured: e.target.checked })} className="h-4 w-4 accent-[hsl(var(--primary))]" />
                            Highlight (medal colours)
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={() => add("student")}><Plus /> Add a student result</Button>
            <Button type="button" variant="outline" onClick={() => add("district")}><Plus /> Add a district top result</Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingText="Saving…">Save results</SubmitButton>
        <a href="/results" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary hover:underline">Open /results →</a>
      </div>
    </ActionForm>
  );
}
