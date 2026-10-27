import { ArrowUpRight, Facebook, MapPin, Phone, Youtube, type LucideIcon } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { IconTile, PageHeader, cardVariants } from "@/components/ui";
import { WhatsAppIcon } from "@/components/brand-icons";
import { getCenters, getSiteData } from "@/lib/settings";
import { centerLabel } from "@/lib/centers";
import { contactAddress } from "@/lib/site-data";
import { getLocale, getT } from "@/i18n/server";
import { cn, whatsappLink } from "@/lib/utils";

export async function generateMetadata() {
  return { title: (await getT("portal.nav"))("contact") };
}

type Item = { href: string; label: string; value: string; icon: LucideIcon | typeof WaIcon; tone: string; external?: boolean };
const WaIcon = ({ className }: { className?: string }) => <WhatsAppIcon mono className={cn("text-white", className)} />;

export default async function ContactPage() {
  const SITE = await getSiteData();
  const locale = await getLocale();
  const centerNames = (await getCenters()).map((c) => centerLabel(c, locale));
  const { profile } = await requireUser();
  const [t, td] = await Promise.all([getT("portal.contact"), getT("portal.dashboard")]);
  const wa = whatsappLink(SITE.contact.whatsapp, td("support.waText", { id: profile.student_id ?? "" }));
  const items: Item[] = [
    ...(wa ? [{ href: wa, label: t("whatsapp"), value: SITE.contact.whatsapp, icon: WaIcon, tone: "bg-gradient-to-br from-whatsapp-light to-whatsapp text-white", external: true }] : []),
    { href: `tel:${SITE.contact.phone.replace(/\s/g, "")}`, label: t("call"), value: SITE.contact.phone, icon: Phone, tone: "bg-gradient-brand text-white" },
    ...(SITE.social.facebook ? [{ href: SITE.social.facebook, label: "Facebook", value: t("facebook"), icon: Facebook, tone: "bg-facebook text-white", external: true }] : []),
    ...(SITE.social.youtube ? [{ href: SITE.social.youtube, label: "YouTube", value: SITE.youtube.handle, icon: Youtube, tone: "bg-youtube text-white", external: true }] : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} icon={Phone} sticker="phone" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map(({ href, label, value, icon: Icon, tone, external }) => (
          <a key={label} href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className={cn(cardVariants({ variant: "interactive" }), "group flex items-center gap-4 p-4")}>
            <IconTile size="lg" className={cn("shadow-md", tone)}><Icon className="h-5 w-5" /></IconTile>
            <span className="min-w-0 flex-1">
              <span className="block font-display font-bold group-hover:text-primary">{label}</span>
              <span className="block truncate text-sm text-muted-foreground">{value}</span>
            </span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
          </a>
        ))}
      </div>
      <div className="flex items-start gap-3 rounded-2xl bg-muted/60 p-4 text-sm">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div><p className="font-semibold">{t("centers")}</p><p className="text-muted-foreground">{contactAddress(SITE, centerNames)}</p></div>
      </div>
      <p className="text-xs text-muted-foreground">{t("idTip", { id: profile.student_id ?? "—" })}</p>
    </div>
  );
}
