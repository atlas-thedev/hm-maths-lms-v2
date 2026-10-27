import { DashboardShell, type ShellGroup, type ShellItem } from "@/components/dashboard-shell";
import { isStaffRole, requireUser } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { getAnnouncementSettings } from "@/lib/settings";

// Private area: keep it out of search engines.
export const metadata = { robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { db, profile } = await requireUser();
  const [t, tg, tt, ann] = await Promise.all([getT("portal.nav"), getT("portal.navGroups"), getT("portal.tabs"), getAnnouncementSettings()]);
  // Bell badge: unread notifications + unseen notices.
  const [{ data: unread }, avatar] = await Promise.all([
    db.rpc("unread_notification_count"),
    profile.avatar_path ? db.storage.from("avatars").createSignedUrl(profile.avatar_path, 3600) : null,
  ]);

  const groups: ShellGroup[] = [
    { label: tg("learn"), items: [
      { href: "/dashboard", label: t("dashboard"), tab: tt("dashboard"), icon: "dashboard", exact: true },
      { href: "/dashboard/classes", label: t("classes"), tab: tt("classes"), icon: "classes" },
      { href: "/dashboard/events", label: t("events"), icon: "events" },
    ] },
    { label: tg("compete"), items: [
      { href: "/dashboard/papers", label: t("papers"), tab: tt("papers"), icon: "papers" },
      { href: "/dashboard/leaderboard", label: t("leaderboard"), icon: "trophy" },
      { href: "/dashboard/exams", label: t("exams"), icon: "exams" },
    ] },
    { label: tg("account"), items: [
      { href: "/dashboard/store", label: t("store"), tab: tt("store"), icon: "store" },
      { href: "/dashboard/payments", label: t("payments"), icon: "payments" },
      { href: "/dashboard/notifications", label: t("notifications"), icon: "notices" },
      { href: "/dashboard/profile", label: t("profile"), icon: "profile" },
    ] },
    { label: tg("support"), items: [
      { href: "/dashboard/channels", label: t("channels"), icon: "channels" },
      { href: "/dashboard/contact", label: t("contact"), icon: "contact" },
      { href: "/dashboard/faq", label: t("faq"), icon: "faq" },
    ] },
  ];
  const menu: ShellItem[] = [
    { href: "/dashboard/profile", label: t("profile"), icon: "profile" },
    { href: "/dashboard/payments", label: t("payments"), icon: "payments" },
    ...(isStaffRole(profile.role) ? [{ href: "/admin", label: t("admin"), icon: "grad" } as ShellItem] : []),
  ];
  return (
    <DashboardShell area="student" announcement={ann.enabled && ann.audience !== "staff" ? ann : null} groups={groups} menu={menu} crumbNs="portal.crumbs"
      tabs={["/dashboard", "/dashboard/classes", "/dashboard/papers", "/dashboard/store"]}
      user={{ name: profile.full_name, subtitle: profile.student_id ?? t("admin"), avatar: avatar?.data?.signedUrl ?? null }}
      notices={{ href: "/dashboard/notifications", count: typeof unread === "number" ? unread : 0 }}>
      {children}
    </DashboardShell>
  );
}
