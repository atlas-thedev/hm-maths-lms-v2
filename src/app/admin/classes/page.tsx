import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { isOwnerRole, requireAdmin } from "@/lib/auth";
import { ClassCard } from "@/components/class-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import type { ClassRow } from "@/lib/types";
import { getT } from "@/i18n/server";

export async function generateMetadata() {
  return { title: (await getT("admin.nav"))("classes") };
}

export default async function AdminClassesPage() {
  const { db, profile } = await requireAdmin();
  const isOwner = isOwnerRole(profile.role);
  const t = await getT("admin.classes");
  const { data } = await db.from("classes").select("*").order("is_active", { ascending: false }).order("target_year").order("title");
  const classes = (data ?? []) as ClassRow[];
  return (
    <div>
      <PageHeader title={t("title")} description={t("subtitle")}>
        {isOwner ? <Link href="/admin/classes/new" className={buttonVariants()}><Plus /> {t("new")}</Link> : null}
      </PageHeader>
      {!classes.length ? (
        <EmptyState icon={BookOpen} title={t("empty")} description={t("emptyText")}>
          {isOwner ? <Link href="/admin/classes/new" className={buttonVariants({ size: "sm" })}>{t("create")}</Link> : null}
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <div key={c.id} className={c.is_active ? "" : "opacity-60"}>
              <ClassCard cls={c} href={isOwner ? `/admin/classes/${c.id}` : undefined} footer={c.is_active ? <Badge variant="success">{t("active")}</Badge> : <Badge variant="secondary">{t("hidden")}</Badge>} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
