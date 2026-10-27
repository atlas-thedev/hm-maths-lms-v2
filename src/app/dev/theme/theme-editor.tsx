"use client";
import { useMemo, useState } from "react";
import { Check, CheckCircle2, Moon, RotateCcw, Save, Star, Sun, Wallet, XCircle } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { Alert, Badge, Button, Card, CardContent, CardHeader, ChipButton, IconTile, Input, ProgressBar, StatCard } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { THEME_PRESETS, buildTheme, normalizeTheme, themeCss, type ThemeSettings } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { resetThemeAction, saveThemeAction } from "../actions";

const HEX = /^#[0-9a-f]{6}$/i;

export function ThemeEditor({ initial }: { initial: ThemeSettings }) {
  const [draft, setDraft] = useState<ThemeSettings>(initial);
  const [hexText, setHexText] = useState(initial.brand);
  const [previewDark, setPreviewDark] = useState(false);
  const set = (patch: Partial<ThemeSettings>) => setDraft((d) => normalizeTheme({ ...d, ...patch }));
  const built = useMemo(() => buildTheme(draft), [draft]);
  const css = useMemo(() => themeCss(draft, "#theme-preview"), [draft]);
  const changed = JSON.stringify(draft) !== JSON.stringify(initial);

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      {/* ── Controls ── */}
      <div className="space-y-4">
        <Card>
          <CardHeader title="Brand colour" description="Choose a preset or any colour." />
          <CardContent className="space-y-4">
            <div className="grid grid-cols-5 gap-2">
              {THEME_PRESETS.map((p) => (
                <button key={p.brand} type="button" onClick={() => { set({ brand: p.brand }); setHexText(p.brand); }} title={p.name}
                  className={cn("group flex flex-col items-center gap-1 rounded-xl p-1.5 text-[10px] font-medium text-muted-foreground transition hover:bg-accent", draft.brand === p.brand && "bg-accent text-foreground")}>
                  <span className="relative grid h-9 w-9 place-items-center rounded-full ring-2 ring-offset-2 ring-offset-card" style={{ background: p.brand, ["--tw-ring-color" as string]: draft.brand === p.brand ? p.brand : "transparent" }}>
                    {draft.brand === p.brand && <Check className="h-4 w-4 text-white drop-shadow" />}
                  </span>
                  <span className="w-full truncate text-center">{p.name}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label className="relative h-11 w-14 shrink-0 cursor-pointer overflow-hidden rounded-xl ring-1 ring-border" style={{ background: draft.brand }} title="Pick any colour">
                <input type="color" value={draft.brand} onChange={(e) => { set({ brand: e.target.value }); setHexText(e.target.value); }} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="Pick a colour" />
              </label>
              <Input value={hexText} onChange={(e) => { setHexText(e.target.value); if (HEX.test(e.target.value)) set({ brand: e.target.value }); }} placeholder="#f05b06" className="font-mono" aria-label="Hex colour" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Buttons" description="How filled buttons use the colour." />
          <CardContent className="grid grid-cols-2 gap-2">
            {([["exact", "Exact colour", "Your colour as-is. Text turns dark or white automatically."], ["deep", "Deep shade", "A deeper shade of it. Always white text."]] as const).map(([v, label, hint]) => (
              <button key={v} type="button" onClick={() => set({ buttons: v })} aria-pressed={draft.buttons === v}
                className={cn("rounded-xl border p-3 text-left transition", draft.buttons === v ? "border-primary bg-accent ring-2 ring-primary/20" : "hover:bg-accent/50")}>
                <span className="block text-sm font-semibold">{label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Light & dark mode" />
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(["light", "dark", "system"] as const).map((m) => (
                <ChipButton key={m} active={draft.defaultMode === m} onClick={() => set({ defaultMode: m })}>
                  {m === "light" ? <Sun className="h-3.5 w-3.5" /> : m === "dark" ? <Moon className="h-3.5 w-3.5" /> : null}
                  {m === "system" ? "Follow device" : m === "light" ? "Light" : "Dark"}
                </ChipButton>
              ))}
            </div>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3">
              <span><span className="block text-sm font-semibold">Let people switch</span><span className="block text-xs text-muted-foreground">Shows the sun / moon button in the top bar.</span></span>
              <input type="checkbox" checked={draft.allowToggle} onChange={(e) => set({ allowToggle: e.target.checked })} className="h-5 w-5 accent-[hsl(var(--primary))]" />
            </label>
            <div>
              <div className="mb-1 flex justify-between text-sm"><span className="font-semibold">Corner roundness</span><span className="font-mono text-muted-foreground">{draft.radius.toFixed(2)} rem</span></div>
              <input type="range" min={0} max={1.5} step={0.05} value={draft.radius} onChange={(e) => set({ radius: Number(e.target.value) })} className="w-full accent-[hsl(var(--primary))]" aria-label="Corner roundness" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Readability check" description="Contrast ratios, 4.5 or more is easy to read." />
          <CardContent className="space-y-2">
            {built.checks.map((c) => {
              const ok = c.ratio >= (c.label.startsWith("White") ? 4.4 : 4.5);
              return (
                <div key={c.label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2">{ok ? <CheckCircle2 className="h-4 w-4 text-success-soft-foreground" /> : <XCircle className="h-4 w-4 text-destructive" />}{c.label}</span>
                  <span className="font-mono text-xs">{c.ratio.toFixed(2)} : 1</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          <ActionForm action={saveThemeAction} className="flex-1">
            <input type="hidden" name="brand" value={draft.brand} />
            <input type="hidden" name="radius" value={draft.radius} />
            <input type="hidden" name="defaultMode" value={draft.defaultMode} />
            <input type="hidden" name="buttons" value={draft.buttons} />
            {draft.allowToggle && <input type="hidden" name="allowToggle" value="on" />}
            <SubmitButton block disabled={!changed} pendingText="Saving…"><Save /> Save theme</SubmitButton>
          </ActionForm>
          <ActionForm action={async () => resetThemeAction()} confirm="Go back to the built-in HM orange theme?" onSuccess={() => { setDraft(normalizeTheme({})); setHexText("#f05b06"); }}>
            <SubmitButton variant="outline"><RotateCcw /> Reset</SubmitButton>
          </ActionForm>
        </div>
      </div>

      {/* ── Live preview ── */}
      <div className="min-w-0 xl:sticky xl:top-24 xl:self-start">
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Live preview {changed && <Badge variant="warning" className="ml-1">Not saved</Badge>}</p>
          <div className="flex gap-1">
            <ChipButton active={!previewDark} onClick={() => setPreviewDark(false)}><Sun className="h-3.5 w-3.5" /> Light</ChipButton>
            <ChipButton active={previewDark} onClick={() => setPreviewDark(true)}><Moon className="h-3.5 w-3.5" /> Dark</ChipButton>
          </div>
        </div>
        <div className={previewDark ? "dark" : ""}>
          <div id="theme-preview" className="space-y-3 rounded-3xl border bg-background p-4 text-foreground shadow-lift [color-scheme:light] dark:[color-scheme:dark]">
            <div className="rounded-2xl bg-gradient-brand p-5 text-white">
              <p className="text-sm text-white/90">Good evening</p>
              <p className="font-display text-2xl font-extrabold">Welcome back, Kavindu</p>
              <Button variant="inverse" size="sm" className="mt-3">Join now</Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Total paid" value="LKR 8,800" icon={Wallet} />
              <StatCard label="Best score" value="88%" icon={Star} tone="warning" />
            </div>
            <div className="rounded-2xl border bg-card p-4">
              <p className="font-semibold">Card title</p>
              <p className="text-sm text-muted-foreground">Body text on a card, with an <a className="font-semibold text-primary underline">orange link</a>.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm">Primary</Button>
                <Button size="sm" variant="outline">Outline</Button>
                <Button size="sm" variant="soft">Soft</Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge>Default</Badge><Badge variant="success">Approved</Badge><Badge variant="warning">Pending</Badge><Badge variant="destructive">Rejected</Badge>
              </div>
              <ProgressBar value={64} className="mt-3" />
            </div>
            <div className="flex items-center gap-2">
              <IconTile icon={Star} /><IconTile icon={Star} variant="solid" />
              <Input placeholder="Text field" className="flex-1" />
            </div>
            <Alert>Info message in the brand tint.</Alert>
            <div className="flex gap-1">
              {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((k) => <span key={k} className="h-6 flex-1 first:rounded-l-lg last:rounded-r-lg" style={{ background: `hsl(var(--brand-${k}))` }} title={String(k)} />)}
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Saved themes apply to every page for everyone on their next page load. The built-in default lives in src/theme/theme.css.</p>
      </div>
    </div>
  );
}
