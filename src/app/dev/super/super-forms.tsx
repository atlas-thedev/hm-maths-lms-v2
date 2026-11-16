"use client";
import { ActionForm } from "@/components/action-form";
import { PasswordInput } from "@/components/password-input";
import { Field, Input, Select } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { useT } from "@/i18n/client";
import {
  closeAllSupportChatsAction,
  purgeExpiredSessionsAction,
  purgeOldLogsAction,
  superOverrideUserAction,
} from "../actions";

export function SuperOverrideForm() {
  const t = useT("dev.super");
  return (
    <ActionForm action={superOverrideUserAction} resetOnSuccess className="space-y-3">
      <Field label={t("email")} htmlFor="so-email"><Input id="so-email" name="email" type="email" required autoComplete="off" /></Field>
      <Field label={t("role")} htmlFor="so-role">
        <Select id="so-role" name="role" defaultValue="admin">
          <option value="student">Student</option>
          <option value="admin">Admin</option>
          <option value="owner">Owner</option>
          <option value="developer">Developer</option>
          <option value="superadmin">Super Admin</option>
        </Select>
      </Field>
      <Field label={t("password")} htmlFor="so-pw"><PasswordInput id="so-pw" name="password" autoComplete="new-password" /></Field>
      <SubmitButton block pendingText={t("applying")}>{t("apply")}</SubmitButton>
    </ActionForm>
  );
}

export function SuperCleanupButtons() {
  const t = useT("dev.super");
  return (
    <div className="space-y-2.5">
      <ActionForm action={purgeExpiredSessionsAction} confirm={t("purgeSessionsConfirm")}>
        <SubmitButton block variant="outline" pendingText={t("running")}>{t("purgeSessions")}</SubmitButton>
      </ActionForm>
      <ActionForm action={closeAllSupportChatsAction} confirm={t("closeAllChatsConfirm")}>
        <SubmitButton block variant="outline" pendingText={t("running")}>{t("closeAllChats")}</SubmitButton>
      </ActionForm>
      <ActionForm action={purgeOldLogsAction} confirm={t("purgeLogsConfirm")}>
        <SubmitButton block variant="danger-soft" pendingText={t("running")}>{t("purgeLogs")}</SubmitButton>
      </ActionForm>
    </div>
  );
}
