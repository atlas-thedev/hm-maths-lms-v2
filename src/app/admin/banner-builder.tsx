"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, ImageIcon, LayoutTemplate, Loader2 } from "lucide-react";
import { FileUpload } from "@/components/file-upload";
import { ClassBannerArt } from "@/components/banner/class-banner-art";
import { useBannerContent, type BannerClass } from "@/components/class-banner";
import { Field, Input } from "@/components/ui";
import { BANNER_TEMPLATES, DEFAULT_BANNER_CONFIG, TEMPLATE_LABEL, type BannerConfig, type BannerShape, type BannerTemplate } from "@/lib/banner";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";

const EXPORT_PX = 3840;
const BASE_PX = 1080;

/** Picture or template? A template draws the poster from the class itself and always shows the current month. */
export function BannerBuilder({ initialConfig, initialPhoto, cls, uploadLabel }: {
  initialConfig: BannerConfig | null; initialPhoto: string | null;
  /** The class as typed in the form so far (title, year, center, time…): the preview follows it. */
  cls: Omit<BannerClass, "banner_url" | "banner_config">;
  uploadLabel: string;
}) {
  const t = useT("admin.forms.banner");
  const [mode, setMode] = useState<"picture" | "template">(initialConfig ? "template" : "picture");
  const [config, setConfig] = useState<BannerConfig>(initialConfig ?? DEFAULT_BANNER_CONFIG);
  const [photo, setPhoto] = useState<string | null>(initialPhoto);
  const [shape, setShape] = useState<Exclude<BannerShape, "strip">>("poster");
  const [busy, setBusy] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const set = (p: Partial<BannerConfig>) => setConfig((c) => ({ ...c, ...p }));

  const live: BannerClass = { ...cls, banner_url: photo, banner_config: config };
  const content = useBannerContent(live);
  const picks = BANNER_TEMPLATES.map((tpl) => ({ tpl, ...{ cls: { ...live, banner_config: { ...config, template: tpl } } } }));

  async function download() {
    if (!exportRef.current) return;
    setBusy(true);
    try {
      const { toPng } = await import("html-to-image");
      await document.fonts.ready;
      const url = await toPng(exportRef.current, { pixelRatio: EXPORT_PX / BASE_PX, cacheBust: true, width: BASE_PX, height: BASE_PX });
      const a = document.createElement("a");
      a.href = url; a.download = `class-banner-${(cls.title || "class").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}-${EXPORT_PX}px.png`;
      document.body.appendChild(a); a.click(); a.remove();
    } catch { toast.error(t("downloadFailed")); }
    setBusy(false);
  }

  return (
    <div className="space-y-4 rounded-2xl border bg-muted/30 p-4">
      <input type="hidden" name="banner_config" value={mode === "template" ? JSON.stringify(config) : ""} />
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="radiogroup" aria-label={t("mode")}>
        {([["picture", ImageIcon, t("modePicture")], ["template", LayoutTemplate, t("modeTemplate")]] as const).map(([v, Icon, label]) => (
          <button key={v} type="button" role="radio" aria-checked={mode === v} onClick={() => setMode(v)}
            className={cn("flex min-h-10 items-center justify-center gap-2 rounded-lg px-2 text-sm font-semibold transition", mode === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {mode === "picture" ? (
        <Field label={t("pictureLabel")}>
          <FileUpload bucket="class-banners" prefix="banners" name="banner_url" publicUrl accept="image/jpeg,image/png,image/webp" maxMB={3} defaultValue={initialPhoto} label={uploadLabel} onUploaded={(u) => setPhoto(u[0])} />
        </Field>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{t("templateHint")}</p>
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-5" role="radiogroup" aria-label={t("pickTemplate")}>
            {picks.map(({ tpl, cls: pc }) => <TemplateTile key={tpl} tpl={tpl} cls={pc} active={config.template === tpl} onPick={() => set({ template: tpl })} />)}
          </ul>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("bigWord")} htmlFor="bn-mode">
              <select id="bn-mode" value={config.headlineMode} onChange={(e) => set({ headlineMode: e.target.value as BannerConfig["headlineMode"] })}
                className="h-11 w-full rounded-xl border bg-background px-3 text-base sm:text-sm">
                <option value="month">{t("bigWordMonth")}</option><option value="custom">{t("bigWordCustom")}</option><option value="none">{t("bigWordNone")}</option>
              </select>
            </Field>
            {config.headlineMode === "custom" ? <Field label={t("customWord")} htmlFor="bn-head"><Input id="bn-head" value={config.headline} onChange={(e) => set({ headline: e.target.value })} maxLength={24} placeholder={t("customWordPh")} /></Field> : <span />}
            <Field label={t("badge")} htmlFor="bn-badge" hint={t("badgeHint")}><Input id="bn-badge" value={config.badge} onChange={(e) => set({ badge: e.target.value })} maxLength={24} placeholder="ATTENTION" /></Field>
            <Field label={t("subtitle")} htmlFor="bn-sub" hint={t("subtitleHint")}><Input id="bn-sub" value={config.subtitle} onChange={(e) => set({ subtitle: e.target.value })} maxLength={70} /></Field>
            <Field label={t("tagline")} htmlFor="bn-tag" className="sm:col-span-2" hint={t("taglineHint")}><Input id="bn-tag" value={config.tagline} onChange={(e) => set({ tagline: e.target.value })} maxLength={70} /></Field>
          </div>
          <Field label={t("photo")} hint={t("photoHint")}>
            <FileUpload bucket="class-banners" prefix="banners" name="banner_url" publicUrl accept="image/jpeg,image/png,image/webp" maxMB={3} defaultValue={initialPhoto} label={t("photoUpload")} onUploaded={(u) => setPhoto(u[0])} />
          </Field>

          {content ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{t("preview")}</p>
                <div className="flex gap-1 rounded-lg bg-muted p-0.5 text-xs font-semibold">
                  {(["poster", "wide"] as const).map((s) => <button key={s} type="button" onClick={() => setShape(s)} className={cn("rounded-md px-2.5 py-1", shape === s ? "bg-card shadow-sm" : "text-muted-foreground")}>{t(s === "poster" ? "shapePoster" : "shapeWide")}</button>)}
                </div>
              </div>
              <div className={cn("relative mx-auto overflow-hidden rounded-2xl shadow-lift ring-1 ring-border", shape === "poster" ? "aspect-square max-w-md" : "aspect-[16/9] max-w-xl")}>
                <ClassBannerArt content={content} shape={shape} />
              </div>
              <p className="text-xs text-muted-foreground">{t("autoMonth")}</p>
              <button type="button" onClick={download} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl border bg-card px-4 text-sm font-semibold shadow-sm transition hover:bg-accent disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} {t("download")}
              </button>
              {/* Off-screen square used for the 4K export (3840 × 3840): drawn at 1080 px and scaled up. */}
              <div ref={exportRef} aria-hidden style={{ position: "fixed", left: -20000, top: 0, width: BASE_PX, height: BASE_PX, pointerEvents: "none" }}>
                <ClassBannerArt content={content} shape="poster" />
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function TemplateTile({ tpl, cls, active, onPick }: { tpl: BannerTemplate; cls: BannerClass; active: boolean; onPick: () => void }) {
  const content = useBannerContent(cls);
  return (
    <li>
      <button type="button" role="radio" aria-checked={active} onClick={onPick} aria-label={TEMPLATE_LABEL[tpl]}
        className={cn("group block w-full overflow-hidden rounded-xl border-2 bg-card text-left transition", active ? "border-primary ring-2 ring-primary/25" : "border-transparent hover:border-primary/40")}>
        <span className="relative block aspect-square">{content ? <ClassBannerArt content={content} shape="poster" /> : null}</span>
        <span className={cn("block px-2 py-1.5 text-center text-xs font-semibold", active ? "text-primary" : "text-muted-foreground")}>{TEMPLATE_LABEL[tpl]}</span>
      </button>
    </li>
  );
}
