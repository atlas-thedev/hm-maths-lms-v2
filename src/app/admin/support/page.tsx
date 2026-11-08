import { requireAdmin } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { SupportInbox } from "./support-inbox";

export async function generateMetadata() { return { title: (await getT("support"))("inbox") }; }
export default async function SupportPage() {
  const { user } = await requireAdmin();
  return <SupportInbox staffId={user.id} />;
}
