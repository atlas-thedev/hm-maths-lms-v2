"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, HelpCircle, Plus, Trash2 } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { Badge, Button, Field, Input, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FaqItem } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { saveFaqsAction } from "../content-actions";

type Row = FaqItem & { isNew?: boolean; uid: number };
let uid = 0;

const blankFaq = (): Row => ({
  id: `faq-${Date.now()}-${++uid}`,
  qEn: "",
  aEn: "",
  qSi: "",
  aSi: "",
  isNew: true,
  uid,
});

export function FaqForm({ initial }: { initial: FaqItem[] }) {
  const [rows, setRows] = useState<Row[]>(() =>
    initial.map((f) => ({ ...f, uid: ++uid }))
  );
  const [open, setOpen] = useState<Set<number>>(new Set());

  const patch = (id: number, p: Partial<Row>) =>
    setRows((r) => r.map((x) => (x.uid === id ? { ...x, ...p } : x)));

  const move = (i: number, d: number) =>
    setRows((r) => {
      const n = [...r];
      const j = i + d;
      if (j < 0 || j >= n.length) return r;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  const toggle = (id: number) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const tools = (r: Row, i: number) => (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Move up"
        disabled={i === 0}
        onClick={() => move(i, -1)}
      >
        <ArrowUp />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Move down"
        disabled={i === rows.length - 1}
        onClick={() => move(i, 1)}
      >
        <ArrowDown />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Remove FAQ"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setRows((x) => x.filter((y) => y.uid !== r.uid))}
      >
        <Trash2 />
      </Button>
    </>
  );

  const payload = JSON.stringify(
    rows.map(({ uid: _u, isNew: _n, ...rest }) => ({
      ...rest,
      qEn: rest.qEn.trim(),
      aEn: rest.aEn.trim(),
      qSi: rest.qSi.trim(),
      aSi: rest.aSi.trim(),
    }))
  );

  return (
    <ActionForm action={saveFaqsAction} className="space-y-4">
      <input type="hidden" name="faqs" value={payload} />
      <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-soft">
        {rows.map((r, i) => {
          const isOpen = open.has(r.uid) || r.isNew;
          const label = r.qEn || r.qSi || `Question #${i + 1}`;
          return (
            <li key={r.uid}>
              <div className="flex items-center gap-1.5 px-3 py-2.5 sm:gap-2 sm:px-4">
                <button
                  type="button"
                  onClick={() => toggle(r.uid)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-${r.uid}`}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-primary">
                    <HelpCircle className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="truncate font-display font-semibold">
                        {label}
                      </span>
                      {r.isNew && <Badge variant="warning">New</Badge>}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {r.qSi ? `${r.qSi} · ` : ""}
                      {r.aEn || r.aSi ? "Has answer" : "No answer yet"}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
                <div className="hidden shrink-0 gap-0.5 sm:flex">{tools(r, i)}</div>
              </div>

              {isOpen && (
                <div
                  id={`faq-${r.uid}`}
                  className="space-y-3 border-t bg-muted/30 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-2 border-b pb-3 sm:hidden">
                    <span className="text-sm font-medium">Order / remove</span>
                    <span className="flex gap-0.5">{tools(r, i)}</span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Question (English)" htmlFor={`qe-${r.uid}`}>
                      <Input
                        id={`qe-${r.uid}`}
                        value={r.qEn}
                        onChange={(e) => patch(r.uid, { qEn: e.target.value })}
                        placeholder="e.g. How do I join a class?"
                        maxLength={300}
                      />
                    </Field>
                    <Field label="Question (සිංහල)" htmlFor={`qs-${r.uid}`}>
                      <Input
                        id={`qs-${r.uid}`}
                        value={r.qSi}
                        onChange={(e) => patch(r.uid, { qSi: e.target.value })}
                        placeholder="උදා: පන්තියකට සම්බන්ධ වන්නේ කෙසේද?"
                        maxLength={300}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Answer (English)" htmlFor={`ae-${r.uid}`}>
                      <Textarea
                        id={`ae-${r.uid}`}
                        rows={3}
                        value={r.aEn}
                        onChange={(e) => patch(r.uid, { aEn: e.target.value })}
                        placeholder="Explain clearly in English..."
                        maxLength={2000}
                      />
                    </Field>
                    <Field label="Answer (සිංහල)" htmlFor={`as-${r.uid}`}>
                      <Textarea
                        id={`as-${r.uid}`}
                        rows={3}
                        value={r.aSi}
                        onChange={(e) => patch(r.uid, { aSi: e.target.value })}
                        placeholder="සිංහලෙන් පැහැදිලි කරන්න..."
                        maxLength={2000}
                      />
                    </Field>
                  </div>
                </div>
              )}
            </li>
          );
        })}
        <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <span className="text-xs text-muted-foreground">
            {rows.length} question{rows.length === 1 ? "" : "s"} total. Reorder with the arrows.
          </span>
          <Button
            type="button"
            variant="outline"
            onClick={() => setRows((r) => [...r, blankFaq()])}
          >
            <Plus /> Add an FAQ
          </Button>
        </li>
      </ul>
      <SubmitButton pendingText="Saving…">Save FAQ</SubmitButton>
    </ActionForm>
  );
}
