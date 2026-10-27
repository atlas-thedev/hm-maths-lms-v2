import { Download, FileSpreadsheet, RefreshCw } from "lucide-react";
import { requireDeveloper } from "@/lib/auth";
import { Card, CardContent, CardHeader, ListRow, PageHeader, buttonVariants } from "@/components/ui";
import { ClearCacheButton } from "./tools-forms";
import { EXPORTS } from "../export/[kind]/exports";

export const metadata = { title: "Tools & exports" };

export default async function DevToolsPage() {
  await requireDeveloper();
  return (
    <div className="space-y-5">
      <PageHeader title="Tools & exports" sticker="bulb" description="Download data as CSV (opens in Excel / Google Sheets) and maintenance helpers." />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader icon={FileSpreadsheet} title="CSV exports" description="Every export is recorded in the activity log." />
          <CardContent className="space-y-2">
            {Object.entries(EXPORTS).map(([k, e]) => (
              <ListRow key={k} icon={FileSpreadsheet} tone="success" title={e.title} subtitle={e.description}
                trailing={<a href={`/dev/export/${k}`} className={buttonVariants({ size: "sm", variant: "outline" })}><Download /> CSV</a>} />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader icon={RefreshCw} title="Page cache" description="Pages are rebuilt automatically after changes. Clear the cache if something still looks out of date." />
          <CardContent><ClearCacheButton /></CardContent>
        </Card>
      </div>
    </div>
  );
}
