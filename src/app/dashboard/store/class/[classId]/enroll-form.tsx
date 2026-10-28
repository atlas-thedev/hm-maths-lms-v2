"use client";
import { useRouter } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { FileUpload } from "@/components/file-upload";
import { Field, Input, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { submitEnrollmentAction } from "@/app/dashboard/actions";
import { useT } from "@/i18n/client";

export type MonthOption = { value: string; label: string; status?: string };

export function EnrollForm({ classId, userId, months, defaultMonth }: { classId: string; userId: string; months: MonthOption[]; defaultMonth: string }) {
  const router = useRouter();
  const t = useT("portal.enroll");
  const tc = useT("common");
  return (
    <ActionForm action={submitEnrollmentAction} className="space-y-4" onSuccess={() => router.push("/dashboard/classes")}>
      <input type="hidden" name="class_id" value={classId} />
      <Field label={t("month")} htmlFor="month">
        <Select id="month" name="month" defaultValue={defaultMonth} required>
          {months.map((m) => (
            <option key={m.value} value={m.value} disabled={m.status === "approved" || m.status === "pending"}>
              {m.label}{m.status ? ` (${tc(`status.${m.status}`)})` : ""}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="පන්තියට සම්බන්ධ වන ආකාරය (Attendance Mode)" htmlFor="attendance_mode">
        <Select id="attendance_mode" name="attendance_mode" defaultValue="online">
          <option value="online">Online පමණක් (Online Live & Recordings)</option>
          <option value="physical_panadura">භෞතිකව (Physical) — සක්යා (පානදුර)</option>
          <option value="physical_horana">භෞතිකව (Physical) — විදුල (හොරණ)</option>
          <option value="physical_mathugama">භෞතිකව (Physical) — පැනෝලා (මතුගම)</option>
          <option value="physical_kalutara">භෞතිකව (Physical) — රසන්‍යා (කළුතර)</option>
        </Select>
      </Field>

      <Field label={t("slip")}>
        <FileUpload bucket="bank-slips" prefix={userId} name="slip_url" accept="image/jpeg,image/png,image/webp,application/pdf" maxMB={5} required label={t("uploadSlip")} />
      </Field>

      <Field label={t("reference")} htmlFor="bank_ref">
        <Input id="bank_ref" name="bank_ref" placeholder={t("referencePlaceholder")} maxLength={80} />
      </Field>

      <Field label="විශේෂ සටහන් / පැරණි කාඩ්පත් අංකය (Notes / Old Student ID)" htmlFor="notes">
        <Input id="notes" name="notes" placeholder="උදා: 2nd/3rd shy පරණ කාඩ්පත් අංකය: HM-2025-... / වෙනත් විස්තර" maxLength={150} />
      </Field>

      <SubmitButton className="w-full" size="lg" pendingText={t("submitting")}>{t("submit")}</SubmitButton>
    </ActionForm>
  );
}
