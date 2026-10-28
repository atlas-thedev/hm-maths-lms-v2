import { DashboardShell, type ShellGroup, type ShellItem } from "@/components/dashboard-shell";
import { requireDeveloper } from "@/lib/auth";

export const metadata = { title: { default: "Developer panel", template: "%s · Developer" }, robots: { index: false, follow: false } };

/** Developer panel: theme, maintenance, announcements, accounts & sessions, logs, tools, UI kit. Developer role only. */
export default async function DevLayout({ children }: { children: React.ReactNode }) {
  const { profile, db } = await requireDeveloper();
  const avatar = profile.avatar_path ? await db.storage.from("avatars").createSignedUrl(profile.avatar_path, 3600) : null;
  const groups: ShellGroup[] = [
    { label: "Developer", items: [
      { href: "/dev", label: "Overview", tab: "Home", icon: "dashboard", exact: true },
      { href: "/dev/theme", label: "Theme & colours", tab: "Theme", icon: "palette" },
      { href: "/dev/brand", label: "Brand & SEO", tab: "Brand", icon: "brand" },
      { href: "/dev/content", label: "Site text", icon: "type" },
      { href: "/dev/faq", label: "FAQ", icon: "faq" },
      { href: "/dev/centers", label: "Centers", icon: "map" },
      { href: "/dev/contact", label: "Contact & links", icon: "link" },
      { href: "/dev/site", label: "Maintenance & site", tab: "Site", icon: "power" },
      { href: "/dev/users", label: "Accounts & sessions", tab: "Users", icon: "team" },
      { href: "/dev/logs", label: "Activity log", tab: "Logs", icon: "activity" },
      { href: "/dev/tools", label: "Tools & exports", icon: "wrench" },
      { href: "/dev/ui", label: "UI kit", icon: "kit" },
    ] },
    { label: "Go to", items: [
      { href: "/admin", label: "Admin panel", icon: "grad", exact: true },
      { href: "/admin/owner", label: "Owner Console", icon: "shield" },
      { href: "/dashboard", label: "Student view", icon: "home", exact: true },
    ] },
  ];
  const menu: ShellItem[] = [
    { href: "/admin", label: "Admin panel", icon: "grad" },
    { href: "/dashboard", label: "Student view", icon: "home" },
  ];
  return (
    <DashboardShell area="dev" groups={groups} menu={menu} crumbNs="admin.devCrumbs"
      tabs={["/dev", "/dev/theme", "/dev/site", "/dev/users"]}
      user={{ name: profile.full_name, subtitle: "Developer", avatar: avatar?.data?.signedUrl ?? null }}>
      {children}
    </DashboardShell>
  );
}
