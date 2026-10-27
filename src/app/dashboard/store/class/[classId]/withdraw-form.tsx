"use client";
import { Undo2 } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { withdrawEnrollmentAction } from "@/app/dashboard/actions";
import { useT } from "@/i18n/client";

export function WithdrawForm({ id }: { id: string }) {
  const t = useT("portal.enroll");
  return (
    <ActionForm action={withdrawEnrollmentAction} confirm={t("withdrawConfirm")}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton size="sm" variant="outline" className="w-full"><Undo2 className="h-4 w-4" /> {t("withdraw")}</SubmitButton>
    </ActionForm>
  );
}
