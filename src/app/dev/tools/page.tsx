import { Download, FileSpreadsheet, RefreshCw } from "lucide-react";
import { requireDeveloper } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { Card, CardContent, CardHeader, ListRow, PageHeader, buttonVariants } from "@/components/ui";
import { ClearCacheButton } from "./tools-forms";
import { EXPORTS } from "../export/[kind]/exports";

export const metadata = { title: "Tools & exports" };

export default async function DevToolsPage() {
  const [, t] = await Promise.all([requireDeveloper(), getT("dev.tools")]);
  return (
    <div className="space-y-5">
      <PageHeader title={t("title")} sticker="bulb" description={t("description")} />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader icon={FileSpreadsheet} title={t("csvTitle")} description={t("csvDesc")} />
          <CardContent className="space-y-2">
            {Object.entries(EXPORTS).map(([k, e]) => (
              <ListRow key={k} icon={FileSpreadsheet} tone="success" title={e.title} subtitle={e.description}
                trailing={<a href={`/dev/export/${k}`} className={buttonVariants({ size: "sm", variant: "outline" })}><Download /> CSV</a>} />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader icon={RefreshCw} title={t("cacheTitle")} description={t("cacheDesc")} />
          <CardContent><ClearCacheButton /></CardContent>
        </Card>
      </div>
    </div>
  );
}
