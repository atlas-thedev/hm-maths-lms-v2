import { HomeNav } from "@/components/landing/home-nav";
import { HomeFooter } from "@/components/landing/home-footer";
import { SmoothScroll } from "@/components/landing/smooth-scroll";
import { getSession, isStaffRole } from "@/lib/auth";

/** The light landing-page chrome (nav + footer) around the public pages: gallery, center pages. */
export async function PublicShell({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getSession();
  const account = !user ? "guest" : isStaffRole(profile?.role) ? "admin" : "student";
  return (
    <div className="force-light theme-orange relative overflow-x-clip bg-landing-bg text-ink">
      <SmoothScroll />
      <HomeNav account={account} />
      <main className="min-h-[70vh]">{children}</main>
      <HomeFooter />
    </div>
  );
}
