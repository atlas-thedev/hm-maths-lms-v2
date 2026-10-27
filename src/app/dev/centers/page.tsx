import { requireDeveloper } from "@/lib/auth";
import { asService } from "@/lib/db/pg";
import { getCenters } from "@/lib/settings";
import { PageHeader } from "@/components/ui";
import { CentersForm } from "./centers-form";

export const metadata = { title: "Centers" };
export const dynamic = "force-dynamic";

export default async function DevCentersPage() {
  await requireDeveloper();
  const centers = await getCenters();
  const rows = await asService(async (c) => (await c.query(
    `select coalesce(p.town, c.town) as town, coalesce(p.n, 0)::int as students, coalesce(c.n, 0)::int as classes
       from (select town, count(*) n from public.profiles where town is not null group by town) p
       full join (select town, count(*) n from public.classes where town is not null group by town) c on c.town = p.town`)).rows as { town: string; students: number; classes: number }[]);
  const usage = Object.fromEntries(rows.map((r) => [r.town, { students: r.students, classes: r.classes }]));
  return (
    <div>
      <PageHeader title="Centers" sticker="map" description="Where classes are held. These names appear when students register, in class forms, the store, leaderboards, the home page cards and map, and on Google. “Online” is always there." />
      <div className="max-w-3xl"><CentersForm initial={centers} usage={usage} /></div>
    </div>
  );
}
