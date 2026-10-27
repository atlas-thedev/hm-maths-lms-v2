"use client";

import { useState } from "react";
import { KeyRound, Mail, MessageSquare, Save, Send, ShieldCheck, UserPlus } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { PasswordInput } from "@/components/password-input";
import { Alert, Badge, Field, Input, Select, cardVariants } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { useT } from "@/i18n/client";
import type { LandingStatsSettings } from "@/lib/settings";
import {
  changeStaffRoleAction,
  createStaffAccountAction,
  resetStaffPasswordAction,
  saveLandingStatsAction,
} from "./actions";
import { cn } from "@/lib/utils";

export function CreateStaffForm() {
  const t = useT("admin.owner");
  return (
    <ActionForm action={createStaffAccountAction} resetOnSuccess className="space-y-4">
      {(state) => (
        <>
          {state?.error ? <Alert variant="error">{state.error}</Alert> : null}
          {state?.ok && state?.message ? <Alert variant="success">{state.message}</Alert> : null}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-3 [&>*]:min-w-0">
            <Field label={t("staff.fullName")} htmlFor="staff_full_name">
              <Input id="staff_full_name" name="full_name" placeholder="Kasun Jayawardena" required />
            </Field>
            <Field label={t("staff.email")} htmlFor="staff_email" hint={t("staff.emailHint")}>
              <Input id="staff_email" name="email" type="email" placeholder="kasun@hmmaths.lk" required />
            </Field>
            <Field label={t("staff.mobile")} htmlFor="staff_mobile">
              <Input id="staff_mobile" name="mobile" inputMode="tel" placeholder="0771234567" />
            </Field>
            <Field label={t("staff.role")} htmlFor="staff_role">
              <Select id="staff_role" name="role" defaultValue="admin">
                <option value="admin">{t("staff.roleAdmin")}</option>
                <option value="owner">{t("staff.roleOwner")}</option>
              </Select>
            </Field>
          </div>
          <Field label={t("staff.password")} htmlFor="staff_password" hint={t("staff.passwordHint")}>
            <PasswordInput id="staff_password" name="password" minLength={8} required />
          </Field>
          <SubmitButton className="w-full sm:w-auto" data-testid="create-staff-submit">
            <UserPlus className="h-4 w-4" /> {t("staff.createBtn")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}

export function StaffRowActions({
  id,
  name,
  role,
  isSelf,
}: {
  id: string;
  name: string;
  role: "admin" | "owner";
  isSelf: boolean;
}) {
  const t = useT("admin.owner");
  if (isSelf) {
    return <span className="text-xs font-medium text-muted-foreground">{t("staff.you")}</span>;
  }
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <ActionForm action={changeStaffRoleAction} className="inline-flex items-center gap-1">
        {() => (
          <>
            <input type="hidden" name="id" value={id} />
            <Select name="role" defaultValue={role} className="h-8 w-28 text-xs" aria-label={t("staff.role")}>
              <option value="admin">{t("staff.roleAdmin")}</option>
              <option value="owner">{t("staff.roleOwner")}</option>
              <option value="student">{t("staff.demoteStudent")}</option>
            </Select>
            <SubmitButton size="sm" variant="outline" className="h-8 px-2.5 text-xs">
              {t("staff.updateRole")}
            </SubmitButton>
          </>
        )}
      </ActionForm>
      <ActionForm action={resetStaffPasswordAction} confirm={t("staff.resetConfirm", { name })} className="inline-flex">
        {() => (
          <>
            <input type="hidden" name="id" value={id} />
            <SubmitButton size="sm" variant="ghost" className="h-8 px-2 text-xs">
              <KeyRound className="h-3.5 w-3.5" /> {t("staff.resetPw")}
            </SubmitButton>
          </>
        )}
      </ActionForm>
    </div>
  );
}

export function LandingStatsForm({ initial }: { initial: LandingStatsSettings }) {
  const t = useT("admin.owner");
  return (
    <ActionForm action={saveLandingStatsAction} className="space-y-4">
      {(state) => (
        <>
          {state?.error ? <Alert variant="error">{state.error}</Alert> : null}
          {state?.ok && state?.message ? <Alert variant="success">{state.message}</Alert> : null}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-3 [&>*]:min-w-0">
            <Field label={t("landing.abResults")} htmlFor="ab_results" hint={t("landing.abResultsHint")}>
              <Input id="ab_results" name="ab_results" defaultValue={initial.abResults} placeholder="+500" required />
            </Field>
            <Field label={t("landing.subscribers")} htmlFor="landing_subscribers">
              <Input id="landing_subscribers" name="subscribers" defaultValue={initial.subscribers} placeholder="7.4K+" required />
            </Field>
            <Field label={t("landing.videos")} htmlFor="landing_videos">
              <Input id="landing_videos" name="videos" defaultValue={initial.videos} placeholder="226+" required />
            </Field>
          </div>
          <SubmitButton variant="outline" className="h-auto min-h-10 w-full whitespace-normal py-2 text-center" data-testid="save-landing-stats-btn">
            <Save className="h-4 w-4" /> {t("landing.saveBtn")}
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
