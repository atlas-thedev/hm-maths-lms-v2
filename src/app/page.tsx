import { HomeNav } from "@/components/landing/home-nav";
import { HomeCenters, HomeChannels, HomeClasses, HomeCta, HomeGallery, HomeHero, HomeProcess, HomeStories, HomeTeacher, type HomeClass } from "@/components/landing/home-sections";
import { HomeFooter } from "@/components/landing/home-footer";
import { Faq } from "@/components/landing/faq";
import { getSession, isStaffRole } from "@/lib/auth";
import { getScheduleLabel, getT } from "@/i18n/server";
import { SITE } from "@/content/site";
import { publicImage } from "@/lib/public-image";
import type { ClassRow } from "@/lib/types";
import { getBrand, getBrandSettings, getCenters, getLandingStatsSettings, getSiteData } from "@/lib/settings";
import { getLatestPhotos } from "@/lib/gallery-data";
import { siteGraph } from "@/lib/seo-graph";
import { jsonLd } from "@/lib/seo";
import { mapPoint } from "@/lib/centers";

type Placeholder = { title: string; type: string; year: number; lines: string[] };

export default async function HomePage() {
  const [{ db, user, profile }, t, sched, tm, landingStats, brand, brandSettings, centers, SITEDATA] = await Promise.all([
    getSession(),
    getT("landing"),
    getScheduleLabel(),
    getT("common.meta"),
    getLandingStatsSettings(),
    getBrand(),
    getBrandSettings(),
    getCenters(),
    getSiteData(),
  ]);
  const galleryPhotos = await getLatestPhotos(db, 9);
  const { data } = await db.from("classes").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(10);
  const rows = (data ?? []) as ClassRow[];

  const placeholders = t.raw<Placeholder[]>("classes.placeholders") ?? [];
  const defaultLines = (type: string) => placeholders.find((p) => p.type === type)?.lines ?? [];
  const classes: HomeClass[] = rows.length
    ? rows.map((c) => {
        const own = (c.description ?? "").split(/\r?\n/).map((l) => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean).slice(0, 4);
        return {
          id: c.id, title: c.title, type: c.class_type, year: c.target_year, town: c.town, schedule: sched(c),
          fee: Number(c.fee), isFree: c.is_free, banner: c.banner_url, lines: own.length ? own : defaultLines(c.class_type),
          bannerClass: { banner_url: c.banner_url, class_type: c.class_type, title: c.title, banner_config: c.banner_config, town: c.town, target_year: c.target_year, start_time: c.start_time, duration_minutes: c.duration_minutes, schedule_days: c.schedule_days },
        };
      })
    : placeholders.map((p) => ({ id: null, title: p.title, type: p.type, year: p.year, town: null, schedule: null, fee: 0, isFree: false, banner: null, lines: p.lines }));

  const account = !user ? "guest" : isStaffRole(profile?.role) ? "admin" : "student";
  // Photos: drop files into /public/images to replace the YouTube profile picture.
  const teacherPhoto = brandSettings.teacherPhoto || publicImage(SITE.teacherImage);
  return (
    <div className="force-light theme-orange relative overflow-x-clip bg-landing-bg text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({ "@context": "https://schema.org", "@graph": siteGraph({ brand, centers, site: SITEDATA, description: tm("description"), faq: t.raw<{ q: string; a: string }[]>("faq.items") ?? [], classes: rows.slice(0, 8).map((c) => ({ id: c.id, title: c.title, description: c.description, fee: Number(c.fee), isFree: c.is_free })) }) }) }} />
      <HomeNav account={account} />
      <main>
        {/* Classes come right after the hero: they're what visitors come for. */}
        <HomeHero account={account} stats={landingStats} photo={teacherPhoto || brandSettings.heroPhoto || "/images/hasitha-hero.webp"} />
        <HomeClasses classes={classes} />
        <HomeProcess />
        <HomeTeacher photo={brandSettings.heroPhoto || teacherPhoto || SITEDATA.youtube.avatar} isReal={!!(brandSettings.heroPhoto || teacherPhoto)} />
        <HomeCenters points={centers.map((c) => ({ key: c.key, p: mapPoint(c) }))} />
        <HomeStories stories={SITEDATA.youtube.stories} />
        <HomeGallery photos={galleryPhotos} photo={brandSettings.groupPhoto || publicImage(SITE.galleryImage)} />
        <HomeChannels />
        <Faq />
        <HomeCta account={account} />
      </main>
      <HomeFooter />
    </div>
  );
}
