import { requireDeveloper } from "@/lib/auth";
import { getTopResults } from "@/lib/settings";
import { PageHeader } from "@/components/ui";
import { ResultsForm } from "./results-form";

export const metadata = { title: "Results" };
export const dynamic = "force-dynamic";

export default async function DevResultsPage() {
  await requireDeveloper();
  const results = await getTopResults();
  return (
    <div className="space-y-5">
      <PageHeader
        title="Results"
        sticker="trophy"
        description="The public /results page: district top results as big cards, then every student result as a line with their grade (A / B / C …), year and district. Saved changes are live on the next page load."
      />
      <div className="max-w-5xl">
        <ResultsForm initial={results} />
      </div>
    </div>
  );
}
