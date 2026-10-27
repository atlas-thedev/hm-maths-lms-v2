"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { Badge, Field, Input, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { createClient } from "@/lib/db/client";
import { GALLERY_CATEGORIES, MAX_PHOTOS_PER_UPLOAD, galleryUrl, type AlbumRow, type PhotoRow } from "@/lib/gallery";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";
import { addPhotosAction, deleteAlbumAction, deletePhotoAction, makeCoverAction, saveAlbumAction, updateCaptionAction } from "./actions";

export function AlbumForm({ album }: { album?: AlbumRow }) {
  const t = useT("admin.gallery");
  return (
    <ActionForm action={saveAlbumAction} className="space-y-4" resetOnSuccess={!album}>
      {album && <input type="hidden" name="id" value={album.id} />}
      <Field label={t("albumTitle")} htmlFor="g-title"><Input id="g-title" name="title" defaultValue={album?.title} required minLength={2} maxLength={120} placeholder={t("titlePh")} /></Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("category")} htmlFor="g-cat">
          <Select id="g-cat" name="category" defaultValue={album?.category ?? "class"}>{GALLERY_CATEGORIES.map((c) => <option key={c} value={c}>{t(`categories.${c}`)}</option>)}</Select>
        </Field>
        <Field label={t("takenOn")} htmlFor="g-date"><Input id="g-date" name="taken_on" type="date" defaultValue={album?.taken_on ?? ""} /></Field>
      </div>
      <Field label={t("description")} htmlFor="g-desc"><Textarea id="g-desc" name="description" defaultValue={album?.description ?? ""} maxLength={1000} className="min-h-[70px]" placeholder={t("descriptionPh")} /></Field>
      <label className="flex items-start gap-2.5 text-sm">
        <input type="checkbox" name="is_published" defaultChecked={album?.is_published ?? true} className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]" />
        <span><span className="font-medium">{t("published")}</span><span className="block text-xs text-muted-foreground">{t("publishedHint")}</span></span>
      </label>
      <SubmitButton pendingText={t("saving")}>{album ? t("save") : t("create")}</SubmitButton>
    </ActionForm>
  );
}

export function DeleteAlbumButton({ id }: { id: string }) {
  const t = useT("admin.gallery");
  return (
    <ActionForm action={deleteAlbumAction} confirm={t("deleteAlbumConfirm")}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 /> {t("deleteAlbum")}</SubmitButton>
    </ActionForm>
  );
}

/** Phone photos are 4–10 MB; shrink to ≤ 2000 px JPEG (≈ 300–700 KB) before uploading, which also fixes the rotation. */
async function shrink(file: File, maxSide = 2000): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size <= 1.5 * 1024 * 1024 && (file.type === "image/jpeg" || file.type === "image/webp")) { bmp.close(); return file; }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.86));
    return blob ?? file;
  } catch { return file; }
}

export function PhotoUploader({ albumId }: { albumId: string }) {
  const t = useT("admin.gallery");
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [over, setOver] = useState(false);

  async function upload(files: File[]) {
    const images = files.filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type));
    if (images.length < files.length) toast.error(t("notImage"));
    const list = images.slice(0, MAX_PHOTOS_PER_UPLOAD);
    if (images.length > list.length) toast.error(t("tooMany", { n: MAX_PHOTOS_PER_UPLOAD }));
    if (!list.length) return;
    setProgress({ done: 0, total: list.length });
    const db = createClient();
    const paths: string[] = [];
    let next = 0, done = 0;
    // three at a time keeps a phone connection busy without choking it
    await Promise.all(Array.from({ length: Math.min(3, list.length) }, async () => {
      while (next < list.length) {
        const file = list[next++];
        const blob = await shrink(file);
        const path = `${albumId}/${crypto.randomUUID()}.${blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg"}`;
        const { error } = await db.storage.from("gallery").upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: false });
        if (error) toast.error(`${file.name}: ${error.message}`); else paths.push(path);
        setProgress({ done: ++done, total: list.length });
      }
    }));
    if (paths.length) {
      const res = await addPhotosAction(albumId, paths);
      if (res?.error) toast.error(res.error); else toast.success(res?.message ?? "");
      router.refresh();
    }
    setProgress(null);
    if (input.current) input.current.value = "";
  }

  const busy = !!progress;
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (!busy) void upload(Array.from(e.dataTransfer.files)); }}
      className={cn("rounded-2xl border-2 border-dashed p-5 text-center transition", over ? "border-primary bg-primary/5" : "border-border", busy && "opacity-90")}>
      <label className={cn("flex cursor-pointer flex-col items-center gap-2", busy && "pointer-events-none")}>
        {busy ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <ImagePlus className="h-8 w-8 text-primary" />}
        <span className="font-display text-base font-semibold">{busy ? t("uploading", { done: progress.done, total: progress.total }) : t("addPhotos")}</span>
        <span className="max-w-sm text-xs text-muted-foreground">{t("addPhotosHint", { n: MAX_PHOTOS_PER_UPLOAD })}</span>
        <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={(e) => void upload(Array.from(e.target.files ?? []))} />
      </label>
      {busy && <div className="mx-auto mt-3 h-1.5 max-w-xs overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} /></div>}
    </div>
  );
}

export function PhotoTile({ photo, isCover }: { photo: PhotoRow; isCover: boolean }) {
  const t = useT("admin.gallery");
  const [caption, setCaption] = useState(photo.caption ?? "");
  return (
    <li className="overflow-hidden rounded-2xl border bg-card shadow-soft">
      <div className="relative aspect-[4/3] bg-muted">
        <Image src={galleryUrl(photo.path)} alt={photo.caption ?? ""} fill sizes="(max-width: 640px) 50vw, 240px" className="object-cover" />
        {isCover && <Badge variant="default" className="absolute left-2 top-2 shadow"><Star className="fill-current" /> {t("cover")}</Badge>}
      </div>
      <div className="space-y-2 p-2.5">
        <ActionForm action={updateCaptionAction} className="flex gap-1.5">
          <input type="hidden" name="id" value={photo.id} />
          <Input name="caption" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={200} placeholder={t("captionPh")} className="h-9 min-w-0 flex-1 text-sm" aria-label={t("caption")} />
          <SubmitButton variant="outline" size="icon" aria-label={t("saveCaption")} title={t("saveCaption")} className="h-9 w-9 shrink-0"><Check /></SubmitButton>
        </ActionForm>
        <div className="flex items-center justify-between gap-1">
          {isCover ? <span className="text-xs text-muted-foreground">{t("isCover")}</span> : (
            <ActionForm action={makeCoverAction}>
              <input type="hidden" name="id" value={photo.id} />
              <SubmitButton variant="ghost" size="sm" className="h-8 px-2 text-xs"><Star /> {t("makeCover")}</SubmitButton>
            </ActionForm>
          )}
          <ActionForm action={deletePhotoAction} confirm={t("deletePhotoConfirm")}>
            <input type="hidden" name="id" value={photo.id} />
            <SubmitButton variant="ghost" size="icon" aria-label={t("deletePhoto")} title={t("deletePhoto")} className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 /></SubmitButton>
          </ActionForm>
        </div>
      </div>
    </li>
  );
}
