"use client";
import { useRouter } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { FileUpload } from "@/components/file-upload";
import { Field, Input, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { createOrderAction } from "@/app/dashboard/actions";
import { useT } from "@/i18n/client";

export function OrderForm({ productId, userId, defaultAddress = "" }: { productId: string; userId: string; defaultAddress?: string }) {
  const router = useRouter();
  const t = useT("portal.order");
  return (
    <ActionForm action={createOrderAction} className="space-y-4" onSuccess={() => router.push("/dashboard/payments")}>
      <input type="hidden" name="product_id" value={productId} />
      <Field label={t("quantity")} htmlFor="quantity"><Input id="quantity" name="quantity" type="number" min={1} max={20} defaultValue={1} required /></Field>
      <Field label={t("address")} htmlFor="delivery_address" hint={defaultAddress ? t("addressFromProfile") : undefined}>
        <Textarea id="delivery_address" name="delivery_address" placeholder={t("addressPlaceholder")} defaultValue={defaultAddress} rows={3} required minLength={10} />
      </Field>
      <Field label={t("slip")}>
        <FileUpload bucket="bank-slips" prefix={userId} name="slip_url" accept="image/jpeg,image/png,image/webp,application/pdf" required label={t("uploadSlip")} />
      </Field>
      <SubmitButton className="w-full" size="lg" pendingText={t("placing")}>{t("place")}</SubmitButton>
    </ActionForm>
  );
}
