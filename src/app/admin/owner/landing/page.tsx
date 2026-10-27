import { BarChart3 } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { getLandingStatsSettings } from "@/lib/settings";
import { Card, CardContent, CardHeader } from "@/components/ui";
import { LandingStatsForm } from "../owner-forms";

export const dynamic = "force-dynamic";

/** Owner Console → Landing page: the numbers on the public home page. */
export default async function OwnerLandingPage() {
  await requireOwner();
  const [t, cfg] = await Promise.all([getT("admin.owner"), getLandingStatsSettings()]);
  return (
    <Card className="max-w-2xl">
      <CardHeader icon={BarChart3} title={t("landing.title")} description={t("landing.subtitle")} />
      <CardContent><LandingStatsForm initial={cfg} /></CardContent>
    </Card>
  );
}
