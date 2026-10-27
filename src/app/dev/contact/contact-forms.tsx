"use client";
import { useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, Building2, Link2, Phone, Plus, Radio, Trash2, Video, Youtube } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { FileUpload } from "@/components/file-upload";
import { Badge, Button, Card, CardContent, CardHeader, Field, Input, Select } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import type { BankAccount, Channel, SiteData, Video as VideoRow } from "@/lib/site-data";
import { saveSiteDataAction } from "../content-actions";

/** One card = one form: a hidden `section` plus a `data` JSON blob built from the card's state. */
function SectionForm({ section, data, children, button = "Save" }: { section: string; data: unknown; children: React.ReactNode; button?: string }) {
  return (
    <ActionForm action={saveSiteDataAction} className="space-y-4">
      <input type="hidden" name="section" value={section} />
      <input type="hidden" name="data" value={JSON.stringify(data)} />
      {children}
      <SubmitButton pendingText="Saving…">{button}</SubmitButton>
    </ActionForm>
  );
}

function move<T>(list: T[], i: number, d: number): T[] { const n = [...list]; const j = i + d; if (j < 0 || j >= n.length) return list; [n[i], n[j]] = [n[j], n[i]]; return n; }

function RowTools({ i, n, onMove, onRemove }: { i: number; n: number; onMove: (d: number) => void; onRemove: () => void }) {
  return (
    <div className="flex gap-1">
      <Button type="button" variant="ghost" size="icon" aria-label="Move up" disabled={i === 0} onClick={() => onMove(-1)}><ArrowUp /></Button>
      <Button type="button" variant="ghost" size="icon" aria-label="Move down" disabled={i === n - 1} onClick={() => onMove(1)}><ArrowDown /></Button>
      <Button type="button" variant="ghost" size="icon" aria-label="Remove" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onRemove}><Trash2 /></Button>
    </div>
  );
}

export function ContactCard({ initial }: { initial: SiteData["contact"] }) {
  const [v, setV] = useState(initial);
  const set = (k: keyof typeof v, val: string) => setV((s) => ({ ...s, [k]: val }));
  return (
    <Card>
      <CardHeader icon={Phone} title="Contact details" description="Shown in the footer, the home page, the student Contact page and the top banner." />
      <CardContent>
        <SectionForm section="contact" data={v} button="Save contact details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Phone (calls)" htmlFor="c-phone"><Input id="c-phone" value={v.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" placeholder="077 265 4198" /></Field>
            <Field label="WhatsApp number" htmlFor="c-wa" hint="Students tap this to start a WhatsApp chat."><Input id="c-wa" value={v.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} inputMode="tel" placeholder="070 339 9339" /></Field>
            <Field label="E-mail (optional)" htmlFor="c-mail"><Input id="c-mail" type="email" value={v.email} onChange={(e) => set("email", e.target.value)} /></Field>
            <Field label="Address / areas" htmlFor="c-addr" hint="Leave empty to list your centers automatically (recommended)."><Input id="c-addr" value={v.address} onChange={(e) => set("address", e.target.value)} maxLength={160} placeholder="Panadura · Horana · …" /></Field>
          </div>
        </SectionForm>
      </CardContent>
    </Card>
  );
}

export function SocialCard({ initial }: { initial: SiteData["social"] }) {
  const [v, setV] = useState(initial);
  const set = (k: keyof typeof v, val: string) => setV((s) => ({ ...s, [k]: val }));
  return (
    <Card>
      <CardHeader icon={Link2} title="Social links" description="Leave one empty to hide it. Links must start with https://" />
      <CardContent>
        <SectionForm section="social" data={v} button="Save social links">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(["youtube", "facebook", "tiktok", "instagram"] as const).map((k) => (
              <Field key={k} label={k[0].toUpperCase() + k.slice(1)} htmlFor={`so-${k}`}><Input id={`so-${k}`} type="url" value={v[k]} onChange={(e) => set(k, e.target.value)} placeholder="https://" /></Field>
            ))}
          </div>
        </SectionForm>
      </CardContent>
    </Card>
  );
}

export function YoutubeCard({ initial }: { initial: Pick<SiteData["youtube"], "handle" | "avatar"> }) {
  const [v, setV] = useState(initial);
  return (
    <Card>
      <CardHeader icon={Youtube} title="YouTube channel card" description="The channel name and picture on the “Join our family” card. The subscriber, A/B-result and video numbers are in Owner Console → Landing page." />
      <CardContent>
        <SectionForm section="youtube" data={v} button="Save channel card">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field label="Channel name" htmlFor="y-handle"><Input id="y-handle" value={v.handle} onChange={(e) => setV((s) => ({ ...s, handle: e.target.value }))} placeholder="@HasithaCmaths" /></Field>
            {v.avatar && <Image src={v.avatar} alt="" width={64} height={64} className="h-16 w-16 rounded-full object-cover ring-1 ring-border" />}
          </div>
          <FileUpload bucket="class-banners" prefix="brand" name="avatar_upload" publicUrl accept="image/jpeg,image/png,image/webp" maxMB={3} label="Upload a new channel picture" onUploaded={(u) => setV((s) => ({ ...s, avatar: u[0] }))} />
        </SectionForm>
      </CardContent>
    </Card>
  );
}

export function VideosCard({ initial }: { initial: { stories: VideoRow[]; lessons: VideoRow[] } }) {
  const [lists, setLists] = useState(initial);
  const edit = (k: "stories" | "lessons", fn: (l: VideoRow[]) => VideoRow[]) => setLists((s) => ({ ...s, [k]: fn(s[k]) }));
  const block = (k: "stories" | "lessons", title: string, hint: string) => (
    <div className="space-y-3">
      <div><p className="font-semibold">{title}</p><p className="text-xs text-muted-foreground">{hint}</p></div>
      {lists[k].map((r, i) => (
        <div key={i} className="grid grid-cols-1 gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-center">
          <Input value={r.id} onChange={(e) => edit(k, (l) => l.map((x, j) => (j === i ? { ...x, id: e.target.value } : x)))} placeholder="YouTube link or ID" aria-label="YouTube link" className="font-mono text-sm" />
          <Input value={r.title} onChange={(e) => edit(k, (l) => l.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} placeholder="Title" aria-label="Title" maxLength={140} />
          <RowTools i={i} n={lists[k].length} onMove={(d) => edit(k, (l) => move(l, i, d))} onRemove={() => edit(k, (l) => l.filter((_, j) => j !== i))} />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => edit(k, (l) => [...l, { id: "", title: "" }])}><Plus /> Add a video</Button>
    </div>
  );
  return (
    <Card>
      <CardHeader icon={Video} title="Featured videos" description="The student stories and free lessons on the home page. Paste the YouTube link; the thumbnail is fetched automatically." />
      <CardContent>
        <SectionForm section="videos" data={lists} button="Save featured videos">
          {block("stories", "Student stories", "Short success stories.")}
          {block("lessons", "Free lessons", "Sample lessons that show what a class is like.")}
        </SectionForm>
      </CardContent>
    </Card>
  );
}

export function ChannelsCard({ initial }: { initial: Channel[] }) {
  const [rows, setRows] = useState(initial);
  const patch = (i: number, p: Partial<Channel>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));
  return (
    <Card>
      <CardHeader icon={Radio} title="Telegram & WhatsApp channels" description="Shown on the home page, in the footer and on the students' Channels page." />
      <CardContent>
        <SectionForm section="channels" data={rows} button="Save channels">
          <ul className="space-y-3">
            {rows.map((r, i) => (
              <li key={r.key + i} className="space-y-3 rounded-2xl border p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge variant={r.kind === "telegram" ? "info" : "success"}>{r.kind === "telegram" ? "Telegram" : "WhatsApp"}</Badge>
                  <RowTools i={i} n={rows.length} onMove={(d) => setRows((l) => move(l, i, d))} onRemove={() => setRows((l) => l.filter((_, j) => j !== i))} />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Type" htmlFor={`ch-k-${i}`}><Select id={`ch-k-${i}`} value={r.kind} onChange={(e) => patch(i, { kind: e.target.value as Channel["kind"] })}><option value="telegram">Telegram</option><option value="whatsapp">WhatsApp</option></Select></Field>
                  <Field label="Link" htmlFor={`ch-u-${i}`}><Input id={`ch-u-${i}`} type="url" value={r.url} onChange={(e) => patch(i, { url: e.target.value })} placeholder="https://t.me/…" /></Field>
                  <Field label="Name (English)" htmlFor={`ch-e-${i}`}><Input id={`ch-e-${i}`} value={r.titleEn} onChange={(e) => patch(i, { titleEn: e.target.value })} maxLength={60} placeholder="2028 Theory" /></Field>
                  <Field label="Name (සිංහල)" htmlFor={`ch-s-${i}`}><Input id={`ch-s-${i}`} value={r.titleSi} onChange={(e) => patch(i, { titleSi: e.target.value })} maxLength={60} /></Field>
                  <Field label="Handle / small text" htmlFor={`ch-h-${i}`} hint="Like @TH2028HM or “WhatsApp Channel”."><Input id={`ch-h-${i}`} value={r.handle} onChange={(e) => patch(i, { handle: e.target.value })} maxLength={60} /></Field>
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium">Picture</p>
                    <div className="flex items-center gap-3">
                      {r.image ? <Image src={r.image} alt="" width={48} height={48} className="h-12 w-12 rounded-full object-cover ring-1 ring-border" /> : <span className="grid h-12 w-12 place-items-center rounded-full bg-muted text-[10px] text-muted-foreground">none</span>}
                      <div className="min-w-0 flex-1"><FileUpload bucket="class-banners" prefix="channels" name={`ch_img_${i}`} publicUrl accept="image/jpeg,image/png,image/webp" maxMB={3} label="Upload" onUploaded={(u) => patch(i, { image: u[0] })} /></div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setRows((l) => [...l, { key: "", kind: "telegram", titleEn: "", titleSi: "", handle: "", url: "", image: "" }])}><Plus /> Add a channel</Button>
          </div>
        </SectionForm>
      </CardContent>
    </Card>
  );
}

export function BankCard({ initial }: { initial: BankAccount[] }) {
  const [rows, setRows] = useState(initial);
  const patch = (i: number, p: Partial<BankAccount>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const fake = rows.some((r) => /^[0\s-]+$/.test(r.accountNumber));
  return (
    <Card>
      <CardHeader icon={Building2} title="Bank accounts students pay into" description="Shown with a copy button when a student enrolls or places an order." />
      <CardContent>
        <SectionForm section="bank" data={rows} button="Save bank accounts">
          {fake && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive-soft p-3 text-sm font-medium text-destructive-soft-foreground">An account number is all zeros: students would send their money nowhere. Enter the real number before saving.</p>}
          <ul className="space-y-3">
            {rows.map((r, i) => (
              <li key={i} className="space-y-3 rounded-2xl border p-3.5">
                <div className="flex justify-end"><RowTools i={i} n={rows.length} onMove={(d) => setRows((l) => move(l, i, d))} onRemove={() => setRows((l) => l.filter((_, j) => j !== i))} /></div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Bank" htmlFor={`b-bank-${i}`}><Input id={`b-bank-${i}`} value={r.bank} onChange={(e) => patch(i, { bank: e.target.value })} placeholder="Bank of Ceylon" maxLength={60} /></Field>
                  <Field label="Branch" htmlFor={`b-br-${i}`}><Input id={`b-br-${i}`} value={r.branch} onChange={(e) => patch(i, { branch: e.target.value })} maxLength={60} /></Field>
                  <Field label="Account name" htmlFor={`b-nm-${i}`}><Input id={`b-nm-${i}`} value={r.accountName} onChange={(e) => patch(i, { accountName: e.target.value })} maxLength={70} /></Field>
                  <Field label="Account number" htmlFor={`b-no-${i}`}><Input id={`b-no-${i}`} value={r.accountNumber} onChange={(e) => patch(i, { accountNumber: e.target.value })} inputMode="numeric" className="font-mono" maxLength={32} /></Field>
                </div>
              </li>
            ))}
          </ul>
          <Button type="button" variant="outline" size="sm" onClick={() => setRows((l) => [...l, { bank: "", branch: "", accountName: "", accountNumber: "" }])}><Plus /> Add an account</Button>
        </SectionForm>
      </CardContent>
    </Card>
  );
}
