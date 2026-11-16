"use client";
import { ActionForm } from "@/components/action-form";
import { PasswordInput } from "@/components/password-input";
import { Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { useT } from "@/i18n/client";
import { createDeveloperAction, createSuperadminAction, removeDeveloperAction, removeSuperadminAction, signOutAction } from "../actions";

export function CreateDeveloperForm() {
  const t = useT("dev.users.form");
  return (
    <ActionForm action={createDeveloperAction} resetOnSuccess className="space-y-3">
      <Field label={t("name")} htmlFor="d-name"><Input id="d-name" name="full_name" required minLength={2} /></Field>
      <Field label={t("email")} htmlFor="d-email"><Input id="d-email" name="email" type="email" required autoComplete="off" /></Field>
      <Field label={t("password")} htmlFor="d-pw" hint={t("passwordHint")}><PasswordInput id="d-pw" name="password" autoComplete="new-password" /></Field>
      <SubmitButton block pendingText={t("saving")}>{t("addDeveloper")}</SubmitButton>
    </ActionForm>
  );
}

export function RemoveDeveloperButton({ id, name }: { id: string; name: string }) {
  const t = useT("dev.users.form");
  return (
    <ActionForm action={removeDeveloperAction} confirm={t("removeConfirmDev", { name })}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton size="sm" variant="danger-soft">{t("remove")}</SubmitButton>
    </ActionForm>
  );
}

export function CreateSuperadminForm() {
  const t = useT("dev.users.form");
  return (
    <ActionForm action={createSuperadminAction} resetOnSuccess className="space-y-3">
      <Field label={t("name")} htmlFor="sa-name"><Input id="sa-name" name="full_name" required minLength={2} /></Field>
      <Field label={t("email")} htmlFor="sa-email"><Input id="sa-email" name="email" type="email" required autoComplete="off" /></Field>
      <Field label={t("password")} htmlFor="sa-pw" hint={t("passwordHint")}><PasswordInput id="sa-pw" name="password" autoComplete="new-password" /></Field>
      <SubmitButton block pendingText={t("saving")}>{t("addSuperadmin")}</SubmitButton>
    </ActionForm>
  );
}

export function RemoveSuperadminButton({ id, name }: { id: string; name: string }) {
  const t = useT("dev.users.form");
  return (
    <ActionForm action={removeSuperadminAction} confirm={t("removeConfirmSuper", { name })}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton size="sm" variant="danger-soft">{t("remove")}</SubmitButton>
    </ActionForm>
  );
}

export function SignOutForm({ scope, label }: { scope: "students" | "everyone"; label: string }) {
  const t = useT("dev.users.form");
  return (
    <ActionForm action={signOutAction} confirm={t("signOutConfirm", { label })}>
      <input type="hidden" name="scope" value={scope} />
      <SubmitButton block variant={scope === "everyone" ? "destructive" : "outline"} pendingText={t("signingOut")}>{label}</SubmitButton>
    </ActionForm>
  );
}
