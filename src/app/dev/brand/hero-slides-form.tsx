"use client";
import { useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Trash2, UserRound } from "lucide-react";
import Image from "next/image";
import { ActionForm } from "@/components/action-form";
import { FileUpload } from "@/components/file-upload";
import { Badge, Button, Card, CardContent, CardHeader, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { MAX_HERO_SLIDES, blankHeroSlide, type HeroSlide, type HeroSettings } from "@/lib/hero";
import { cn } from "@/lib/utils";
import { saveHeroSlidesAction } from "../content-actions";

type Row = HeroSlide & { uid: number };
let uid = 0;

/**
 * Teacher spot editor: one photo, or a small gallery that rotates on the home page. Each slide carries its own
 * bilingual name / title / caption, so a second photo never needs the translation files.
 *
 * Photos upload to the public "class-banners" bucket (same place as class banners and the brand photos), so the
 * home page can show them without a signed URL.
 */
export function HeroSlidesForm({ initial }: { initial: HeroSettings }) {
  const [rows, setRows] = useState<Row[]>(() => initial.slides.map((s) => ({ ...s, uid: ++uid })));
  const [interval, setInterval] = useState(String(initial.intervalSeconds));
  const [open, setOpen] = useState<Set<number>>(new Set());

  const patch = (id: number, p: Partial<Row>) => setRows((r) => r.map((x) => (x.uid === id ? { ...x, ...p } : x)));
  const move = (i: number, d: number) => setRows((r) => {
    const n = [...r]; const j = i + d;
    if (j < 0 || j >= n.length) return r;
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  });
  const toggle = (id: number) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  // The uid is allocated OUTSIDE the state updater: React may run an updater twice (StrictMode), and a
  // updater that increments a module counter would then renumber rows and churn keys.
  const add = () => {
    if (rows.length >= MAX_HERO_SLIDES) return;
    const row: Row = { ...blankHeroSlide(), uid: ++uid };
    setRows((r) => [...r, row]);
    setOpen((s) => new Set(s).add(row.uid));   // open the new row straight away
  };

  const payload = JSON.stringify({
    intervalSeconds: Number(interval) || 6,
    slides: rows.map(({ uid: _u, ...rest }) => rest),
  });

  return (
    <ActionForm action={saveHeroSlidesAction} className="space-y-4" resetOnSuccess={false}>
      <input type="hidden" name="hero" value={payload} />

      <Card>
        <CardHeader
          icon={UserRound}
          title="ගුරුවරයා · Teacher photos"
          description={`The picture beside “About your teacher” on the home page. Add up to ${MAX_HERO_SLIDES} and they rotate; leave the list empty to show the single built-in photo.`}
          action={<Badge variant={rows.length ? "solid" : "outline"}>{rows.length ? `${rows.length} photo${rows.length === 1 ? "" : "s"}` : "Built-in photo"}</Badge>}
        />
        <CardContent className="space-y-3">
          {rows.length === 0 && (
            <p className="rounded-xl border border-dashed bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
              No photos added yet — the home page shows the teacher photo from <strong>Brand &amp; SEO</strong> (or the YouTube avatar).
              Add one below to override it.
            </p>
          )}

          <ul className="space-y-3">
            {rows.map((r, i) => {
              const isOpen = open.has(r.uid);
              const label = r.nameEn || r.nameSi || (r.photo ? `Photo ${i + 1}` : "New photo");
              return (
                <li key={r.uid} className={cn("overflow-hidden rounded-2xl border", !r.enabled && "opacity-70")}>
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted ring-1 ring-border">
                      {r.photo
                        ? <Image src={r.photo} alt="" fill sizes="48px" className="object-cover" />
                        : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
                    </span>
                    <button type="button" onClick={() => toggle(r.uid)} aria-expanded={isOpen}
                      className="min-w-0 flex-1 rounded-lg py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <span className="flex flex-wrap items-center gap-x-2">
                        <span className="truncate font-display font-semibold">{label}</span>
                        {!r.enabled && <Badge variant="outline">Hidden</Badge>}
                        {r.href && <Badge variant="info">Link</Badge>}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {r.titleEn || r.titleSi || "Title from the translation files"}
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button type="button" variant="ghost" size="icon" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp /></Button>
                      <Button type="button" variant="ghost" size="icon" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)}><ArrowDown /></Button>
                      <Button type="button" variant="ghost" size="icon" aria-label="Remove photo"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setRows((x) => x.filter((y) => y.uid !== r.uid))}><Trash2 /></Button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="space-y-3 border-t bg-muted/30 px-4 py-4">
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                        <PhotoSlot name={`photo-${r.uid}`} current={r.photo} onChange={(v) => patch(r.uid, { photo: v })} />
                        <label className="flex items-center gap-2 text-sm sm:mt-1">
                          <input type="checkbox" checked={r.enabled} onChange={(e) => patch(r.uid, { enabled: e.target.checked })}
                            className="h-4 w-4 accent-[hsl(var(--primary))]" />
                          Show on the site
                        </label>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Name (English)" htmlFor={`ne-${r.uid}`} hint="Leave empty to keep the translated name.">
                          <Input id={`ne-${r.uid}`} value={r.nameEn} onChange={(e) => patch(r.uid, { nameEn: e.target.value })} maxLength={60} placeholder="Hasitha Madusanka" />
                        </Field>
                        <Field label="Name (සිංහල)" htmlFor={`ns-${r.uid}`}>
                          <Input id={`ns-${r.uid}`} value={r.nameSi} onChange={(e) => patch(r.uid, { nameSi: e.target.value })} maxLength={60} placeholder="හසිත මධුසංක" />
                        </Field>
                        <Field label="Title (English)" htmlFor={`te-${r.uid}`} hint="e.g. B.Sc · Combined Maths Lecturer">
                          <Input id={`te-${r.uid}`} value={r.titleEn} onChange={(e) => patch(r.uid, { titleEn: e.target.value })} maxLength={90} />
                        </Field>
                        <Field label="Title (සිංහල)" htmlFor={`ts-${r.uid}`}>
                          <Input id={`ts-${r.uid}`} value={r.titleSi} onChange={(e) => patch(r.uid, { titleSi: e.target.value })} maxLength={90} />
                        </Field>
                        <Field label="Caption (English, optional)" htmlFor={`ce-${r.uid}`} hint="One short line, e.g. “Guruthalawa · national TV”.">
                          <Input id={`ce-${r.uid}`} value={r.captionEn} onChange={(e) => patch(r.uid, { captionEn: e.target.value })} maxLength={220} />
                        </Field>
                        <Field label="Caption (සිංහල, optional)" htmlFor={`cs-${r.uid}`}>
                          <Input id={`cs-${r.uid}`} value={r.captionSi} onChange={(e) => patch(r.uid, { captionSi: e.target.value })} maxLength={220} />
                        </Field>
                      </div>
                      <Field label="Link (optional)" htmlFor={`hr-${r.uid}`} hint="Clicking the photo opens this address. Use a full https:// link, or leave empty.">
                        <Input id={`hr-${r.uid}`} value={r.href} onChange={(e) => patch(r.uid, { href: e.target.value })} maxLength={400} placeholder="https://youtube.com/@…" className="font-mono text-xs" />
                      </Field>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <Button type="button" variant="outline" onClick={add} disabled={rows.length >= MAX_HERO_SLIDES}>
              <ImagePlus /> Add a photo
            </Button>
            <p className="text-xs text-muted-foreground">The first photo shows first. Reorder with the arrows.</p>
          </div>

          {rows.length > 1 && (
            <Field label="Seconds per photo" htmlFor="hero-interval" hint="Between 3 and 15. Visitors can also click the dots to move on.">
              <Input id="hero-interval" type="number" min={3} max={15} value={interval} onChange={(e) => setInterval(e.target.value)} className="w-28" />
            </Field>
          )}
        </CardContent>
      </Card>

      <SubmitButton pendingText="Saving…">Save teacher photos</SubmitButton>
    </ActionForm>
  );
}

/**
 * The upload box for one slide. FileUpload keeps the stored URL in a hidden input; we mirror it into the form's
 * own JSON state so the whole gallery is saved by the single submit button.
 */
function PhotoSlot({ name, current, onChange }: { name: string; current: string; onChange: (v: string) => void }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="mb-1.5 text-sm font-medium">Picture</p>
      <FileUpload
        bucket="class-banners" prefix="hero" name={name} publicUrl accept="image/jpeg,image/png,image/webp" maxMB={3}
        label={current ? "Replace this picture" : "Upload a picture"} defaultValue={current || null}
        onUploaded={(v) => onChange(v[0] ?? "")}
      />
      {current && (
        <button type="button" onClick={() => onChange("")} className="mt-1.5 text-xs font-medium text-destructive hover:underline">
          Remove this picture
        </button>
      )}
    </div>
  );
}
