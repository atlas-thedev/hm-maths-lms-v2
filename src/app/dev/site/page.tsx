import { requireDeveloper } from "@/lib/auth";
import { getAccessSettings, getAnnouncementSettings, getMaintenanceSettings } from "@/lib/settings";
import { PageHeader } from "@/components/ui";
import { AccessForm, AnnouncementForm, MaintenanceForm } from "./site-forms";

export const metadata = { title: "Maintenance & site" };
export const dynamic = "force-dynamic";

export default async function DevSitePage() {
  await requireDeveloper();
  const [maint, ann, access] = await Promise.all([getMaintenanceSettings(), getAnnouncementSettings(), getAccessSettings()]);
  return (
    <div>
      <PageHeader title="Maintenance & site" sticker="zzz" description="Switch the site into maintenance, show a banner to everyone, or pause new sign-ups. Changes are live on the next page load." />
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
