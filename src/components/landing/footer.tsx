import Link from "next/link";
import { Facebook, Instagram, Mail, MapPin, Music2, Phone, Youtube } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { getLocale, getT } from "@/i18n/server";
import { getBrand, getCenters, getSiteData } from "@/lib/settings";
import { centerLabel } from "@/lib/centers";
import { contactAddress } from "@/lib/site-data";
import { WhatsAppIcon } from "@/components/brand-icons";
import { whatsappLink } from "@/lib/utils";

export async function LandingFooter() {
  const SITE = await getSiteData();
  const brand = await getBrand();
  const locale = await getLocale();
  const centerNames = (await getCenters()).map((c) => centerLabel(c, locale));
  const t = await getT("landing");
  const socials = [
    { href: SITE.social.facebook, Icon: Facebook, label: "Facebook" },
    { href: SITE.social.youtube, Icon: Youtube, label: "YouTube" },
    { href: SITE.social.tiktok, Icon: Music2, label: "TikTok" },
    { href: SITE.social.instagram, Icon: Instagram, label: "Instagram" },
  ].filter((s) => s.href);
  const links = [["classes", "/#classes"], ["story", "/#story"], ["store", "/store"], ["support", "/#support"]] as const;
  return (
    <footer className="relative overflow-hidden bg-ink text-slate-300">
      <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-teal-500/20 blur-3xl" />
      <div className="container relative grid grid-cols-1 gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <LogoMark tone="tile" className="h-12 w-12" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">{t("footer.blurb")}</p>
        </div>
        <div>
          <h3 className="font-display text-sm font-semibold text-white">{t("footer.links")}</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {links.map(([k, href]) => <li key={k}><Link href={href} className="hover:text-brand-300">{t(`nav.${k}`)}</Link></li>)}
          </ul>
        </div>
        <div>
          <h3 className="font-display text-sm font-semibold text-white">{t("footer.contact")}</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />{contactAddress(SITE, centerNames)}</li>
            {SITE.contact.email ? <li className="flex gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" /><a href={`mailto:${SITE.contact.email}`} className="hover:text-white">{SITE.contact.email}</a></li> : null}
            <li className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" /><a href={`tel:${SITE.contact.phone.replace(/\s/g, "")}`} className="hover:text-white">{SITE.contact.phone}</a></li>
            {whatsappLink(SITE.contact.whatsapp, "Hi") ? (
              <li className="flex gap-2"><WhatsAppIcon className="mt-0.5 h-4 w-4" /><a href={whatsappLink(SITE.contact.whatsapp, "Hi")!} target="_blank" rel="noopener noreferrer" className="hover:text-white">WhatsApp</a></li>
            ) : null}
          </ul>
        </div>
        <div>
          <h3 className="font-display text-sm font-semibold text-white">{t("footer.follow")}</h3>
          <div className="mt-4 flex gap-2">
            {socials.map(({ href, Icon, label }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 transition hover:-translate-y-0.5 hover:border-brand-400 hover:bg-gradient-to-br hover:from-teal-500 hover:to-brand-500 hover:text-white">
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
      <div aria-hidden className="pointer-events-none container relative select-none overflow-hidden">
        <p className="bg-gradient-to-b from-white/[0.14] to-transparent bg-clip-text text-center font-display text-[18vw] font-black leading-[0.8] tracking-tighter text-transparent lg:text-[13rem]">{brand.name.toUpperCase()}</p>
      </div>
      <div className="relative border-t border-white/10">
        <div className="container flex flex-col gap-2 py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>{t("footer.rights", { year: new Date().getFullYear() })}</p>
          <p className="text-slate-500">{t("footer.notice")}</p>
        </div>
      </div>
    </footer>
  );
}
