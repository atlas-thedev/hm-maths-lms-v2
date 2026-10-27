"use client";
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { Badge, Button } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";
import { saveSiteTextAction } from "../content-actions";

export interface Row { path: string; def: string; value: string }

export function TextRows({ lang, rows }: { lang: "en" | "si"; rows: Row[] }) {
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(rows.map((r) => [r.path, r.value])));
  return (
    <ActionForm action={saveSiteTextAction} className="space-y-3">
      <input type="hidden" name="lang" value={lang} />
      <ul className="space-y-3">
        {rows.map((r) => {
          const v = vals[r.path] ?? r.value;
          const edited = v.trim() !== r.def;
          const lines = Math.min(8, Math.max(1, Math.ceil(v.length / 70) + v.split("\n").length - 1));
          return (
            <li key={r.path} className={cn("rounded-2xl border bg-card p-3.5", edited && "border-primary/40 ring-1 ring-primary/10")}>
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <code className="break-all rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{r.path.split(".").slice(1).join(" › ")}</code>
                {edited && <Badge variant="default">Changed</Badge>}
                {edited && <Button type="button" variant="ghost" size="sm" className="ml-auto h-7 px-2 text-xs" onClick={() => setVals((s) => ({ ...s, [r.path]: r.def }))}><RotateCcw /> Original</Button>}
              </div>
              <textarea name={`t:${r.path}`} value={v} onChange={(e) => setVals((s) => ({ ...s, [r.path]: e.target.value }))} rows={lines} spellCheck={lang === "en"} aria-label={r.path}
                className="w-full resize-y rounded-xl border bg-background px-3 py-2 text-base leading-relaxed focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring sm:text-sm" />
              {edited && <p className="mt-1.5 text-xs text-muted-foreground"><b>Original:</b> {r.def}</p>}
            </li>
          );
        })}
      </ul>
      <div className="sticky bottom-3 z-10 flex justify-end"><SubmitButton className="shadow-lg" pendingText="Saving…">Save changes on this page</SubmitButton></div>
    </ActionForm>
  );
}
