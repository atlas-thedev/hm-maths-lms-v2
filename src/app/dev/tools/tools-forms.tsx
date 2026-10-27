"use client";
import { RefreshCw } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { clearCacheAction } from "../actions";

export function ClearCacheButton() {
  return (
    <ActionForm action={async () => clearCacheAction()}>
      <SubmitButton block variant="outline" pendingText="Clearing…"><RefreshCw /> Clear page cache</SubmitButton>
    </ActionForm>
  );
}
