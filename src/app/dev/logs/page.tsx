import { Search } from "lucide-react";
import { requireDeveloper } from "@/lib/auth";
import { ChipGroup, ChipLink, Input, PageHeader, buttonVariants } from "@/components/ui";
import { AUDIT_CATEGORIES, getAuditRows } from "@/app/admin/owner/data";
import { AuditList } from "@/app/admin/owner/audit-list";

export const metadata = { title: "Activity log" };
export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = { receipt: "Slips", order: "Orders", staff: "Staff & roles", settings: "Settings", student: "Student resets" };

export default async function DevLogsPage({ searchParams }: { searchParams: Promise<{ cat?: string; q?: string }> }) {
  await requireDeveloper();
  const { cat, q } = await searchParams;
  const category = AUDIT_CATEGORIES.find((c) => c === cat) ?? "";
  const search = (q ?? "").trim();
  const rows = await getAuditRows({ category, search, limit: 300 });
  const href = (c: string) => `/dev/logs?${new URLSearchParams({ ...(c ? { cat: c } : {}), ...(search ? { q: search } : {}) })}`;
  return (
    <div className="space-y-4">
      <PageHeader title="Activity log" sticker="detective" description="Everything staff and developers changed, slips, orders, roles, settings, newest first." />
      <ChipGroup>
        <ChipLink href={href("")} active={!category}>All</ChipLink>
        {AUDIT_CATEGORIES.map((c) => <ChipLink key={c} href={href(c)} active={category === c}>{LABEL[c]}</ChipLink>)}
      </ChipGroup>
      <form action="/dev/logs" className="flex gap-2">
        {category && <input type="hidden" name="cat" value={category} />}
        <Input name="q" type="search" enterKeyHint="search" defaultValue={search} placeholder="Search name, Student ID, summary, bank ref…" />
        <button className={buttonVariants({ size: "icon" })} aria-label="Search"><Search /></button>
      </form>
      <AuditList rows={rows} />
    </div>
  );
}
