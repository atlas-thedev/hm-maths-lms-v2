import { LogoMark } from "@/components/logo";
import { Sticker } from "@/components/sticker";
import { getFormat, getT } from "@/i18n/server";

/** Shown to visitors and students while maintenance mode is on (Developer panel → Maintenance). */
export async function MaintenanceScreen({ message, until }: { message: string; until: string }) {
  const [t, f] = await Promise.all([getT("common.maintenance"), getFormat()]);
  const when = until && !Number.isNaN(Date.parse(until)) ? f.dateTime(until) : null;
  return (
    <main className="grid min-h-dvh place-items-center bg-mesh bg-background px-5 py-10 text-center">
      <div className="w-full max-w-md">
        <LogoMark tone="tile" className="mx-auto mb-6 h-14 w-14" />
        <div className="mb-4 flex justify-center"><Sticker name="zzz" size={96} /></div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{t("title")}</h1>
        <p className="mt-3 whitespace-pre-line text-muted-foreground">{message || t("text")}</p>
        {when ? <p className="mt-4 inline-flex rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground">{t("back", { when })}</p> : null}
        <p className="mt-8 text-xs text-muted-foreground"><a href="/login" className="font-semibold text-primary hover:underline">{t("staff")}</a></p>
      </div>
    </main>
  );
}
