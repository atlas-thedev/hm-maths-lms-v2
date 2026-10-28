import Link from "next/link";
import { Facebook, Phone, Youtube } from "lucide-react";
import { Logo } from "@/components/logo";
import { WhatsAppIcon } from "@/components/brand-icons";
import { getLocale, getT } from "@/i18n/server";
import { channelTitle, contactAddress } from "@/lib/site-data";
import { getCenters, getSiteData } from "@/lib/settings";
import { centerLabel } from "@/lib/centers";
import { whatsappLink } from "@/lib/utils";

export async function HomeFooter() {
  const SITE = await getSiteData();
  const t = await getT("landing");
  const locale = await getLocale();
  const centerNames = (await getCenters()).map((c) => centerLabel(c, locale));
  const wa = whatsappLink(SITE.contact.whatsapp, "Hi");
  const quick = [["/dashboard", t("nav.dashboard")], ["/store", t("nav.store")], ["/#classes", t("home.nav.classes")], ["/gallery", t("home.nav.gallery")], ["/#support", t("home.nav.support")]] as const;
  return (
    <footer className="container pb-8 pt-4">
      <div className="rounded-[2rem] border border-white/10 bg-ink p-8 text-white shadow-soft backdrop-blur">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div>
            <Logo tone="dark" />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-300">{t("footer.blurb")}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-400">{t("home.footer.quick")}</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">{quick.map(([h, l]) => <li key={h}><Link href={h} className="hover:text-brand-300">{l}</Link></li>)}</ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-400">{t("home.footer.telegram")}</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {SITE.channels.filter((c) => c.kind === "telegram").map((c) => <li key={c.key}><a href={c.url} target="_blank" rel="noopener noreferrer" className="hover:text-brand-300">{channelTitle(c, locale)}</a></li>)}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-400">{t("home.footer.contact")}</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li><a href={`tel:${SITE.contact.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 hover:text-brand-300"><Phone className="h-3.5 w-3.5" />{SITE.contact.phone}</a></li>
              {wa ? <li><a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-brand-300"><WhatsAppIcon className="h-3.5 w-3.5" />{SITE.contact.whatsapp}</a></li> : null}
              <li className="text-slate-400">{contactAddress(SITE, centerNames)}</li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-400">{t("home.footer.social")}</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li><a href={SITE.social.youtube} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-brand-300"><Youtube className="h-4 w-4 text-brand-400" />YouTube</a></li>
              {SITE.social.facebook ? <li><a href={SITE.social.facebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-brand-300"><Facebook className="h-4 w-4 text-brand-400" />Facebook</a></li> : null}
              {SITE.channels.filter((c) => c.kind === "whatsapp").slice(0, 1).map((c) => <li key={c.key}><a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-brand-300"><WhatsAppIcon className="h-4 w-4" />WhatsApp</a></li>)}
            </ul>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>{t("footer.rights", { year: new Date().getFullYear() })}</p>
          <p>{t("footer.notice")}</p>
        </div>
      </div>
    </footer>
  );
}
