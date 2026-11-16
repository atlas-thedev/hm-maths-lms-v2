import { DashboardShell, type ShellGroup, type ShellItem } from "@/components/dashboard-shell";
import { requireDeveloper } from "@/lib/auth";
import { getT } from "@/i18n/server";

export const metadata = { title: { default: "Developer panel", template: "%s · Developer" }, robots: { index: false, follow: false } };

/** Developer panel: theme, maintenance, announcements, accounts & sessions, logs, tools, UI kit. Developer & Superadmin roles. */
export default async function DevLayout({ children }: { children: React.ReactNode }) {
  const [{ profile, db }, t] = await Promise.all([requireDeveloper(), getT("dev.nav")]);
  const avatar = profile.avatar_path ? await db.storage.from("avatars").createSignedUrl(profile.avatar_path, 3600) : null;
  const groups: ShellGroup[] = [
    { label: t("developer"), items: [
      { href: "/dev", label: t("overview"), tab: t("tabHome"), icon: "dashboard", exact: true },
      { href: "/dev/theme", label: t("theme"), tab: t("tabTheme"), icon: "palette" },
      { href: "/dev/brand", label: t("brand"), tab: t("tabBrand"), icon: "brand" },
      { href: "/dev/content", label: t("content"), icon: "type" },
      { href: "/dev/results", label: t("results"), icon: "grad" },
      { href: "/dev/faq", label: t("faq"), icon: "faq" },
      { href: "/dev/centers", label: t("centers"), icon: "map" },
      { href: "/dev/contact", label: t("contact"), icon: "link" },
      { href: "/dev/site", label: t("site"), tab: t("tabSite"), icon: "power" },
      { href: "/dev/users", label: t("users"), tab: t("tabUsers"), icon: "team" },
      { href: "/dev/logs", label: t("logs"), tab: t("tabLogs"), icon: "activity" },
      { href: "/dev/tools", label: t("tools"), icon: "wrench" },
      ...(profile.role === "superadmin" ? [{ href: "/dev/super", label: t("superAdmin"), icon: "shield" } as ShellItem] : []),
      { href: "/dev/ui", label: t("ui"), icon: "kit" },
    ] },
    { label: t("goTo"), items: [
      { href: "/admin", label: t("adminPanel"), icon: "grad", exact: true },
      { href: "/admin/owner", label: t("ownerConsole"), icon: "shield" },
      { href: "/dashboard", label: t("studentView"), icon: "home", exact: true },
    ] },
  ];
  const menu: ShellItem[] = [
    { href: "/admin", label: t("adminPanel"), icon: "grad" },
    { href: "/dashboard", label: t("studentView"), icon: "home" },
  ];
  return (
    <DashboardShell area="dev" groups={groups} menu={menu} crumbNs="admin.devCrumbs"
      tabs={["/dev", "/dev/theme", "/dev/site", "/dev/users"]}
      user={{ name: profile.full_name, subtitle: profile.role === "superadmin" ? t("roleSuperadmin") : t("roleDeveloper"), avatar: avatar?.data?.signedUrl ?? null }}>
      {children}
    </DashboardShell>
  );
}
