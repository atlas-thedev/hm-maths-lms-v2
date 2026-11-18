"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, CalendarDays, ChevronDown, Plus, Sparkles, Trash2 } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { Badge, Button, Card, CardContent, CardHeader, Field, Input, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { ONLINE_KEY, type Center } from "@/lib/centers";
import type { HeroPromoSettings } from "@/lib/settings";
import type { TimetableEntry, TimetableSlot } from "@/lib/timetable";
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
        description="Replaces the left-side student figure on the desktop hero (and shows a clickable promo bar on tablets/phones). Change the intake year, text, or link any time without touching code."
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

          <div className="rounded-2xl border bg-[#081024] p-4 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">Live card preview</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-2xl font-black">{year || "2029"} A/L</p>
                <p className="text-sm font-bold text-white/90">{titleSi || initial.titleEn}</p>
              </div>
              <span className="rounded-full bg-brand-500 px-3.5 py-2 text-xs font-bold text-white">{ctaSi || initial.ctaEn} →</span>
            </div>
          </div>

          <SubmitButton pendingText="Saving…">Save hero promo card</SubmitButton>
        </ActionForm>
      </CardContent>
    </Card>
  );
}

type SlotRow = TimetableSlot & { suid: number };
type Row = Omit<TimetableEntry, "slots"> & { uid: number; isNew?: boolean; slots: SlotRow[] };
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
  const [rows, setRows] = useState<Row[]>(() =>
    initial.map((r) => ({
      ...r,
      uid: ++uidSeq,
      slots: r.slots.map((s) => ({ ...s, suid: ++uidSeq })),
    })),
  );
  const [open, setOpen] = useState<Set<number>>(new Set());

  const centerOptions = [...centers.map((c) => c.key), ONLINE_KEY];

  const defaultHall = (key: string) => {
    const found = centers.find((c) => c.key === key);
    if (!found) return key === ONLINE_KEY ? "Zoom Live + HD Recordings" : "";
    return found.venueSi ? `${found.venueSi} (${found.venueEn})` : "";
  };

  const addRow = () => {
    const uid = ++uidSeq;
    const firstCenter = centers[0]?.key || ONLINE_KEY;
    setRows((prev) => [
      {
        id: "",
        batch_year: defaultYear,
        class_type: "Theory",
        title: `${defaultYear} A/L Combined Maths - Theory`,
        center_key: firstCenter,
        hall_name: "",
        day_label: "සෙනසුරාදා / Sat",
        time_label: "පෙ.ව. 8.00 – 11.30",
        fee_label: "",
        start_note: "",
        details: "",
        slots: [
          {
            suid: ++uidSeq,
            center_key: firstCenter,
            hall_name: defaultHall(firstCenter),
            day_label: "සෙනසුරාදා / Sat",
            time_label: "පෙ.ව. 8.00 – 11.30",
          },
        ],
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

  const addSlot = (uid: number) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.uid !== uid) return row;
        const used = new Set(row.slots.map((s) => s.center_key));
        const nextCenter = centerOptions.find((c) => !used.has(c)) ?? ONLINE_KEY;
        return {
          ...row,
          slots: [
            ...row.slots,
            {
              suid: ++uidSeq,
              center_key: nextCenter,
              hall_name: defaultHall(nextCenter),
              day_label: "සෙනසුරාදා",
              time_label: "පෙ.ව. 8.00 – 11.30",
            },
          ],
        };
      }),
    );
  };

  const patchSlot = (uid: number, suid: number, p: Partial<SlotRow>) =>
    setRows((prev) =>
      prev.map((row) =>
        row.uid !== uid
          ? row
          : { ...row, slots: row.slots.map((s) => (s.suid === suid ? { ...s, ...p } : s)) },
      ),
    );

  const removeSlot = (uid: number, suid: number) =>
    setRows((prev) =>
      prev.map((row) =>
        row.uid !== uid ? row : { ...row, slots: row.slots.filter((s) => s.suid !== suid) },
      ),
    );

  const payload = JSON.stringify(
    rows.map(({ uid: _u, isNew: _n, slots, ...rest }, idx) => ({
      ...rest,
      details: "",
      slots: slots.map(({ suid: _su, ...sRest }) => sRest),
      sort_order: (idx + 1) * 10,
    })),
  );

  return (
    <Card>
      <CardHeader
        icon={CalendarDays}
        title={`Public Class Cards (${rows.length})`}
        action={
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-4 w-4" /> Add class card
          </Button>
        }
        description="Each entry is ONE clean card at /timetable, containing all physical institutes & Online times neatly grouped inside it."
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
                          <span className="truncate font-display font-semibold">{r.title || "Untitled class"}</span>
                          <Badge variant={r.is_active ? "success" : "secondary"}>{r.class_type}</Badge>
                          <Badge variant="outline">{r.slots.length} center{r.slots.length === 1 ? "" : "s"}</Badge>
                          {r.is_featured ? <Badge variant="info">New Intake</Badge> : null}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {r.slots.map((s) => s.center_key).join(" · ") || "No institutes added yet"}
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
                    <div className="space-y-4 border-t bg-muted/25 p-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <Field label="Batch Year" htmlFor={`tt-y-${r.uid}`}>
                          <Input id={`tt-y-${r.uid}`} type="number" min={2020} max={2099} value={r.batch_year} onChange={(e) => patch(r.uid, { batch_year: Number(e.target.value) || defaultYear })} />
                        </Field>
                        <Field label="Class Type" htmlFor={`tt-t-${r.uid}`}>
                          <Select id={`tt-t-${r.uid}`} value={r.class_type} onChange={(e) => patch(r.uid, { class_type: e.target.value })}>
                            {CLASS_TYPES.map((ct) => <option key={ct} value={ct}>{ct}</option>)}
                          </Select>
                        </Field>
                        <Field label="Linked Store Class (optional)" htmlFor={`tt-cl-${r.uid}`}>
                          <Select id={`tt-cl-${r.uid}`} value={r.class_id ?? ""} onChange={(e) => patch(r.uid, { class_id: e.target.value || null })}>
                            <option value="">— Register Free / WhatsApp CTA —</option>
                            {classes.map((c) => <option key={c.id} value={c.id}>{c.target_year ? `${c.target_year} · ` : ""}{c.title}</option>)}
                          </Select>
                        </Field>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="Class Card Title" htmlFor={`tt-ti-${r.uid}`}>
                          <Input id={`tt-ti-${r.uid}`} value={r.title} onChange={(e) => patch(r.uid, { title: e.target.value })} maxLength={140} />
                        </Field>
                        <Field label="Fee / Offer Label" htmlFor={`tt-fe-${r.uid}`}>
                          <Input id={`tt-fe-${r.uid}`} value={r.fee_label} onChange={(e) => patch(r.uid, { fee_label: e.target.value })} placeholder="පළමු දින නොමිලේ / LKR 3,500" maxLength={100} />
                        </Field>
                      </div>

                      <Field label="Short Highlight Note (optional, 1 line)" htmlFor={`tt-sn-${r.uid}`}>
                        <Input id={`tt-sn-${r.uid}`} value={r.start_note} onChange={(e) => patch(r.uid, { start_note: e.target.value })} placeholder="නව කණ්ඩායම් ලියාපදිංචිය දැන් ඇරඹේ" maxLength={180} />
                      </Field>

                      {/* Institutes / Schedule Rows inside this card */}
                      <div className="space-y-2 rounded-2xl border bg-background p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Institute &amp; Center Schedules ({r.slots.length})
                          </span>
                          <Button type="button" variant="outline" size="sm" onClick={() => addSlot(r.uid)}>
                            <Plus className="h-3.5 w-3.5" /> Add institute / time
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {r.slots.map((s) => (
                            <div key={s.suid} className="grid grid-cols-1 items-end gap-2 rounded-xl border bg-muted/20 p-2.5 sm:grid-cols-[130px_1fr_1fr_1fr_auto]">
                              <Field label="Center" htmlFor={`sl-c-${s.suid}`}>
                                <Select
                                  id={`sl-c-${s.suid}`}
                                  value={centerOptions.includes(s.center_key) ? s.center_key : "__custom"}
                                  onChange={(e) => {
                                    if (e.target.value === "__custom") return;
                                    const nextKey = e.target.value;
                                    patchSlot(r.uid, s.suid, { center_key: nextKey, hall_name: defaultHall(nextKey) || s.hall_name });
                                  }}
                                >
                                  {centerOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                                  {!centerOptions.includes(s.center_key) ? <option value="__custom">{s.center_key}</option> : null}
                                </Select>
                              </Field>
                              <Field label="Hall / Institute" htmlFor={`sl-h-${s.suid}`}>
                                <Input id={`sl-h-${s.suid}`} value={s.hall_name} onChange={(e) => patchSlot(r.uid, s.suid, { hall_name: e.target.value })} placeholder="සක්යා (Sakya)" maxLength={140} />
                              </Field>
                              <Field label="Day" htmlFor={`sl-d-${s.suid}`}>
                                <Input id={`sl-d-${s.suid}`} value={s.day_label} onChange={(e) => patchSlot(r.uid, s.suid, { day_label: e.target.value })} placeholder="සෙනසුරාදා" maxLength={100} />
                              </Field>
                              <Field label="Time" htmlFor={`sl-t-${s.suid}`}>
                                <Input id={`sl-t-${s.suid}`} value={s.time_label} onChange={(e) => patchSlot(r.uid, s.suid, { time_label: e.target.value })} placeholder="පෙ.ව. 8.00 – 11.30" maxLength={120} />
                              </Field>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Remove institute row"
                                disabled={r.slots.length <= 1}
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => removeSlot(r.uid, s.suid)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

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
          <SubmitButton pendingText="Saving timetable…">Save all timetable cards</SubmitButton>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
