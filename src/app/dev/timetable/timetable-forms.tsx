"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, CalendarDays, ChevronDown, Plus, Sparkles, Trash2 } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { Badge, Button, Card, CardContent, CardHeader, Field, Input, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { ONLINE_KEY, type Center } from "@/lib/centers";
import type { HeroPromoSettings } from "@/lib/settings";
import type { TimetableEntry } from "@/lib/timetable";
import { cn } from "@/lib/utils";
import { saveHeroPromoAction, saveTimetableAction } from "./actions";

const CLASS_TYPES = ["Theory", "Revision", "Paper Class", "Combo", "Extra Class", "Free Seminar"] as const;

export function HeroPromoForm({ initial }: { initial: HeroPromoSettings }) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [year, setYear] = useState(initial.year);
  const [titleSi, setTitleSi] = useState(initial.titleSi);
  const [ctaSi, setCtaSi] = useState(initial.ctaSi);
  const [href, setHref] = useState(initial.href);

  return (
    <Card>
      <CardHeader
        icon={Sparkles}
        title="Hero Left Spotlight Card"
        action={<Badge variant={enabled ? "success" : "secondary"}>{enabled ? `${year} LIVE` : "Silhouette fallback"}</Badge>}
        description="Replaces the left-side student figure on the desktop hero (and shows a clickable promo bar on phones). Change the intake year, text, or link any time without touching code."
      />
      <CardContent>
        <ActionForm action={saveHeroPromoAction} className="space-y-4">
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border p-4 transition hover:bg-muted/40">
            <span>
              <span className="block font-semibold">Show Intake Promo Card on Hero</span>
              <span className="block text-xs text-muted-foreground">When turned off, the desktop hero switches back to the left student silhouette.</span>
            </span>
            <input type="checkbox" name="enabled" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-5 w-5 accent-[hsl(var(--primary))]" />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Batch / Intake Year" htmlFor="hp-year" hint="e.g. 2029, 2030">
              <Input id="hp-year" name="year" value={year} onChange={(e) => setYear(e.target.value)} required maxLength={20} />
            </Field>
            <Field label="Click Destination Link" htmlFor="hp-href" hint="e.g. /timetable?year=2029 or /timetable">
              <Input id="hp-href" name="href" value={href} onChange={(e) => setHref(e.target.value)} required maxLength={200} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Badge (English)" htmlFor="hp-badge-en">
              <Input id="hp-badge-en" name="badgeEn" defaultValue={initial.badgeEn} required maxLength={50} />
            </Field>
            <Field label="Badge (සිංහල)" htmlFor="hp-badge-si">
              <Input id="hp-badge-si" name="badgeSi" defaultValue={initial.badgeSi} required maxLength={50} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Headline (English)" htmlFor="hp-title-en">
              <Input id="hp-title-en" name="titleEn" defaultValue={initial.titleEn} required maxLength={120} />
            </Field>
            <Field label="Headline (සිංහල)" htmlFor="hp-title-si">
              <Input id="hp-title-si" name="titleSi" value={titleSi} onChange={(e) => setTitleSi(e.target.value)} required maxLength={120} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Subtitle (English)" htmlFor="hp-sub-en">
              <Textarea id="hp-sub-en" name="subtitleEn" defaultValue={initial.subtitleEn} rows={2} maxLength={220} />
            </Field>
            <Field label="Subtitle (සිංහල)" htmlFor="hp-sub-si">
              <Textarea id="hp-sub-si" name="subtitleSi" defaultValue={initial.subtitleSi} rows={2} maxLength={220} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Button Label (English)" htmlFor="hp-cta-en">
              <Input id="hp-cta-en" name="ctaEn" defaultValue={initial.ctaEn} required maxLength={50} />
            </Field>
            <Field label="Button Label (සිංහල)" htmlFor="hp-cta-si">
              <Input id="hp-cta-si" name="ctaSi" value={ctaSi} onChange={(e) => setCtaSi(e.target.value)} required maxLength={50} />
            </Field>
          </div>

          <div className="rounded-2xl border bg-[#06122c] p-4 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">Live card preview</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-2xl font-black">{year || "2029"} A/L</p>
                <p className="text-sm font-bold text-white/90">{titleSi || initial.titleEn}</p>
              </div>
              <span className="rounded-xl bg-brand-500 px-3.5 py-2 text-xs font-bold text-white">{ctaSi || initial.ctaEn} →</span>
            </div>
          </div>

          <SubmitButton pendingText="Saving…">Save hero promo card</SubmitButton>
        </ActionForm>
      </CardContent>
    </Card>
  );
}

type Row = TimetableEntry & { uid: number; isNew?: boolean };
let uidSeq = 0;

export function TimetableManagerForm({
  initial,
  centers,
  classes,
  defaultYear,
}: {
  initial: TimetableEntry[];
  centers: Center[];
  classes: { id: string; title: string; target_year: number | null }[];
  defaultYear: number;
}) {
  const [rows, setRows] = useState<Row[]>(() => initial.map((r) => ({ ...r, uid: ++uidSeq })));
  const [open, setOpen] = useState<Set<number>>(new Set());

  const centerOptions = [...centers.map((c) => c.key), ONLINE_KEY];

  const addRow = () => {
    const uid = ++uidSeq;
    setRows((prev) => [
      {
        id: "",
        batch_year: defaultYear,
        class_type: "Theory",
        title: `${defaultYear} A/L Combined Maths - Theory`,
        center_key: centers[0]?.key || ONLINE_KEY,
        hall_name: "",
        day_label: "සෙනසුරාදා / Saturday",
        time_label: "පෙ.ව. 8.00 – 11.30",
        fee_label: "",
        start_note: "",
        details: "",
        class_id: null,
        is_featured: true,
        is_active: true,
        sort_order: (prev.length + 1) * 10,
        uid,
        isNew: true,
      },
      ...prev,
    ]);
    setOpen((s) => new Set(s).add(uid));
  };

  const patch = (uid: number, p: Partial<Row>) => setRows((r) => r.map((x) => (x.uid === uid ? { ...x, ...p } : x)));
  const move = (idx: number, dir: number) =>
    setRows((r) => {
      const next = [...r];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return r;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  const toggle = (uid: number) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(uid)) n.delete(uid);
      else n.add(uid);
      return n;
    });

  const payload = JSON.stringify(
    rows.map(({ uid: _u, isNew: _n, ...rest }, idx) => ({
      ...rest,
      sort_order: (idx + 1) * 10,
    })),
  );

  return (
    <Card>
      <CardHeader
        icon={CalendarDays}
        title={`Public Class Timetable (${rows.length})`}
        action={
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-4 w-4" /> Add class slot
          </Button>
        }
        description="Manage all schedule entries shown at /timetable. Visitors can filter by batch year (e.g. 2029, 2028, 2027) and center."
      />
      <CardContent>
        <ActionForm action={saveTimetableAction} className="space-y-4">
          <input type="hidden" name="entries" value={payload} />
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {rows.map((r, i) => {
              const isOpen = open.has(r.uid) || r.isNew;
              return (
                <li key={r.uid}>
                  <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
                    <button
                      type="button"
                      onClick={() => toggle(r.uid)}
                      aria-expanded={isOpen}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 text-left"
                    >
                      <span className="inline-flex h-9 min-w-[3.5rem] shrink-0 items-center justify-center rounded-xl bg-brand-50 px-2 font-display text-xs font-extrabold text-brand-700">
                        {r.batch_year}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate font-display font-semibold">{r.title || "Untitled slot"}</span>
                          <Badge variant={r.is_active ? "success" : "secondary"}>{r.center_key}</Badge>
                          {r.is_featured ? <Badge variant="info">Featured</Badge> : null}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {r.hall_name ? `${r.hall_name} · ` : ""}{r.day_label} · {r.time_label}
                        </span>
                      </span>
                      <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                    </button>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button type="button" variant="ghost" size="icon" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp /></Button>
                      <Button type="button" variant="ghost" size="icon" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)}><ArrowDown /></Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove entry"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setRows((x) => x.filter((y) => y.uid !== r.uid))}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>

                  {isOpen ? (
                    <div className="space-y-3 border-t bg-muted/25 p-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                        <Field label="Batch Year" htmlFor={`tt-y-${r.uid}`}>
                          <Input id={`tt-y-${r.uid}`} type="number" min={2020} max={2099} value={r.batch_year} onChange={(e) => patch(r.uid, { batch_year: Number(e.target.value) || defaultYear })} />
                        </Field>
                        <Field label="Class Type" htmlFor={`tt-t-${r.uid}`}>
                          <Select id={`tt-t-${r.uid}`} value={r.class_type} onChange={(e) => patch(r.uid, { class_type: e.target.value })}>
                            {CLASS_TYPES.map((ct) => <option key={ct} value={ct}>{ct}</option>)}
                          </Select>
                        </Field>
                        <Field label="Center" htmlFor={`tt-c-${r.uid}`}>
                          <Select id={`tt-c-${r.uid}`} value={centerOptions.includes(r.center_key) ? r.center_key : "__custom"} onChange={(e) => e.target.value !== "__custom" && patch(r.uid, { center_key: e.target.value })}>
                            {centerOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                            {!centerOptions.includes(r.center_key) ? <option value="__custom">{r.center_key}</option> : null}
                          </Select>
                        </Field>
                        <Field label="Linked Store Class (optional)" htmlFor={`tt-cl-${r.uid}`}>
                          <Select id={`tt-cl-${r.uid}`} value={r.class_id ?? ""} onChange={(e) => patch(r.uid, { class_id: e.target.value || null })}>
                            <option value="">— Register / WhatsApp CTA —</option>
                            {classes.map((c) => <option key={c.id} value={c.id}>{c.target_year ? `${c.target_year} · ` : ""}{c.title}</option>)}
                          </Select>
                        </Field>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="Card Title" htmlFor={`tt-ti-${r.uid}`}>
                          <Input id={`tt-ti-${r.uid}`} value={r.title} onChange={(e) => patch(r.uid, { title: e.target.value })} maxLength={140} />
                        </Field>
                        <Field label="Hall / Institute Name" htmlFor={`tt-ha-${r.uid}`}>
                          <Input id={`tt-ha-${r.uid}`} value={r.hall_name} onChange={(e) => patch(r.uid, { hall_name: e.target.value })} placeholder="සක්යා (Sakya) · පානදුර" maxLength={140} />
                        </Field>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <Field label="Day(s)" htmlFor={`tt-da-${r.uid}`}>
                          <Input id={`tt-da-${r.uid}`} value={r.day_label} onChange={(e) => patch(r.uid, { day_label: e.target.value })} placeholder="සෙනසුරාදා / Saturday" maxLength={100} />
                        </Field>
                        <Field label="Time" htmlFor={`tt-tm-${r.uid}`}>
                          <Input id={`tt-tm-${r.uid}`} value={r.time_label} onChange={(e) => patch(r.uid, { time_label: e.target.value })} placeholder="පෙ.ව. 8.00 – 11.30" maxLength={120} />
                        </Field>
                        <Field label="Fee / Offer Label" htmlFor={`tt-fe-${r.uid}`}>
                          <Input id={`tt-fe-${r.uid}`} value={r.fee_label} onChange={(e) => patch(r.uid, { fee_label: e.target.value })} placeholder="පළමු දින නොමිලේ / LKR 3,500" maxLength={100} />
                        </Field>
                      </div>

                      <Field label="Highlight / Start Note" htmlFor={`tt-sn-${r.uid}`}>
                        <Input id={`tt-sn-${r.uid}`} value={r.start_note} onChange={(e) => patch(r.uid, { start_note: e.target.value })} placeholder="නව කණ්ඩායම් ලියාපදිංචිය දැන් ඇරඹේ" maxLength={180} />
                      </Field>

                      <Field label="Details (one bullet per line)" htmlFor={`tt-de-${r.uid}`}>
                        <Textarea id={`tt-de-${r.uid}`} value={r.details} onChange={(e) => patch(r.uid, { details: e.target.value })} rows={3} maxLength={1500} />
                      </Field>

                      <div className="flex flex-wrap gap-5 pt-1 text-sm">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={r.is_featured} onChange={(e) => patch(r.uid, { is_featured: e.target.checked })} className="h-4 w-4 accent-[hsl(var(--primary))]" />
                          <span className="font-medium">Highlight as “New Intake”</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={r.is_active} onChange={(e) => patch(r.uid, { is_active: e.target.checked })} className="h-4 w-4 accent-[hsl(var(--primary))]" />
                          <span className="font-medium">Visible on /timetable</span>
                        </label>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <SubmitButton pendingText="Saving timetable…">Save all timetable entries</SubmitButton>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
