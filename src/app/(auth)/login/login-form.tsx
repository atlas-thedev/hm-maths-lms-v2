"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { loginAction } from "@/app/auth-actions";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/misc";
import { PasswordInput } from "@/components/password-input";
import { useT } from "@/i18n/client";

export function LoginForm({ next }: { next?: string }) {
  const t = useT("auth.login");
  const reset = useSearchParams().get("reset") === "1";
  return (
    <ActionForm action={loginAction} className="space-y-4" toasts={false}>
      {(state) => (<>
        <input type="hidden" name="next" value={next ?? ""} />
        {reset && !state?.error ? <Alert variant="success" data-testid="reset-done">{t("resetDone")}</Alert> : null}
        {state?.error ? <Alert variant="error">{state.error}</Alert> : null}
        <Field label={t("identifier")} htmlFor="identifier" hint={t("identifierHint")}>
          <Input id="identifier" name="identifier" autoComplete="username" placeholder={t("identifierPlaceholder")} className="h-11" required />
        </Field>
        <Field label={t("password")} htmlFor="password">
          <PasswordInput id="password" name="password" autoComplete="current-password" className="h-11" required />
        </Field>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm font-semibold text-primary hover:underline">{t("forgot")}</Link>
        </div>
        <SubmitButton className="h-12 w-full rounded-xl text-base" pendingText={t("pending")}>{t("submit")}</SubmitButton>
        <p className="text-center text-sm text-slate-600 dark:text-slate-400">
          {t("noAccount")} <Link href="/register" className="font-semibold text-primary hover:underline">{t("signUp")}</Link>
        </p>
      </>)}
    </ActionForm>
  );
}
