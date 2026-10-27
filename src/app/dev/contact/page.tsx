import { requireDeveloper } from "@/lib/auth";
import { getSiteData } from "@/lib/settings";
import { PageHeader } from "@/components/ui";
import { BankCard, ChannelsCard, ContactCard, SocialCard, VideosCard, YoutubeCard } from "./contact-forms";

export const metadata = { title: "Contact & links" };
export const dynamic = "force-dynamic";

export default async function DevContactPage() {
  await requireDeveloper();
  const d = await getSiteData();
  return (
    <div>
      <PageHeader title="Contact & links" sticker="phone" description="Phone numbers, social links, Telegram / WhatsApp channels, bank accounts and the featured YouTube videos. Each card saves on its own and is live on the next page load." />
      <div className="grid max-w-5xl grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="space-y-5"><ContactCard initial={d.contact} /><SocialCard initial={d.social} /><YoutubeCard initial={{ handle: d.youtube.handle, avatar: d.youtube.avatar }} /><BankCard initial={d.bankAccounts} /></div>
        <div className="space-y-5"><ChannelsCard initial={d.channels} /><VideosCard initial={{ stories: d.youtube.stories, lessons: d.youtube.lessons }} /></div>
      </div>
    </div>
  );
}
