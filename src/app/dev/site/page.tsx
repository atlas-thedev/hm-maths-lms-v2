import { requireDeveloper } from "@/lib/auth";
import { getAccessSettings, getAnnouncementSettings, getMaintenanceSettings } from "@/lib/settings";
import { getT } from "@/i18n/server";
import { PageHeader } from "@/components/ui";
import { AccessForm, AnnouncementForm, MaintenanceForm } from "./site-forms";

export const metadata = { title: "Maintenance & site" };
export const dynamic = "force-dynamic";

export default async function DevSitePage() {
  const [, t, [maint, ann, access]] = await Promise.all([
    requireDeveloper(),
    getT("dev.site"),
    Promise.all([getMaintenanceSettings(), getAnnouncementSettings(), getAccessSettings()]),
  ]);
  return (
    <div>
      <PageHeader title={t("title")} sticker="zzz" description={t("description")} />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <MaintenanceForm initial={maint} />
        <div className="space-y-5">
          <AnnouncementForm initial={ann} />
          <AccessForm initial={access} />
        </div>
      </div>
    </div>
  );
}
