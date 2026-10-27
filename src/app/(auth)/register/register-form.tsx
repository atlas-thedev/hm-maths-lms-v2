"use client";
import Link from "next/link";
import { useState } from "react";
import { GraduationCap, KeyRound, MapPin, UserRound, type LucideIcon } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { registerAction } from "@/app/auth-actions";
import { Alert, Field, IconTile, Input, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { PasswordInput } from "@/components/password-input";
import { useT, useTownKeys } from "@/i18n/client";
import { AL_YEARS, ATTEMPTS, DISTRICTS, SIGNUP_HONEYPOT } from "@/lib/constants";

function Step({ n, icon: Icon, title, hint, children }: { n: number; icon: LucideIcon; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-2xl border border-border/80 bg-card/60 p-4 sm:p-5">
      <legend className="sr-only">{title}</legend>
      <div className="flex items-center gap-3">
        <IconTile icon={Icon} variant="solid" className="relative overflow-visible">
          <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-card text-[10px] font-bold text-primary ring-2 ring-primary/20">{n}</span>
        </IconTile>
        <div className="min-w-0">
          <p className="font-display text-[15px] font-semibold">{title}</p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </div>
      {children}
    </fieldset>
  );
}

/**
 * Hidden from people (and screen readers); bots that fill every field get rejected. The data-* attributes
 * tell password managers (LastPass, 1Password, Bitwarden, Dashlane) to leave it alone.
 */
function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label htmlFor={SIGNUP_HONEYPOT}>Leave this field empty</label>
      <input id={SIGNUP_HONEYPOT} name={SIGNUP_HONEYPOT} type="text" tabIndex={-1} autoComplete="off" defaultValue=""
        data-lpignore="true" data-1p-ignore="true" data-bwignore="true" data-form-type="other" />
    </div>
  );
}

export function RegisterForm({ ticket }: { ticket: string }) {
  const t = useT("auth.register");
  const tc = useT("common");
  const townKeys = useTownKeys();
  const [waSame, setWaSame] = useState(true);
  const h = "h-11";

  return (
    <ActionForm action={registerAction} className="relative space-y-4" toasts={false}>
      {(state) => { const fe = state?.fieldErrors ?? {}; return (<>
        {state?.error ? <Alert variant="error">{state.error}</Alert> : null}
        {state?.ok ? <Alert variant="success">{state.message} <Link className="underline" href="/login">{t("signIn")}</Link></Alert> : null}
        <input type="hidden" name="form_ticket" value={ticket} />
        <Honeypot />
        <Step n={1} icon={UserRound} title={t("steps.personal")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("firstName")} htmlFor="first_name" error={fe.first_name}>
            <Input id="first_name" name="first_name" autoComplete="given-name" placeholder={t("firstNamePlaceholder")} className={h} required />
          </Field>
          <Field label={t("lastName")} htmlFor="last_name" error={fe.last_name}>
            <Input id="last_name" name="last_name" autoComplete="family-name" placeholder={t("lastNamePlaceholder")} className={h} required />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("mobile")} htmlFor="mobile" error={fe.mobile} hint={t("mobileHint")}>
            <Input id="mobile" name="mobile" inputMode="tel" autoComplete="tel" placeholder={t("mobilePlaceholder")} className={h} required />
          </Field>
          <Field label={t("whatsapp")} htmlFor="whatsapp" error={fe.whatsapp} hint={t("whatsappHint")}>
            <div className="space-y-2">
              <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-input px-3 text-sm font-medium">
                <input type="checkbox" name="wa_same" checked={waSame} onChange={(e) => setWaSame(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
                {t("sameAsMobile")}
              </label>
              {!waSame && <Input id="whatsapp" name="whatsapp" inputMode="tel" autoComplete="tel" placeholder={t("mobilePlaceholder")} className={h} required />}
            </div>
          </Field>
        </div>
        <Field label={t("nic")} htmlFor="nic" error={fe.nic}>
          <Input id="nic" name="nic" placeholder={t("nicPlaceholder")} className={h} required />
        </Field>
        </Step>
        <Step n={2} icon={GraduationCap} title={t("steps.school")}>
        <div className="grid grid-cols-1 items-end gap-4 min-[420px]:grid-cols-2">
          <Field label={t("alYear")} htmlFor="al_year" error={fe.al_year}>
            <Select id="al_year" name="al_year" defaultValue="" className={h} required>
              <option value="" disabled>{t("selectYear")}</option>
              {AL_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
          </Field>
          <Field label={t("attempt")} htmlFor="attempt" error={fe.attempt}>
            <Select id="attempt" name="attempt" defaultValue="1" className={h} required>
              {ATTEMPTS.map((a) => <option key={a} value={a}>{tc(`attempts.${a}`)}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("town")} htmlFor="town" error={fe.town}>
            <Select id="town" name="town" defaultValue="" className={h} required>
              <option value="" disabled>{t("selectTown")}</option>
              {townKeys.map((x) => <option key={x} value={x}>{tc(`towns.${x}`)}</option>)}
            </Select>
          </Field>
          <Field label={t("school")} htmlFor="school" error={fe.school}>
            <Input id="school" name="school" placeholder={t("schoolPlaceholder")} className={h} required />
          </Field>
        </div>
        </Step>
        <Step n={3} icon={MapPin} title={t("steps.address")} hint={t("addressHint")}>
          <Field label={t("address")} htmlFor="address" error={fe.address}>
            <Textarea id="address" name="address" autoComplete="street-address" rows={2} placeholder={t("addressPlaceholder")} required minLength={8} maxLength={300} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_160px]">
            <div className="space-y-4">
              <Field label={t("district")} htmlFor="district" error={fe.district}>
                <Select id="district" name="district" defaultValue="" className={h} required>
                  <option value="" disabled>{t("selectDistrict")}</option>
                  {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </Select>
              </Field>
              <Field label={t("city")} htmlFor="city" error={fe.city}>
                <Input id="city" name="city" autoComplete="address-level2" placeholder={t("cityPlaceholder")} className={h} required />
              </Field>
            </div>
            <Field label={t("postal")} htmlFor="postal_code" error={fe.postal_code}>
              <Input id="postal_code" name="postal_code" inputMode="numeric" autoComplete="postal-code" pattern="\d{5}" maxLength={5} placeholder="12500" className={h} />
            </Field>
          </div>
        </Step>
        <Step n={4} icon={KeyRound} title={t("steps.security")}>
          <Field label={t("password")} htmlFor="password" error={fe.password}>
            <PasswordInput id="password" name="password" autoComplete="new-password" minLength={8} className={h} meter required />
          </Field>
          <Field label={t("repeat")} htmlFor="confirm" error={fe.confirm}>
            <PasswordInput id="confirm" name="confirm" autoComplete="new-password" className={h} required />
          </Field>
        </Step>
        <SubmitButton className="h-12 w-full rounded-xl text-base" pendingText={t("pending")}>{t("submit")}</SubmitButton>
        <p className="text-center text-sm text-muted-foreground">
          {t("haveAccount")} <Link href="/login" className="font-semibold text-primary hover:underline">{t("signIn")}</Link>
        </p>
        <p className="text-center text-xs text-muted-foreground">{t("terms")}</p>
      </>); }}
    </ActionForm>
  );
}
