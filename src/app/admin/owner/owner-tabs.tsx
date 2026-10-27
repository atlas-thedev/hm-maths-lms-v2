"use client";
import { Activity, LayoutDashboard, Megaphone, Users } from "lucide-react";
import { TabNav } from "@/components/ui";
import { useT } from "@/i18n/client";

export function OwnerTabs() {
  const t = useT("admin.owner.tabs");
  return (
    <TabNav label={t("label")} items={[
      { href: "/admin/owner", label: t("overview"), icon: LayoutDashboard, exact: true },
      { href: "/admin/owner/staff", label: t("staff"), icon: Users },
      { href: "/admin/owner/activity", label: t("activity"), icon: Activity },
      { href: "/admin/owner/landing", label: t("landing"), icon: Megaphone },
    ]} />
  );
}
