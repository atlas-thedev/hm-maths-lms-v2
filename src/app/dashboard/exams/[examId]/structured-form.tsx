"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/db/client";
import { FileUpload } from "@/components/file-upload";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import { dbError } from "@/i18n/translate";

export function StructuredForm({ examId, userId }: { examId: string; userId: string }) {
  const t = useT("portal.exam");
  const tr = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const paths = new FormData(e.currentTarget).getAll("sheets").map(String).filter(Boolean);
        if (!paths.length) { toast.error(t("needPage")); return; }
        setBusy(true);
        const { error } = await createClient().rpc("submit_structured", { p_exam: examId, p_paths: paths });
        setBusy(false);
        if (error) { toast.error(dbError(tr, error.message)); return; }
        toast.success(t("submitted"));
        router.refresh();
      }}
    >
      <FileUpload bucket="answer-sheets" prefix={`${userId}/${examId}`} name="sheets" multiple maxMB={10}
        accept="image/jpeg,image/png,image/webp,application/pdf" label={t("addSheets")} />
      <Button type="submit" disabled={busy} className="w-full">{busy ? <Loader2 className="animate-spin" /> : <Upload />} {t("submitSheets")}</Button>
    </form>
  );
}
