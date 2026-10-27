import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { StoreCatalog, parseStoreFilter } from "@/components/store-catalog";
import { getSession, isStaffRole } from "@/lib/auth";
import { getT } from "@/i18n/server";
import type { ClassRow, Product } from "@/lib/types";

export async function generateMetadata() {
  return { title: (await getT("portal.store"))("title") };
}

export default async function PublicStorePage({ searchParams }: { searchParams: Promise<{ tab?: string; year?: string; mode?: string }> }) {
  const [{ db, user, profile }, t, sp] = await Promise.all([getSession(), getT("portal.store"), searchParams]);
  const filter = parseStoreFilter(sp, profile?.al_year ?? null);
  const [{ data: classes }, { data: products }] = await Promise.all([
    db.from("classes").select("*").eq("is_active", true).order("target_year").order("title"),
    db.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false }),
  ]);
  return (
    <div className="dark theme-orange min-h-dvh bg-ink text-white">
      <LandingNav account={!user ? "guest" : isStaffRole(profile?.role) ? "admin" : "student"} />
      <div className="relative overflow-hidden bg-gradient-dark pb-32 pt-36 text-white">
        <div className="absolute inset-0 bg-dots opacity-20" />
        <div className="container relative">
          <h1 className="animate-fade-up font-display text-4xl font-extrabold leading-[1.2] sm:text-5xl pb-2">{t("title")}</h1>
          <p className="mt-2 max-w-xl text-white/95 leading-relaxed">{t("publicSubtitle")}</p>
        </div>
      </div>
      <main className="container relative -mt-20 pb-20">
        <div className="rounded-3xl bg-card text-card-foreground border border-border p-5 shadow-lift sm:p-8">
          <StoreCatalog classes={(classes ?? []) as ClassRow[]} products={(products ?? []) as Product[]}
            filter={filter} basePath="/store" myYear={profile?.al_year ?? null} />
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
