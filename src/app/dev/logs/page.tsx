import { Search } from "lucide-react";
import { requireDeveloper } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { ChipGroup, ChipLink, Input, PageHeader, buttonVariants } from "@/components/ui";
import { AUDIT_CATEGORIES, getAuditRows } from "@/app/admin/owner/data";
import { AuditList } from "@/app/admin/owner/audit-list";

export const metadata = { title: "Activity log" };
export const dynamic = "force-dynamic";

export default async function DevLogsPage({ searchParams }: { searchParams: Promise<{ cat?: string; q?: string }> }) {
  const [, t, { cat, q }] = await Promise.all([requireDeveloper(), getT("dev.logs"), searchParams]);
  const category = AUDIT_CATEGORIES.find((c) => c === cat) ?? "";
  const search = (q ?? "").trim();
  const rows = await getAuditRows({ category, search, limit: 300 });
  const href = (c: string) => `/dev/logs?${new URLSearchParams({ ...(c ? { cat: c } : {}), ...(search ? { q: search } : {}) })}`;
  return (
    <div className="space-y-4">
      <PageHeader title={t("title")} sticker="detective" description={t("description")} />
      <ChipGroup>
        <ChipLink href={href("")} active={!category}>{t("all")}</ChipLink>
        {AUDIT_CATEGORIES.map((c) => <ChipLink key={c} href={href(c)} active={category === c}>{t(`categories.${c}`)}</ChipLink>)}
      </ChipGroup>
      <form action="/dev/logs" className="flex gap-2">
        {category && <input type="hidden" name="cat" value={category} />}
        <Input name="q" type="search" enterKeyHint="search" defaultValue={search} placeholder={t("searchPlaceholder")} />
        <button className={buttonVariants({ size: "icon" })} aria-label={t("search")}><Search /></button>
      </form>
      <AuditList rows={rows} />
    </div>
  );
}
