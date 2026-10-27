import { Search } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { ChipGroup, ChipLink, Input, Select, buttonVariants } from "@/components/ui";
import { AUDIT_CATEGORIES, getAuditRows, getStaffRows } from "../data";
import { AuditList } from "../audit-list";

export const dynamic = "force-dynamic";

/** Owner Console → Activity log: every slip approval, cash grant, order review, role change and setting change. */
export default async function OwnerActivityPage({ searchParams }: { searchParams: Promise<{ cat?: string; actor?: string; q?: string }> }) {
  await requireOwner();
  const { cat, actor, q } = await searchParams;
  const category = AUDIT_CATEGORIES.find((c) => c === cat) ?? "";
  const search = (q ?? "").trim();
  const actorId = (actor ?? "").trim();
  const [t, staff, rows] = await Promise.all([getT("admin.owner"), getStaffRows(), getAuditRows({ category, actor: actorId, search })]);
  const href = (c: string) => `/admin/owner/activity?${new URLSearchParams({ ...(c ? { cat: c } : {}), ...(actorId ? { actor: actorId } : {}), ...(search ? { q: search } : {}) })}`;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("audit.subtitle")}</p>
      <ChipGroup>
        <ChipLink href={href("")} active={!category}>{t("audit.filterAll")}</ChipLink>
        {AUDIT_CATEGORIES.map((c) => <ChipLink key={c} href={href(c)} active={category === c}>{t(`audit.categories.${c}`)}</ChipLink>)}
      </ChipGroup>
      <form action="/admin/owner/activity" className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_220px_auto]">
        {category && <input type="hidden" name="cat" value={category} />}
        <Input name="q" type="search" enterKeyHint="search" defaultValue={search} placeholder={t("audit.searchPlaceholder")} />
        <Select name="actor" defaultValue={actorId}>
          <option value="">{t("audit.allStaff")}</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </Select>
        <button className={buttonVariants()}><Search /> {t("audit.filterBtn")}</button>
      </form>
      <AuditList rows={rows} />
    </div>
  );
}
