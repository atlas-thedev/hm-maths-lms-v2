import { requireDeveloper } from "@/lib/auth";
import { getThemeSettings } from "@/lib/settings";
import { PageHeader } from "@/components/ui";
import { ThemeEditor } from "./theme-editor";

export const metadata = { title: "Theme" };
export const dynamic = "force-dynamic";

export default async function DevThemePage() {
  await requireDeveloper();
  const theme = await getThemeSettings();
  return (
    <div>
      <PageHeader title="Theme & colours" sticker="artist"
        description="Pick a brand colour, every button, link, badge, chart, gradient and the logo follow it, in light and dark mode. Text colours are chosen automatically so they stay readable (a light colour gets dark button text)." />
      <ThemeEditor initial={theme} />
    </div>
  );
}
