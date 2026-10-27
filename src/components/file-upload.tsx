"use client";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, FileUp, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/db/client";
import { cn, safeFileName } from "@/lib/utils";
import { useT } from "@/i18n/client";

/**
 * Uploads a file from the browser to the app's file storage (/api/storage/upload, RLS-checked) and
 * stores the resulting object path (or public URL) in a hidden input, so the surrounding
 * server-action form receives only a short string — no large request bodies in server actions.
 */
export function FileUpload({
  bucket, prefix, name, accept, maxMB = 5, publicUrl = false, required, label, defaultValue, multiple = false, onUploaded,
}: {
  bucket: string; prefix: string; name: string; accept?: string; maxMB?: number; publicUrl?: boolean;
  required?: boolean; label?: string; defaultValue?: string | null; multiple?: boolean;
  /** Called with the stored path(s) / public URL(s) once an upload finishes (for forms that keep their own state). */
  onUploaded?: (values: string[]) => void;
}) {
  const t = useT("common.file");
  const [values, setValues] = useState<string[]>(defaultValue ? [defaultValue] : []);
  const [names, setNames] = useState<string[]>(defaultValue ? [defaultValue.split("/").pop() ?? t("current")] : []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const form = wrapRef.current?.closest("form");
    if (!form) return;
    const onReset = () => { setValues(defaultValue ? [defaultValue] : []); setNames([]); setError(null); };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [defaultValue]);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const list = Array.from(files);
    const tooBig = list.find((f) => f.size > maxMB * 1024 * 1024);
    if (tooBig) { setError(t("tooBig", { name: tooBig.name, mb: maxMB })); return; }
    setBusy(true);
    const db = createClient();
    const uploaded: string[] = [];
    for (const file of list) {
      const path = `${prefix.replace(/\/$/, "")}/${safeFileName(file.name, file.type)}`;
      const { error: upErr } = await db.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) { setError(upErr.message); setBusy(false); return; }
      uploaded.push(publicUrl ? db.storage.from(bucket).getPublicUrl(path).data.publicUrl : path);
    }
    setValues((v) => (multiple ? [...v, ...uploaded] : uploaded));
    onUploaded?.(uploaded);
    setNames((n) => (multiple ? [...n, ...list.map((f) => f.name)] : list.map((f) => f.name)));
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div ref={wrapRef} className="space-y-2">
      {values.map((v) => <input key={v} type="hidden" name={name} value={v} />)}
      {/* Native required check: a visually-hidden text input that is only filled once the upload finished */}
      {required && <input tabIndex={-1} aria-hidden className="sr-only" required value={values.length ? "ok" : ""} onChange={() => {}} />}
      <label className={cn("flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-4 text-sm transition hover:border-primary/60 hover:bg-primary/5", error && "border-destructive/60")}>
        {busy ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : values.length ? <CheckCircle2 className="h-5 w-5 text-success-soft-foreground" /> : <FileUp className="h-5 w-5 text-muted-foreground" />}
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{busy ? t("uploading") : values.length && !multiple ? t("replace") : label ?? t("choose")}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {names.length ? names.join(", ") : accept ? t("limitWithTypes", { mb: maxMB, types: accept.replaceAll(",", ", ") }) : t("limit", { mb: maxMB })}
          </span>
        </span>
        <input ref={inputRef} type="file" className="sr-only" accept={accept} multiple={multiple} disabled={busy} onChange={(e) => onFiles(e.target.files)} />
      </label>
      {multiple && values.length > 0 && (
        <button type="button" onClick={() => { setValues([]); setNames([]); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
          <X className="h-3 w-3" /> {t("clear")}
        </button>
      )}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
