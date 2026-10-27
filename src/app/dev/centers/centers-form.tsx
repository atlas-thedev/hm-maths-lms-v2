"use client";
import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, MapPin, Plus, Trash2, Wifi } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { Badge, Button, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Center } from "@/lib/centers";
import { cn } from "@/lib/utils";
import { saveCentersAction } from "../content-actions";

type Row = Center & { isNew: boolean; uid: number };
let uid = 0;
const blank = (): Row => ({ key: "", en: "", si: "", venueEn: "", venueSi: "", lat: null, lon: null, isNew: true, uid: ++uid });

export function CentersForm({ initial, usage }: { initial: Center[]; usage: Record<string, { students: number; classes: number }> }) {
  const [rows, setRows] = useState<Row[]>(() => initial.map((c) => ({ ...c, isNew: false, uid: ++uid })));
  const [open, setOpen] = useState<Set<number>>(new Set());
  const patch = (id: number, p: Partial<Row>) => setRows((r) => r.map((x) => (x.uid === id ? { ...x, ...p } : x)));
  const move = (i: number, d: number) => setRows((r) => { const n = [...r]; const j = i + d; if (j < 0 || j >= n.length) return r; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const toggle = (id: number) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const num = (v: string) => (v.trim() === "" ? null : Number(v));
  const tools = (r: Row, i: number) => (
    <>
      <Button type="button" variant="ghost" size="icon" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp /></Button>
      <Button type="button" variant="ghost" size="icon" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)}><ArrowDown /></Button>
      <Button type="button" variant="ghost" size="icon" aria-label="Remove center" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setRows((x) => x.filter((y) => y.uid !== r.uid))}><Trash2 /></Button>
    </>
  );
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const payload = JSON.stringify(rows.map(({ isNew, uid: _u, ...c }) => { void isNew; return { ...c, key: c.key.trim() || c.en.trim() }; }));

  return (
    <ActionForm action={saveCentersAction} className="space-y-4">
      <input type="hidden" name="centers" value={payload} />
      <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-soft">
        {rows.map((r, i) => {
          const u = usage[r.key];
          const isOpen = open.has(r.uid) || r.isNew;
          return (
            <li key={r.uid}>
              <div className="flex items-center gap-1.5 px-3 py-2.5 sm:gap-2 sm:px-4">
                <button type="button" onClick={() => toggle(r.uid)} aria-expanded={isOpen} aria-controls={`c-${r.uid}`}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-primary"><MapPin className="h-[18px] w-[18px]" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="truncate font-display font-semibold">{r.en || r.key || "New center"}</span>
                      {r.si ? <span className="truncate text-sm text-muted-foreground">{r.si}</span> : null}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      {r.isNew ? <Badge variant="warning">New</Badge> : <span>{plural(u?.students ?? 0, "student")} · {(u?.classes ?? 0) === 1 ? "1 class" : `${u?.classes ?? 0} classes`}</span>}
                      {r.lat !== null && r.lon !== null ? <Badge variant="secondary">On map</Badge> : null}
                      {r.venueEn ? <span className="truncate">· {r.venueEn}</span> : null}
                    </span>
                  </span>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition", isOpen && "rotate-180")} />
                </button>
                <div className="hidden shrink-0 gap-0.5 sm:flex">{tools(r, i)}</div>
              </div>
              {isOpen && (
                <div id={`c-${r.uid}`} className="grid grid-cols-1 gap-x-4 gap-y-3 border-t bg-muted/30 px-4 py-4 sm:grid-cols-2">
                  <div className="flex items-center justify-between gap-2 border-b pb-3 sm:hidden sm:col-span-2"><span className="text-sm font-medium">Order / remove</span><span className="flex gap-0.5">{tools(r, i)}</span></div>
                  {r.isNew && (
                    <Field label="ID (can't be changed later)" htmlFor={`k-${r.uid}`} className="sm:col-span-2" hint="Used behind the scenes on students and classes. English letters, e.g. Nugegoda.">
                      <Input id={`k-${r.uid}`} value={r.key} onChange={(e) => patch(r.uid, { key: e.target.value })} placeholder="Nugegoda" maxLength={40} />
                    </Field>
                  )}
                  <Field label="Name (English)" htmlFor={`e-${r.uid}`}><Input id={`e-${r.uid}`} value={r.en} onChange={(e) => patch(r.uid, { en: e.target.value })} maxLength={80} placeholder="Nugegoda" /></Field>
                  <Field label="Name (සිංහල)" htmlFor={`s-${r.uid}`}><Input id={`s-${r.uid}`} value={r.si} onChange={(e) => patch(r.uid, { si: e.target.value })} maxLength={80} placeholder="නුගේගොඩ" /></Field>
                  <Field label="Hall / institute (English)" htmlFor={`ve-${r.uid}`}><Input id={`ve-${r.uid}`} value={r.venueEn} onChange={(e) => patch(r.uid, { venueEn: e.target.value })} maxLength={80} placeholder="optional" /></Field>
                  <Field label="Hall / institute (සිංහල)" htmlFor={`vs-${r.uid}`}><Input id={`vs-${r.uid}`} value={r.venueSi} onChange={(e) => patch(r.uid, { venueSi: e.target.value })} maxLength={80} placeholder="optional" /></Field>
                  <Field label="Latitude" htmlFor={`la-${r.uid}`}><Input id={`la-${r.uid}`} inputMode="decimal" value={r.lat ?? ""} onChange={(e) => patch(r.uid, { lat: num(e.target.value) })} placeholder="6.8649" /></Field>
                  <Field label="Longitude" htmlFor={`lo-${r.uid}`}><Input id={`lo-${r.uid}`} inputMode="decimal" value={r.lon ?? ""} onChange={(e) => patch(r.uid, { lon: num(e.target.value) })} placeholder="79.8997" /></Field>
                  <p className="text-xs text-muted-foreground sm:col-span-2">Latitude and longitude place the dot on the home page map and tell Google where the class is. In Google Maps, right-click the place and tap the numbers to copy them. Leave both empty for no dot.</p>
                </div>
              )}
            </li>
          );
        })}
        <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <span className="flex items-center gap-2.5 text-sm"><span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-primary"><Wifi className="h-[18px] w-[18px]" /></span><span><b>Online</b> <Badge variant="secondary">built in</Badge><span className="block text-xs text-muted-foreground">Always available, always last.</span></span></span>
          <Button type="button" variant="outline" onClick={() => setRows((r) => [...r, blank()])}><Plus /> Add a center</Button>
        </li>
      </ul>
      <SubmitButton pendingText="Saving…">Save centers</SubmitButton>
    </ActionForm>
  );
}
