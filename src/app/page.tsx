import { HomeNav } from "@/components/landing/home-nav";
import { HomeAbout, HomeCenters, HomeChannels, HomeCommunity, HomeCta, HomeGallery, HomeHero, HomeProcess, ScrollProgress, HomeStories, HomeTeacher } from "@/components/landing/home-sections";
import { HomeFooter } from "@/components/landing/home-footer";
import { MarqueeBand } from "@/components/landing/marquee-band";
import { SmoothScroll } from "@/components/landing/smooth-scroll";
import { ClassesCarousel, type CarouselClass } from "@/components/landing/classes-carousel";
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
  const classes: CarouselClass[] = rows.length
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
      <SmoothScroll />
      <ScrollProgress />
      <HomeNav account={account} />
      <main>
        <HomeHero account={account} stats={landingStats} photo={brandSettings.heroPhoto || null} />
        <MarqueeBand />
        <HomeAbout />
        <HomeProcess />
        <HomeTeacher photo={teacherPhoto ?? SITEDATA.youtube.avatar} isReal={!!teacherPhoto} />
        <HomeCenters points={centers.map((c) => ({ key: c.key, p: mapPoint(c) }))} />
        <ClassesCarousel classes={classes} />
        <HomeStories stories={SITEDATA.youtube.stories} lessons={SITEDATA.youtube.lessons} />
        <HomeGallery photos={galleryPhotos} photo={brandSettings.groupPhoto || publicImage(SITE.galleryImage)} />
        <HomeCommunity stats={landingStats} />
        <HomeChannels />
        <Faq />
        <HomeCta account={account} />
      </main>
      <HomeFooter />
    </div>
  );
}
