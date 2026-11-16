import { Database, ShieldAlert, UserCog } from "lucide-react";
import { requireSuperAdmin } from "@/lib/auth";
import { asService } from "@/lib/db/pg";
import { getT } from "@/i18n/server";
import { Badge, Card, CardContent, CardHeader, ListRow, PageHeader } from "@/components/ui";
import { SuperCleanupButtons, SuperOverrideForm } from "./super-forms";

export const metadata = { title: "Super Admin" };
export const dynamic = "force-dynamic";

export default async function DevSuperPage() {
  const [, t] = await Promise.all([requireSuperAdmin(), getT("dev.super")]);
  const counts = await asService(async (c) => {
    const r = await c.query(`select
      (select count(*) from public.profiles)::int as profiles,
      (select count(*) from public.classes)::int as classes,
      (select count(*) from public.lessons)::int as lessons,
      (select count(*) from public.enrollments)::int as enrollments,
      (select count(*) from public.orders)::int as orders,
      (select count(*) from public.deliveries)::int as deliveries,
      (select count(*) from public.support_conversations)::int as support_chats,
      (select count(*) from public.audit_logs)::int as audit_logs,
      (select count(*) from auth.sessions where revoked_at is null)::int as active_sessions`);
    return r.rows[0] as Record<string, number>;
  });

  const tables = [
    { name: "profiles", count: counts.profiles },
    { name: "classes", count: counts.classes },
    { name: "lessons", count: counts.lessons },
    { name: "enrollments", count: counts.enrollments },
    { name: "orders", count: counts.orders },
    { name: "deliveries", count: counts.deliveries },
    { name: "support_conversations", count: counts.support_chats },
    { name: "audit_logs", count: counts.audit_logs },
    { name: "auth.sessions (active)", count: counts.active_sessions },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title={t("title")} sticker="shield" description={t("description")} />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader icon={UserCog} title={t("roleTool")} description={t("roleToolDesc")} />
          <CardContent><SuperOverrideForm /></CardContent>
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader icon={ShieldAlert} title={t("cleanup")} description={t("cleanupDesc")} />
            <CardContent><SuperCleanupButtons /></CardContent>
          </Card>
          <Card>
            <CardHeader icon={Database} title={t("dbTables")} description={t("dbTablesDesc")} />
            <CardContent className="space-y-1.5">
              {tables.map((row) => (
                <ListRow key={row.name} title={row.name} trailing={<Badge variant="secondary">{row.count}</Badge>} />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
