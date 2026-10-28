"use client";
import { useState } from "react";
import Image from "next/image";
import { Globe, Image as ImageIcon, Palette, Search } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { FileUpload } from "@/components/file-upload";
import { Card, CardContent, CardHeader, Field, Input, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";
import { saveBrandAction, saveSeoAction } from "../content-actions";

/** One changeable picture: what is live now, an upload box, and a "go back to the built-in one" tick. */
function PhotoField({ name, label, hint, current, builtIn, wide = false, dark = false }: { name: string; label: string; hint: string; current: string; builtIn: string | null; wide?: boolean; dark?: boolean }) {
  const shown = current || builtIn;
  return (
    <div className="space-y-2 rounded-2xl border p-3.5">
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
      {shown ? (
        <div className={cn("relative overflow-hidden rounded-xl ring-1 ring-border", name.startsWith("logo") && !dark ? "bg-white" : "bg-[#141414]", wide ? "aspect-[16/7]" : "aspect-[4/3] max-w-[14rem]")}>
          <Image src={shown} alt="" fill sizes="320px" className="object-contain" />
        </div>
      ) : <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">Nothing yet: this part of the page stays hidden until you add one.</p>}
      <p className="text-[11px] font-medium text-muted-foreground">{current ? "Your uploaded picture is live." : builtIn ? "The built-in picture is live." : ""}</p>
      <FileUpload bucket="class-banners" prefix="brand" name={name} publicUrl accept="image/jpeg,image/png,image/webp" maxMB={3} label="Upload a new picture" />
      {current && <label className="flex items-center gap-2 text-xs"><input type="checkbox" name={`clear_${name}`} className="h-4 w-4 accent-[hsl(var(--primary))]" /> Go back to {builtIn ? "the built-in picture" : "none"}</label>}
    </div>
  );
}

export interface BrandInitial {
  name: string; owner: string; logoUrl: string; logoDarkUrl: string; logoOnTile: boolean; groupPhoto: string; teacherPhoto: string; heroPhoto: string; googleVerification: string; bingVerification: string;
}

export function BrandForm({ initial, builtIn }: { initial: BrandInitial; builtIn: { teacher: string | null; hero: string; group: string | null } }) {
  return (
    <ActionForm action={saveBrandAction} className="space-y-5">
      <Card>
        <CardHeader icon={Palette} title="Name & logo" description="Shown in the header, the browser tab, Google, the app icon name and every sentence that says “HM Maths”." />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Site name" htmlFor="b-name" hint="Short and easy to say. For example “HM Maths”."><Input id="b-name" name="name" defaultValue={initial.name} required minLength={2} maxLength={40} /></Field>
            <Field label="Teacher / owner name" htmlFor="b-owner" hint="Used in Google results and the page footer."><Input id="b-owner" name="owner" defaultValue={initial.owner} required minLength={2} maxLength={60} /></Field>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <PhotoField name="logoUrl" label="Logo · light mode" hint="Used on white pages, in the browser tab and on Google. Square PNG or WebP with a clear background works best. Leave it to keep the built-in “hm” mark." current={initial.logoUrl} builtIn={null} />
            <PhotoField name="logoDarkUrl" label="Logo · dark mode (optional)" hint="Shown when a visitor uses dark mode, and on the dark tile. Leave it empty to use the light-mode logo everywhere." current={initial.logoDarkUrl} builtIn={null} dark />
          </div>
          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" name="logoOnTile" defaultChecked={initial.logoOnTile} className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]" />
            <span><span className="font-medium">Put the logo on the dark rounded tile</span><span className="block text-xs text-muted-foreground">Untick if your logo already has its own background or looks good on its own (then light and dark logos switch with the theme). The tab and app icon use the same choice.</span></span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader icon={ImageIcon} title="Home page pictures" description="The photos on the public home page." />
        <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PhotoField name="groupPhoto" label="Group photo" hint="A wide banner above the photo gallery on the home page (16:9 works best)." current={initial.groupPhoto} builtIn={builtIn.group} wide />
          <PhotoField name="teacherPhoto" label="Teacher photo" hint="The photo in the “About the teacher” section (portrait, 4:5)." current={initial.teacherPhoto} builtIn={builtIn.teacher} />
          <PhotoField name="heroPhoto" label="Top banner photo" hint="Sir's picture in the top banner. Use a photo cut out on a dark #141414 background so it blends in." current={initial.heroPhoto} builtIn={builtIn.hero} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader icon={Globe} title="Search-engine tokens" description="Paste the code from Google Search Console / Bing Webmaster Tools to prove the site is yours." />
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Google verification" htmlFor="b-g" hint="Only the code, e.g. aBc123…"><Input id="b-g" name="googleVerification" defaultValue={initial.googleVerification} className="font-mono" /></Field>
          <Field label="Bing verification" htmlFor="b-b"><Input id="b-b" name="bingVerification" defaultValue={initial.bingVerification} className="font-mono" /></Field>
        </CardContent>
      </Card>
      <SubmitButton pendingText="Saving…">Save brand</SubmitButton>
    </ActionForm>
  );
}

export interface SeoInitial { title: string; description: string; keywords: string }

function Snippet({ title, description, brand, url }: { title: string; description: string; brand: string; url: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4 text-left shadow-sm dark:bg-card">
      <div className="flex items-center gap-2.5">
        <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-[#141414]"><Image src="/icon-192.png" alt="" width={28} height={28} /></span>
        <div className="min-w-0"><p className="truncate text-xs font-medium text-foreground">{brand}</p><p className="truncate text-[11px] text-muted-foreground">{url}</p></div>
      </div>
      <p className="mt-2 line-clamp-2 text-lg leading-snug text-[#1a0dab] dark:text-sky-400">{title || "…"}</p>
      <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{description || "…"}</p>
    </div>
  );
}

const Counter = ({ n, ideal }: { n: number; ideal: number }) => <span className={cn("font-mono text-[11px]", n > ideal ? "text-destructive" : "text-muted-foreground")}>{n} / {ideal}</span>;

export function SeoForm({ en, si, brand, url }: { en: SeoInitial; si: SeoInitial; brand: string; url: string }) {
  const [tab, setTab] = useState<"en" | "si">("en");
  const [v, setV] = useState({ en, si });
  const set = (l: "en" | "si", k: keyof SeoInitial, val: string) => setV((s) => ({ ...s, [l]: { ...s[l], [k]: val } }));
  return (
    <ActionForm action={saveSeoAction} className="space-y-4">
      <Card>
        <CardHeader icon={Search} title="Google title & description" description="What people read in the search results. The English text is what Google sees (it visits without a language), so put your main words there; Sinhala is for visitors who use Sinhala." />
        <CardContent className="space-y-4">
          <div className="flex gap-1 rounded-xl bg-muted p-1" role="tablist">
            {(["en", "si"] as const).map((l) => (
              <button key={l} type="button" role="tab" aria-selected={tab === l} onClick={() => setTab(l)} className={cn("flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition", tab === l ? "bg-card shadow-sm" : "text-muted-foreground")}>{l === "en" ? "English (Google)" : "සිංහල"}</button>
            ))}
          </div>
          {(["en", "si"] as const).map((l) => (
            <div key={l} className={cn("space-y-4", tab !== l && "hidden")}>
              <Snippet title={v[l].title} description={v[l].description} brand={brand} url={url} />
              <Field label="Page title" htmlFor={`s-t-${l}`} hint="Around 60 characters. Put “combined maths” and the teacher's name in it."><Input id={`s-t-${l}`} name={`title_${l}`} value={v[l].title} onChange={(e) => set(l, "title", e.target.value)} maxLength={90} /></Field>
              <div className="-mt-3 text-right"><Counter n={v[l].title.length} ideal={60} /></div>
              <Field label="Description" htmlFor={`s-d-${l}`} hint="Around 155 characters. {centers} becomes the list of your centers."><Textarea id={`s-d-${l}`} name={`description_${l}`} value={v[l].description} onChange={(e) => set(l, "description", e.target.value)} maxLength={320} className="min-h-[90px]" /></Field>
              <div className="-mt-3 text-right"><Counter n={v[l].description.length} ideal={160} /></div>
              <Field label="Keywords" htmlFor={`s-k-${l}`} hint="Separate with commas. Each center also adds its own “combined maths class <town>” phrases automatically."><Textarea id={`s-k-${l}`} name={`keywords_${l}`} value={v[l].keywords} onChange={(e) => set(l, "keywords", e.target.value)} maxLength={1200} className="min-h-[90px]" /></Field>
            </div>
          ))}
        </CardContent>
      </Card>
      <SubmitButton pendingText="Saving…">Save search text</SubmitButton>
    </ActionForm>
  );
}
