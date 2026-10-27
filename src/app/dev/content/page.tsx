import Link from "next/link";
import { Search } from "lucide-react";
import { requireDeveloper } from "@/lib/auth";
import { getSiteText } from "@/lib/settings";
import { allTextEntries, EDITABLE_NS } from "@/lib/site-text";
import { Badge, buttonVariants, Card, CardContent, EmptyState, Input, PageHeader } from "@/components/ui";
import { cn } from "@/lib/utils";
import { TextRows } from "./text-rows";

export const metadata = { title: "Site text" };
export const dynamic = "force-dynamic";

const PAGE = 25;
const NS_LABEL: Record<string, string> = { landing: "Home page & public", common: "Menus & shared", auth: "Login & register", portal: "Student area" };

export default async function DevContentPage({ searchParams }: { searchParams: Promise<{ lang?: string; ns?: string; sec?: string; q?: string; page?: string }> }) {
  await requireDeveloper();
  const sp = await searchParams;
  const lang = sp.lang === "si" ? "si" : "en";
  const ns = (EDITABLE_NS as readonly string[]).includes(sp.ns ?? "") ? sp.ns! : "landing";
  const q = (sp.q ?? "").trim().toLowerCase().slice(0, 80);
  const [text, all] = await Promise.all([getSiteText(), Promise.resolve(allTextEntries(lang))]);
  const over = text[lang];

  const inNs = all.filter((e) => e.path.startsWith(`${ns}.`));
  const sections = [...new Set(inNs.map((e) => e.path.split(".").slice(0, ns === "landing" ? 3 : 2).join(".")))];
  const sec = sections.includes(sp.sec ?? "") ? sp.sec! : "";
  const list = inNs.filter((e) => (!sec || e.path === sec || e.path.startsWith(`${sec}.`)) && (!q || e.path.toLowerCase().includes(q) || e.def.toLowerCase().includes(q) || (over[e.path] ?? "").toLowerCase().includes(q)));
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const page = Math.min(pages, Math.max(1, Number(sp.page) || 1));
  const rows = list.slice((page - 1) * PAGE, page * PAGE).map((e) => ({ path: e.path, def: e.def, value: over[e.path] ?? e.def }));
  const changedCount = Object.keys(over).length;
  const href = (p: Partial<Record<"lang" | "ns" | "sec" | "q" | "page", string>>) => {
    const n = new URLSearchParams({ lang, ns, ...(sec ? { sec } : {}), ...(q ? { q } : {}), ...p });
    for (const [k, v] of [...n]) if (!v) n.delete(k);
    return `/dev/content?${n}`;
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Site text" sticker="write" description="Change any sentence, button or heading on the site, in English or Sinhala. Keep {words in curly brackets}: the site fills them in. Changes are live on the next page load.">
        <Badge variant={changedCount ? "default" : "secondary"}>{changedCount} changed ({lang === "en" ? "English" : "සිංහල"})</Badge>
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        {(["en", "si"] as const).map((l) => <Link key={l} href={href({ lang: l, page: "" , sec: "" })} className={buttonVariants({ size: "sm", variant: lang === l ? "default" : "outline" })}>{l === "en" ? "English" : "සිංහල"}</Link>)}
        <span className="mx-1 hidden w-px bg-border sm:block" />
        {EDITABLE_NS.map((n) => <Link key={n} href={href({ ns: n, sec: "", page: "" })} className={buttonVariants({ size: "sm", variant: ns === n ? "default" : "outline" })}>{NS_LABEL[n]}</Link>)}
      </div>

      <form action="/dev/content" className="flex gap-2">
        <input type="hidden" name="lang" value={lang} /><input type="hidden" name="ns" value={ns} />
        <Input name="q" defaultValue={sp.q ?? ""} placeholder="Search the text, e.g. “free seminar” or “register”…" className="max-w-xl" aria-label="Search" />
        <button className={buttonVariants()}><Search /> Search</button>
      </form>

      {sections.length > 1 && (
        <nav aria-label="Sections" className="flex flex-wrap gap-1.5">
          <Link href={href({ sec: "", page: "" })} className={cn("rounded-full border px-3 py-1 text-xs font-semibold", !sec ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent")}>All</Link>
          {sections.map((s) => <Link key={s} href={href({ sec: s, page: "" })} className={cn("rounded-full border px-3 py-1 text-xs font-semibold", sec === s ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent")}>{s.split(".").slice(1).join(" › ")}</Link>)}
        </nav>
      )}

      {rows.length === 0 ? <EmptyState icon={Search} title="Nothing matches" description="Try a different word or section." /> : (
        <>
          <p className="text-sm text-muted-foreground">{list.length} text{list.length === 1 ? "" : "s"} · page {page} of {pages}</p>
          <TextRows key={`${lang}-${ns}-${sec}-${q}-${page}-${changedCount}`} lang={lang} rows={rows} />
          {pages > 1 && (
            <Card><CardContent className="flex flex-wrap items-center justify-between gap-2 py-3">
              <Link href={href({ page: String(page - 1) })} aria-disabled={page <= 1} className={cn(buttonVariants({ variant: "outline", size: "sm" }), page <= 1 && "pointer-events-none opacity-40")}>← Previous</Link>
              <span className="text-sm text-muted-foreground">Page {page} / {pages}</span>
              <Link href={href({ page: String(page + 1) })} aria-disabled={page >= pages} className={cn(buttonVariants({ variant: "outline", size: "sm" }), page >= pages && "pointer-events-none opacity-40")}>Next →</Link>
            </CardContent></Card>
          )}
        </>
      )}
    </div>
  );
}
