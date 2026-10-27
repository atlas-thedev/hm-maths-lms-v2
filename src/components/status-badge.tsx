"use client";
import type { VariantProps } from "class-variance-authority";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import { useT } from "@/i18n/client";

type V = VariantProps<typeof badgeVariants>["variant"];

export function StatusBadge({ status }: { status: string }) {
  const t = useT("common");
  const map: Record<string, V> = {
    approved: "success", graded: "success", shipped: "success", submitted: "default",
    pending: "warning", in_progress: "warning", rejected: "destructive",
  };
  return <Badge variant={map[status] ?? "secondary"}>{t(`status.${status}`)}</Badge>;
}

export function NoticeTagBadge({ tag }: { tag: string }) {
  const t = useT("common");
  const v: V = tag === "Urgent" ? "destructive" : tag === "Exam Notice" ? "warning" : "default";
  return <Badge variant={v}>{t(`noticeTags.${tag}`)}</Badge>;
}
