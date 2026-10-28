import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getT } from "@/i18n/server";
import { SITE } from "@/content/site";
import { publicImage } from "@/lib/public-image";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getT("auth.side");
  const img = publicImage(SITE.authImage);
  return (
    <div className="theme-orange grid grid-cols-1 min-h-dvh bg-mesh bg-background lg:grid-cols-[1.15fr_1fr]">
      <aside className="relative hidden m-3 overflow-hidden rounded-[32px] bg-gradient-dark shadow-lift lg:block">
        {img ? (
          <Image src={img} alt={t("imageAlt")} fill priority sizes="55vw" className="object-cover" />
        ) : (
          <>
            <div className="bg-dots absolute inset-0 opacity-20" />
            <div className="absolute -left-40 top-1/4 h-[520px] w-[520px] animate-blob rounded-full bg-brand-300/30 blur-3xl" />
            <span className="absolute -right-10 top-10 select-none font-display text-[26rem] font-black leading-none text-white/10">∫</span>
            <div className="absolute right-16 top-24 space-y-3 font-mono text-sm text-white/40">
              <p>d/dx (sin x) = cos x</p><p>∫ eˣ dx = eˣ + C</p><p>F = ma</p><p>v² = u² + 2as</p>
            </div>
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-teal-950/80 via-teal-900/20 to-transparent" />
        <Link href="/" className="absolute left-8 top-8 flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/20">
          <ArrowLeft className="h-4 w-4" /> {t("home")}
        </Link>
        <div className="absolute inset-x-10 bottom-12 max-w-xl">
          <LogoMark tone="tile" onDark className="mb-6 h-14 w-14" />
          <p className="font-display text-5xl font-extrabold leading-[1.1] text-white xl:text-6xl">
            {t("taglineBefore")} <span className="text-brand-200">{t("taglineHighlight")}</span> {t("taglineAfter")}
          </p>
          <p className="mt-4 text-white/95">{t("subtitle")}</p>
        </div>
      </aside>
      <main className="flex min-h-dvh flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <Link href="/" className="flex items-center gap-2 lg:invisible" aria-label={t("home")}><LogoMark tone="tile" className="h-9 w-9" /></Link>
          <LanguageSwitcher />
        </div>
        <div className="flex flex-1 items-start justify-center px-4 pb-10 sm:items-center">{children}</div>
      </main>
    </div>
  );
}
