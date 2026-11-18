import { requireDeveloper } from "@/lib/auth";
import { asService } from "@/lib/db/pg";
import { getCenters, getHeroPromoSettings } from "@/lib/settings";
import { getAllTimetable } from "@/lib/timetable";
import { PageHeader } from "@/components/ui";
import { HeroPromoForm, TimetableManagerForm } from "./timetable-forms";

export const metadata = { title: "Hero Promo & Timetable" };
export const dynamic = "force-dynamic";

export default async function DevTimetablePage() {
  await requireDeveloper();
  const [promo, entries, centers, classes] = await Promise.all([
    getHeroPromoSettings(),
    getAllTimetable(),
    getCenters(),
    asService(async (c) =>
      (await c.query("select id, title, target_year from public.classes where is_active = true order by target_year desc nulls last, title asc")).rows as {
        id: string;
        title: string;
        target_year: number | null;
      }[],
    ).catch(() => []),
  ]);

  const defaultYear = /^\d{4}$/.test(promo.year) ? Number(promo.year) : new Date().getFullYear() + 3;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hero Promo & Timetable"
        sticker="party"
        description="Edit the hero intake registration card (year, labels, link) and manage the full public timetable shown at /timetable."
      />
      <div className="max-w-5xl space-y-6">
        <HeroPromoForm initial={promo} />
        <TimetableManagerForm initial={entries} centers={centers} classes={classes} defaultYear={defaultYear} />
      </div>
    </div>
  );
}
