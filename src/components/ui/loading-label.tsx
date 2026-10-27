"use client";
import { useT } from "@/i18n/client";

/** Screen-reader text for skeleton screens, in the visitor's language. */
export function LoadingLabel() {
  const t = useT("common");
  return <span className="sr-only">{t("pageLoading")}</span>;
}
