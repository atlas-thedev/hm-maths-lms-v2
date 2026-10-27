import site from "@/content/site.json";
import { youtubeId } from "@/lib/youtube";

/* Contact details, social links, channels, bank accounts and featured YouTube videos.
   src/content/site.json holds the built-in values; Developer panel → Contact & links overrides them. */

export type ChannelKind = "telegram" | "whatsapp";
export interface Channel { key: string; kind: ChannelKind; titleEn: string; titleSi: string; handle: string; url: string; image: string }
export interface BankAccount { bank: string; branch: string; accountName: string; accountNumber: string }
export interface Video { id: string; title: string }
export interface SiteData {
  contact: { phone: string; whatsapp: string; email: string; address: string };
  social: { youtube: string; facebook: string; tiktok: string; instagram: string };
  youtube: { handle: string; subscribers: string; abResults: string; videos: string; avatar: string; stories: Video[]; lessons: Video[] };
  channels: Channel[];
  bankAccounts: BankAccount[];
}

const CHANNEL_TITLES: Record<string, [string, string]> = {
  "2027revision": ["2027 Revision + Paper", "2027 Revision + Paper"], "2027theory": ["2027 Theory", "2027 Theory"], "2028theory": ["2028 Theory", "2028 Theory"],
  wa2027: ["2027 Combined Maths", "2027 Combined Maths"], wa2028: ["2028 Combined Maths", "2028 Combined Maths"],
};

export const DEFAULT_SITE_DATA: SiteData = {
  contact: { ...site.contact },
  social: { youtube: site.social.youtube, facebook: site.social.facebook, tiktok: site.social.tiktok, instagram: site.social.instagram },
  youtube: { handle: site.youtube.handle, subscribers: site.youtube.subscribers, abResults: site.youtube.abResults, videos: site.youtube.videos, avatar: site.youtube.avatar, stories: site.youtube.stories, lessons: site.youtube.lessons },
  channels: site.channels.map((c) => ({ key: c.key, kind: c.kind as ChannelKind, titleEn: CHANNEL_TITLES[c.key]?.[0] ?? c.handle, titleSi: CHANNEL_TITLES[c.key]?.[1] ?? c.handle, handle: c.handle, url: c.url, image: c.image })),
  bankAccounts: site.bankAccounts.map((b) => ({ ...b })),
};

const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const https = (v: unknown) => { const u = s(v, 300); return /^https:\/\/[^\s<>"]+$/.test(u) ? u : ""; };
const img = (v: unknown) => { const u = s(v, 300); return /^(\/[\w./%-]+|https:\/\/[^\s<>"]+)$/.test(u) ? u : ""; };
const phone = (v: unknown) => { const p = s(v, 24); return /^[+\d][\d\s-]{6,22}$/.test(p) ? p : ""; };
const arr = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? (v as Record<string, unknown>[]).filter((x) => x && typeof x === "object") : []);

/** Validates stored overrides and fills the gaps with the built-in values. Bad rows are dropped, never trusted. */
export function normalizeSiteData(raw: unknown): SiteData {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, Record<string, unknown> | undefined>;
  const D = DEFAULT_SITE_DATA;
  const c = o.contact, so = o.social, yt = o.youtube as Record<string, unknown> | undefined;
  const email = s(c?.email, 80);
  const channels = Array.isArray(o.channels) ? arr(o.channels).flatMap((r, i) => {
    const url = https(r.url), kind = r.kind === "whatsapp" ? "whatsapp" : r.kind === "telegram" ? "telegram" : null;
    if (!url || !kind) return [];
    const titleEn = s(r.titleEn, 60) || s(r.handle, 60) || "Channel";
    return [{ key: s(r.key, 40).replace(/[^\w-]/g, "") || `ch${i + 1}`, kind: kind as ChannelKind, titleEn, titleSi: s(r.titleSi, 60) || titleEn, handle: s(r.handle, 60), url, image: img(r.image) }];
  }) : null;
  const bank = Array.isArray(o.bankAccounts) ? arr(o.bankAccounts).flatMap((r) => {
    const b = { bank: s(r.bank, 60), branch: s(r.branch, 60), accountName: s(r.accountName, 70), accountNumber: s(r.accountNumber, 32) };
    return b.bank && /^[\d\s-]{5,32}$/.test(b.accountNumber) ? [b] : [];
  }) : null;
  const videos = (v: unknown, fallback: Video[]) => (Array.isArray(v) ? arr(v).flatMap((r) => { const id = youtubeId(s(r.id, 200)); return id ? [{ id, title: s(r.title, 140) }] : []; }) : fallback);
  return {
    contact: { phone: phone(c?.phone) || D.contact.phone, whatsapp: phone(c?.whatsapp) || D.contact.whatsapp, email: c && "email" in c ? (/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ? email : "") : D.contact.email, address: c && "address" in c ? s(c.address, 160) : D.contact.address },
    social: {
      youtube: so && "youtube" in so ? https(so.youtube) : D.social.youtube, facebook: so && "facebook" in so ? https(so.facebook) : D.social.facebook,
      tiktok: so && "tiktok" in so ? https(so.tiktok) : D.social.tiktok, instagram: so && "instagram" in so ? https(so.instagram) : D.social.instagram,
    },
    youtube: {
      handle: s(yt?.handle, 60) || D.youtube.handle, subscribers: s(yt?.subscribers, 20) || D.youtube.subscribers, abResults: s(yt?.abResults, 20) || D.youtube.abResults, videos: s(yt?.videos, 20) || D.youtube.videos,
      avatar: img(yt?.avatar) || D.youtube.avatar, stories: videos(yt?.stories, D.youtube.stories), lessons: videos(yt?.lessons, D.youtube.lessons),
    },
    channels: channels ?? D.channels,
    bankAccounts: bank ?? D.bankAccounts,
  };
}

/** The address line: what was typed, or (when empty) the center names, so a new center appears here by itself. */
export const contactAddress = (site: SiteData, centerNames: string[]) => site.contact.address || centerNames.join(" · ");

export const channelTitle = (c: Channel, locale: string) => (locale === "si" ? c.titleSi : c.titleEn);
