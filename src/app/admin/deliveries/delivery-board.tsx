"use client";
import { useState } from "react";
import { BookOpen, Check, Copy, Hand, Package, PackageCheck, Pencil, Phone, Printer, RotateCcw, Send, Truck, Undo2, X } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { Badge, Button, Input, Select, Textarea, buttonVariants, cardVariants } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { bulkDeliveryAction, updateDeliveryAction } from "./actions";

export type BoardRow = {
  id: string; kind: "class_tute" | "order"; status: string; method: "post" | "class";
  name: string; sid: string | null; phone: string | null; item: string; address: string | null;
  courier: string | null; tracking: string | null; note: string | null; when: string;
};

/** Couriers offered in the "posted" form (any other name can be typed). */
const COURIERS = ["SL Post", "Speed Post", "Registered Post", "Prompt Xpress", "Domex", "Koombiyo", "Pronto", "Certis Lanka"];
const TONE: Record<string, "warning" | "info" | "default" | "success" | "destructive" | "secondary"> = {
  to_pack: "warning", packed: "info", posted: "default", delivered: "success", returned: "destructive", skipped: "secondary",
};

/**
 * Parcels to send, with checkboxes for bulk changes. Each row moves along to_pack → packed → posted → delivered
 * with one tap; "Posted" first asks for courier + tracking number. Rows handed over at a physical class skip
 * the post steps ("Handed over").
 */
export function DeliveryBoard({ rows }: { rows: BoardRow[] }) {
  const t = useT("admin.deliveries");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [courier, setCourier] = useState("");
  const all = rows.length > 0 && rows.every((r) => picked.has(r.id));
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const ids = [...picked].filter((id) => rows.some((r) => r.id === id));

  return (
    <div className="space-y-3 pb-24">
      <datalist id="couriers">{COURIERS.map((c) => <option key={c} value={c} />)}</datalist>
      <label className="flex w-fit cursor-pointer items-center gap-2 px-1 text-sm font-medium text-muted-foreground">
        <input type="checkbox" checked={all} onChange={() => setPicked(all ? new Set() : new Set(rows.map((r) => r.id)))} className="h-4 w-4 accent-[hsl(var(--primary))]" />
        {t("selectAll", { n: rows.length })}
      </label>
      <ul className="space-y-2">
        {rows.map((r) => <Row key={r.id} r={r} picked={picked.has(r.id)} onPick={() => toggle(r.id)} />)}
      </ul>

      {ids.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 px-3 lg:bottom-4 lg:left-[272px]">
          <ActionForm action={bulkDeliveryAction} onSuccess={() => setPicked(new Set())}
            className="mx-auto flex max-w-4xl flex-wrap items-center gap-2 rounded-2xl border border-border/80 bg-card/95 p-3 shadow-2xl backdrop-blur dark:border-white/10">
            <input type="hidden" name="ids" value={ids.join(",")} />
            <span className="mr-1 text-sm font-semibold">{t("selected", { n: ids.length })}</span>
            <SubmitButton name="status" value="packed" size="sm" variant="outline"><PackageCheck /> {t("act.packed")}</SubmitButton>
            <Input name="courier" list="couriers" value={courier} onChange={(e) => setCourier(e.target.value)} placeholder={t("courierPh")} className="h-9 w-36 sm:w-40" />
            <SubmitButton name="status" value="posted" size="sm"><Send /> {t("act.posted")}</SubmitButton>
            <SubmitButton name="status" value="delivered" size="sm" variant="outline"><Check /> {t("act.delivered")}</SubmitButton>
            <a href={`/admin/deliveries/labels?ids=${ids.join(",")}`} target="_blank" rel="noreferrer" className={buttonVariants({ size: "sm", variant: "secondary" })}><Printer /> {t("labels")}</a>
            <Button type="button" size="sm" variant="ghost" onClick={() => setPicked(new Set())} aria-label={t("clearSelection")}><X /></Button>
          </ActionForm>
        </div>
      )}
    </div>
  );
}

function Row({ r, picked, onPick }: { r: BoardRow; picked: boolean; onPick: () => void }) {
  const t = useT("admin.deliveries");
  const [mode, setMode] = useState<"none" | "post" | "edit">("none");
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText([r.name, r.address, r.phone].filter(Boolean).join("\n")); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
  };
  const statusButton = (status: string, label: string, Icon: typeof Check, variant: "default" | "outline" | "ghost" = "outline") => (
    <ActionForm action={updateDeliveryAction}>
      <input type="hidden" name="id" value={r.id} />
      <SubmitButton name="status" value={status} size="sm" variant={variant}><Icon /> {label}</SubmitButton>
    </ActionForm>
  );

  return (
    <li className={cn(cardVariants(), "p-3 sm:p-4", picked && "ring-2 ring-primary/40")}>
      <div className="flex gap-3">
        <input type="checkbox" checked={picked} onChange={onPick} aria-label={t("pick", { name: r.name })} className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]" />
        <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto] md:items-start">
          <div className="min-w-0">
            <p className="truncate font-semibold">{r.name}</p>
            <p className="flex flex-wrap items-center gap-x-2 font-mono text-xs text-muted-foreground">
              {r.sid}{r.phone && <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1 hover:text-primary"><Phone className="h-3 w-3" />{r.phone}</a>}
            </p>
            <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm">
              {r.kind === "order" ? <Package className="h-4 w-4 shrink-0 text-primary" /> : <BookOpen className="h-4 w-4 shrink-0 text-primary" />}
              <span className="min-w-0 font-medium">{r.item}</span>
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Badge variant={TONE[r.status] ?? "secondary"}>{t(`status.${r.status}`)}</Badge>
              {r.method === "class" && <Badge variant="info"><Hand /> {t("atClass")}</Badge>}
              {r.kind === "order" && <Badge variant="secondary">{t("book")}</Badge>}
              <span className="text-[11px] text-muted-foreground">{r.when}</span>
            </div>
            {r.note && <p className="mt-1 text-xs text-muted-foreground">{r.note}</p>}
          </div>

          <div className="min-w-0 rounded-xl bg-muted/50 p-2.5 text-xs">
            {r.address
              ? <p className="whitespace-pre-line leading-relaxed">{r.address}</p>
              : <p className="font-semibold text-warning-soft-foreground">{t("noAddress")}</p>}
            {(r.courier || r.tracking) && <p className="mt-1.5 flex items-center gap-1 font-semibold"><Truck className="h-3.5 w-3.5" />{[r.courier, r.tracking].filter(Boolean).join(" · ")}</p>}
            <button type="button" onClick={copy} className="mt-1.5 inline-flex items-center gap-1 font-semibold text-primary hover:underline">
              <Copy className="h-3 w-3" />{copied ? t("copied") : t("copy")}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 md:max-w-[17rem] md:justify-end">
            {r.status === "to_pack" && r.method === "post" && statusButton("packed", t("act.packed"), PackageCheck)}
            {(r.status === "to_pack" || r.status === "packed") && r.method === "post" && (
              <Button size="sm" onClick={() => setMode(mode === "post" ? "none" : "post")}><Send /> {t("act.posted")}</Button>
            )}
            {(r.status === "to_pack" || r.status === "packed") && r.method === "class" && statusButton("delivered", t("act.handed"), Hand, "default")}
            {r.status === "posted" && statusButton("delivered", t("act.delivered"), Check, "default")}
            {r.status === "posted" && statusButton("returned", t("act.returned"), RotateCcw)}
            {["delivered", "returned", "skipped", "packed", "posted"].includes(r.status) && statusButton("to_pack", t("act.undo"), Undo2, "ghost")}
            <Button size="sm" variant="ghost" onClick={() => setMode(mode === "edit" ? "none" : "edit")} aria-label={t("edit")}><Pencil /></Button>
          </div>
        </div>
      </div>

      {mode === "post" && (
        <ActionForm action={updateDeliveryAction} onSuccess={() => setMode("none")} className="mt-3 flex flex-wrap items-end gap-2 border-t pt-3">
          <input type="hidden" name="id" value={r.id} />
          <input type="hidden" name="status" value="posted" />
          <label className="grid gap-1 text-xs font-medium">{t("courier")}
            <Input name="courier" list="couriers" defaultValue={r.courier ?? ""} placeholder={t("courierPh")} className="h-9 w-44" />
          </label>
          <label className="grid gap-1 text-xs font-medium">{t("tracking")}
            <Input name="tracking_no" defaultValue={r.tracking ?? ""} placeholder={t("trackingPh")} className="h-9 w-48 font-mono" autoFocus />
          </label>
          <SubmitButton size="sm"><Send /> {t("act.confirmPosted")}</SubmitButton>
          <p className="w-full text-xs text-muted-foreground">{t("postedHint")}</p>
        </ActionForm>
      )}

      {mode === "edit" && (
        <ActionForm action={updateDeliveryAction} onSuccess={() => setMode("none")} className="mt-3 grid gap-3 border-t pt-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={r.id} />
          <label className="grid gap-1 text-xs font-medium sm:row-span-2">{t("address")}
            <Textarea name="address" defaultValue={r.address ?? ""} rows={4} maxLength={600} />
          </label>
          <label className="grid gap-1 text-xs font-medium">{t("phone")}<Input name="phone" defaultValue={r.phone ?? ""} inputMode="tel" maxLength={30} /></label>
          <label className="grid gap-1 text-xs font-medium">{t("method")}
            <Select name="method" defaultValue={r.method}><option value="post">{t("byPost")}</option><option value="class">{t("atClass")}</option></Select>
          </label>
          <label className="grid gap-1 text-xs font-medium">{t("courier")}<Input name="courier" list="couriers" defaultValue={r.courier ?? ""} maxLength={60} /></label>
          <label className="grid gap-1 text-xs font-medium">{t("tracking")}<Input name="tracking_no" defaultValue={r.tracking ?? ""} maxLength={80} className="font-mono" /></label>
          <label className="grid gap-1 text-xs font-medium sm:col-span-2">{t("note")}<Input name="note" defaultValue={r.note ?? ""} maxLength={300} /></label>
          <div className="sm:col-span-2"><SubmitButton size="sm">{t("save")}</SubmitButton></div>
        </ActionForm>
      )}
    </li>
  );
}
