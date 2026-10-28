import { requireUser } from "@/lib/auth";
import { StoreCatalog, parseStoreFilter, type ClassOwnership } from "@/components/store-catalog";
import { currentMonth } from "@/lib/utils";
import { PageHeader } from "@/components/ui/misc";
import { getT } from "@/i18n/server";
import type { ClassRow, Product } from "@/lib/types";

export async function generateMetadata() {
  return { title: (await getT("portal.nav"))("store") };
}

export default async function StorePage({ searchParams }: { searchParams: Promise<{ tab?: string; year?: string; mode?: string; type?: string }> }) {
  const sp = await searchParams;
  const { db, user, profile } = await requireUser();
  // Opens on the student's own exam year; "All years" and Online / Physical are one tap away.
  const filter = parseStoreFilter(sp, profile.al_year ?? null);
  const t = await getT("portal.store");
  const [{ data: classes }, { data: products }, { data: mine }] = await Promise.all([
    db.from("classes").select("*").eq("is_active", true).order("target_year").order("title"),
    db.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false }),
    db.from("enrollments").select("class_id, status, month").eq("student_id", user.id).in("status", ["approved", "pending"]),
  ]);
  const cur = currentMonth();
  const owned: ClassOwnership = {};
  for (const e of (mine ?? []) as { class_id: string; status: string; month: string }[]) {
    if (e.status === "approved" && e.month >= cur) owned[e.class_id] = "owned";
    else if (e.status === "pending" && !owned[e.class_id]) owned[e.class_id] = "pending";
  }
  return (
    <div>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <div className="rounded-2xl bg-card text-card-foreground border border-border p-5 shadow-soft sm:p-6">
        <StoreCatalog classes={(classes ?? []) as ClassRow[]} products={(products ?? []) as Product[]} owned={owned}
          filter={filter} basePath="/dashboard/store" myYear={profile.al_year ?? null} />
      </div>
    </div>
  );
}
