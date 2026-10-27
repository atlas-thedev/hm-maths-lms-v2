import { DashboardShell, type ShellGroup, type ShellItem } from "@/components/dashboard-shell";
import { isDeveloperRole, isOwnerRole, requireAdmin } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { getAnnouncementSettings } from "@/lib/settings";

// Private area: keep it out of search engines.
export const metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, db } = await requireAdmin();
  const isOwner = isOwnerRole(profile.role);
  const isDev = isDeveloperRole(profile.role);
  const [t, tg, tt, ann] = await Promise.all([getT("admin.nav"), getT("admin.navGroups"), getT("admin.tabs"), getAnnouncementSettings()]);
  const [{ count: pending }, { count: pendingOrders }, avatar] = await Promise.all([
    db.from("enrollments").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
    profile.avatar_path ? db.storage.from("avatars").createSignedUrl(profile.avatar_path, 3600) : null,
  ]);
  const groups: ShellGroup[] = [
    { label: tg("manage"), items: [
      { href: "/admin", label: t("overview"), tab: tt("overview"), icon: "dashboard", exact: true },
      ...(isOwner ? [{ href: "/admin/owner", label: t("owner"), icon: "shield" } as ShellItem] : []),
      ...(isDev ? [{ href: "/dev", label: t("developer"), icon: "code" } as ShellItem] : []),
      { href: "/admin/attendance", label: t("attendance"), tab: tt("attendance"), icon: "qr" },
      { href: "/admin/payments", label: t("payments"), tab: tt("payments"), icon: "payments", badge: pending ?? 0 },
      { href: "/admin/classes", label: t("classes"), icon: "classes" },
      { href: "/admin/students", label: t("students"), tab: tt("students"), icon: "students" },
    ] },
    { label: tg("assess"), items: [
      { href: "/admin/papers", label: t("papers"), icon: "papers" },
      { href: "/admin/exams", label: t("exams"), icon: "exams" },
    ] },
    { label: tg("engage"), items: [
      { href: "/admin/notices", label: t("notices"), icon: "megaphone" },
      { href: "/admin/events", label: t("events"), icon: "events" },
      { href: "/admin/gallery", label: t("gallery"), icon: "images" },
      { href: "/admin/store", label: t("store"), icon: "package", badge: pendingOrders ?? 0 },
      { href: "/dashboard", label: t("studentView"), icon: "grad", exact: true },
    ] },
  ];
  const menu: ShellItem[] = [
    ...(isDev ? [{ href: "/dev", label: t("developer"), icon: "code" } as ShellItem] : []),
    ...(isOwner ? [{ href: "/admin/owner", label: t("owner"), icon: "shield" } as ShellItem] : []),
    { href: "/dashboard", label: t("studentView"), icon: "grad" },
  ];
  return (
    <DashboardShell area="admin" announcement={ann.enabled && ann.audience !== "students" ? ann : null} groups={groups} menu={menu} crumbNs="admin.crumbs"
      tabs={["/admin", "/admin/attendance", "/admin/payments", "/admin/students"]}
      user={{ name: profile.full_name, subtitle: isDev ? t("developerRole") : isOwner ? t("ownerRole") : t("administrator"), avatar: avatar?.data?.signedUrl ?? null }}>
      {children}
    </DashboardShell>
  );
}
