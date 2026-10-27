"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Trash2, Upload, Zap } from "lucide-react";
import { toast } from "sonner";
import { ActionForm } from "@/components/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { setAvatarAction, updateProfileAction } from "@/app/dashboard/actions";
import {
  PROFILE_SYNC_EVENT,
  type ProfileSyncPayload,
  broadcastDataMutation,
  broadcastProfileSync,
} from "@/components/notices-realtime";
import { createClient } from "@/lib/db/client";
import { useT, useTownKeys } from "@/i18n/client";
import { DISTRICTS } from "@/lib/constants";
import type { Profile } from "@/lib/types";
import { cn, initials } from "@/lib/utils";

/**Shrinks the chosen photo to a 512px square-ish JPEG in the browser (fast upload, under the 2 MB limit). */
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 512 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((ok, fail) =>
    canvas.toBlob((b) => (b ? ok(b) : fail(new Error("encode"))), "image/jpeg", 0.85),
  );
}

/** Shared hook so both the Hero Avatar and the Studio Upload bar stay 100% in sync in 0ms real time. */
function useAvatarUploader(userId: string, initialPhotoUrl: string | null, initialName: string) {
  const t = useT("portal.profile");
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [livePhoto, setLivePhoto] = useState<string | null>(initialPhotoUrl);
  const [liveName, setLiveName] = useState<string>(initialName);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setLivePhoto(initialPhotoUrl);
  }, [initialPhotoUrl]);

  useEffect(() => {
    setLiveName(initialName);
  }, [initialName]);

  useEffect(() => {
    const onSync = (e: Event) => {
      const detail = (e as CustomEvent<ProfileSyncPayload>).detail;
      if (!detail) return;
      if (detail.avatar !== undefined) setLivePhoto(detail.avatar);
      if (detail.name !== undefined) setLiveName(detail.name);
    };
    window.addEventListener(PROFILE_SYNC_EVENT, onSync);
    return () => window.removeEventListener(PROFILE_SYNC_EVENT, onSync);
  }, []);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      toast.error(t("photoType"));
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error(t("photoTooBig"));
      return;
    }
    const previousPhoto = livePhoto;
    setBusy(true);
    try {
      const blob = await shrink(file).catch(() => file);
      // 0ms optimistic real-time preview across Hero, Topbar, Sidebar & Form
      const previewUrl = URL.createObjectURL(blob);
      setLivePhoto(previewUrl);
      broadcastProfileSync({ avatar: previewUrl });

      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error } = await createClient()
        .storage.from("avatars")
        .upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: false });
      if (error) {
        setLivePhoto(previousPhoto);
        broadcastProfileSync({ avatar: previousPhoto });
        toast.error(error.message);
        return;
      }
      const r = await setAvatarAction(path);
      if (r?.error) {
        setLivePhoto(previousPhoto);
        broadcastProfileSync({ avatar: previousPhoto });
        toast.error(r.error);
      } else {
        toast.success(r?.message ?? "");
        broadcastDataMutation("profile");
        startTransition(() => router.refresh());
      }
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function removePhoto() {
    const previousPhoto = livePhoto;
    setBusy(true);
    setLivePhoto(null);
    broadcastProfileSync({ avatar: null });
    try {
      const r = await setAvatarAction(null);
      if (r?.error) {
        setLivePhoto(previousPhoto);
        broadcastProfileSync({ avatar: previousPhoto });
        toast.error(r.error);
      } else {
        toast.success(r?.message ?? "");
        broadcastDataMutation("profile");
        startTransition(() => router.refresh());
      }
    } finally {
      setBusy(false);
    }
  }

  return {
    input,
    busy,
    livePhoto,
    liveName,
    hasPhoto: !!livePhoto,
    onFile,
    removePhoto,
    openPicker: () => !busy && input.current?.click(),
  };
}

/**
 * Clean Hero Avatar + Frosted Cover Action Pill.
 * - High-contrast dark cover banner with a frosted-glass "Upload / Change photo" pill on the top-right.
 * - Clean avatar tile with a dark/white high-contrast camera badge and 0ms real-time preview.
 */
export function AvatarControls({
  userId,
  photoUrl,
  fullName,
}: {
  userId: string;
  hasPhoto?: boolean;
  photoUrl: string | null;
  initialsText?: string;
  fullName: string;
}) {
  const t = useT("portal.profile");
  const { input, busy, livePhoto, liveName, hasPhoto, onFile, removePhoto, openPicker } =
    useAvatarUploader(userId, photoUrl, fullName);
  const label = hasPhoto ? t("photoChange") : t("photoUpload");

  return (
    <div className="relative -mt-12 flex items-end gap-3">
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        data-testid="avatar-input"
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      <div className="relative h-24 w-24 shrink-0 sm:h-28 sm:w-28">
        <button
          type="button"
          disabled={busy}
          onClick={openPicker}
          aria-label={label}
          title={label}
          data-testid="avatar-trigger"
          className="group relative block h-full w-full cursor-pointer overflow-hidden rounded-2xl bg-card shadow-2xl shadow-black/25 ring-4 ring-card transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary disabled:cursor-wait"
        >
          {livePhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={livePhoto}
              alt=""
              data-testid="profile-photo"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-gradient-brand font-display text-3xl font-bold text-white">
              {initials(liveName)}
            </div>
          )}

          {/* Clean busy indicator overlay (no camera icon) */}
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center bg-slate-950/60 text-white backdrop-blur-[2px]">
              <Loader2 className="h-6 w-6 animate-spin" />
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

export function ProfileForm({ profile, initialPhotoUrl }: { profile: Profile; initialPhotoUrl?: string | null }) {
  const t = useT("portal.profile");
  const tc = useT("common");
  const townKeys = useTownKeys();
  const { busy, livePhoto, liveName, hasPhoto, onFile, removePhoto } = useAvatarUploader(
    profile.id,
    initialPhotoUrl ?? null,
    profile.full_name,
  );
  const studioInput = useRef<HTMLInputElement>(null);

  const locked: [string, string | number | null][] = [
    [t("mobile"), profile.mobile],
    [t("alYear"), profile.al_year],
    [t("nic"), profile.nic],
  ];

  return (
    <ActionForm
      action={updateProfileAction}
      className="space-y-6"
      onSuccess={() => {
        broadcastDataMutation("profile");
      }}
    >
      {(state) => (
        <>
          {/* Clean, modern Profile Picture Studio bar */}
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-border/80 bg-muted/30 p-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3.5">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl shadow-sm ring-2 ring-border">
                {livePhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={livePhoto} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-gradient-brand font-display text-lg font-bold text-white">
                    {initials(liveName)}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {hasPhoto ? t("photoChange") : t("photoUpload")}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("photoStudioHint")}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={studioInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => studioInput.current?.click()}
                className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {hasPhoto ? t("photoChange") : t("photoUpload")}
              </button>
              {hasPhoto && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={removePhoto}
                  className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-destructive/25 bg-destructive/10 px-3 text-xs font-semibold text-destructive-soft-foreground transition hover:bg-destructive/20 disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" /> {t("photoRemove")}
                </button>
              )}
            </div>
          </div>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("lockedTitle")}</p>
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Lock className="h-3 w-3" /> {t("locked")}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {locked.map(([label, value], i) => (
                <div key={label} className={cn("rounded-xl border bg-muted/40 px-3.5 py-3", i === 2 && "col-span-2 sm:col-span-1")}>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="mt-0.5 truncate font-mono text-sm font-semibold">{value ?? tc("dash")}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("editable")}</p>
            <Field label={t("fullName")} htmlFor="full_name">
              <Input
                id="full_name"
                name="full_name"
                defaultValue={profile.full_name}
                required
                minLength={3}
                maxLength={120}
                autoComplete="name"
                onChange={(e) => {
                  const v = e.target.value.trim();
                  if (v.length >= 2) broadcastProfileSync({ name: v });
                }}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t("school")} htmlFor="school">
                <Input id="school" name="school" defaultValue={profile.school ?? ""} maxLength={120} />
              </Field>
              <Field label={t("district")} htmlFor="district">
                <Select id="district" name="district" defaultValue={profile.district ?? ""}>
                  <option value="">{tc("dash")}</option>
                  {DISTRICTS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label={t("town")} htmlFor="town">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {townKeys.map((x) => (
                  <label key={x} className="flex cursor-pointer">
                    <input type="radio" name="town" value={x} defaultChecked={profile.town === x} className="peer sr-only" />
                    <span className="flex min-h-10 w-full items-center justify-center rounded-lg border px-2 py-1.5 text-center text-sm font-medium leading-snug transition hover:border-teal-500/50 peer-checked:border-teal-600 peer-checked:bg-teal-50 peer-checked:text-teal-700 peer-focus-visible:ring-2 peer-focus-visible:ring-ring dark:peer-checked:bg-teal-500/10 dark:peer-checked:text-teal-300">
                      {tc(`towns.${x}`)}
                    </span>
                  </label>
                ))}
              </div>
            </Field>
          </section>

          <section id="contact" className="scroll-mt-24 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("contactTitle")}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("contactHint")}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t("whatsapp")} htmlFor="whatsapp" error={state?.fieldErrors?.whatsapp}>
                <Input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" defaultValue={profile.whatsapp ?? ""} placeholder="07XXXXXXXX" maxLength={15} autoComplete="tel" />
              </Field>
              <Field label={t("guardian")} htmlFor="guardian_mobile" error={state?.fieldErrors?.guardian_mobile}>
                <Input id="guardian_mobile" name="guardian_mobile" type="tel" inputMode="tel" defaultValue={profile.guardian_mobile ?? ""} placeholder="07XXXXXXXX" maxLength={15} />
              </Field>
            </div>
          </section>

          <section id="address" className="scroll-mt-24 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("deliveryTitle")}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("deliveryHint")}</p>
            </div>
            <Field label={t("address")} htmlFor="address">
              <Textarea id="address" name="address" rows={2} defaultValue={profile.address ?? ""} required minLength={8} maxLength={300} autoComplete="street-address" />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_160px]">
              <Field label={t("city")} htmlFor="city">
                <Input id="city" name="city" defaultValue={profile.city ?? ""} required minLength={2} maxLength={80} autoComplete="address-level2" />
              </Field>
              <Field label={t("postal")} htmlFor="postal_code">
                <Input id="postal_code" name="postal_code" defaultValue={profile.postal_code ?? ""} inputMode="numeric" pattern="\d{5}" maxLength={5} autoComplete="postal-code" />
              </Field>
            </div>
          </section>

          <div className="flex items-center justify-between border-t pt-4">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-primary" /> {t("realtimeActive")}
            </span>
            <SubmitButton pendingText={tc("actions.saving")}>{tc("actions.saveChanges")}</SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}
