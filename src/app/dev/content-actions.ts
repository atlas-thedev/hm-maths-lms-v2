"use server";

import { revalidatePath } from "next/cache";
import { requireDeveloper } from "@/lib/auth";
import { asService } from "@/lib/db/pg";
import { KEY_RE, normalizeCenters, ONLINE_KEY, type Center } from "@/lib/centers";
import { defaultFor, EDITABLE_NS, missingVars } from "@/lib/site-text";
import {
  getBrandSettings, getCenters, getFaqs, getSiteData, getSiteText, recordAuditLog, saveBrandSettings, saveCenters, saveFaqs, saveSiteData, saveSiteText, type FaqItem, type SiteText,
} from "@/lib/settings";
import { youtubeId } from "@/lib/youtube";
import type { Locale } from "@/i18n/config";
import type { ActionState } from "@/lib/types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const on = (fd: FormData, k: string) => ["on", "true", "1"].includes(String(fd.get(k) ?? ""));
const refreshAll = () => revalidatePath("/", "layout");

async function log(summary: string, details: Record<string, unknown> = {}) {
  const { user, profile } = await requireDeveloper();
  await recordAuditLog({ actorId: user.id, actorName: profile.full_name, actorRole: profile.role, category: "settings", action: "settings_changed", summary, details });
}
const imageOk = (u: string) => !u || /^\/api\/storage\/public\/[\w-]+\/[\w./%-]+$/.test(u) || /^https:\/\/\S+$/.test(u);

// ─── Brand: name, teacher, logo, landing photos, search-console tokens ───
export async function saveBrandAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireDeveloper();
  const prev = await getBrandSettings();
  const name = str(fd, "name"), owner = str(fd, "owner");
  if (name.length < 2 || name.length > 40) return { error: "The site name needs 2–40 characters." };
  if (owner.length < 2 || owner.length > 60) return { error: "The teacher's name needs 2–60 characters." };
  const pick = (field: "logoUrl" | "logoDarkUrl" | "groupPhoto" | "teacherPhoto" | "heroPhoto") => (on(fd, `clear_${field}`) ? "" : str(fd, field) || prev[field]);
  const next = {
    name, owner, logoUrl: pick("logoUrl"), logoDarkUrl: pick("logoDarkUrl"), logoOnTile: on(fd, "logoOnTile"),
    groupPhoto: pick("groupPhoto"), teacherPhoto: pick("teacherPhoto"), heroPhoto: pick("heroPhoto"),
    googleVerification: str(fd, "googleVerification").replace(/[^\w-]/g, ""), bingVerification: str(fd, "bingVerification").replace(/[^\w-]/g, ""),
  };
  for (const f of ["logoUrl", "logoDarkUrl", "groupPhoto", "teacherPhoto", "heroPhoto"] as const) if (!imageOk(next[f])) return { error: `That ${f} address isn't valid.` };
  await saveBrandSettings(next, user.id);
  await log(`Brand → “${next.name}” · ${next.owner}`, { name: next.name, owner: next.owner, logo: !!next.logoUrl, logoDark: !!next.logoDarkUrl, groupPhoto: !!next.groupPhoto, teacherPhoto: !!next.teacherPhoto, heroPhoto: !!next.heroPhoto });
  refreshAll();
  return { ok: true, message: "Saved. Every page now uses the new name and pictures." };
}

// ─── Search engines: titles, descriptions and keywords (kept as site-text overrides of common.meta.*) ───
export async function saveSeoAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireDeveloper();
  const text = await getSiteText();
  const next: SiteText = { en: { ...text.en }, si: { ...text.si } };
  for (const l of ["en", "si"] as const) {
    for (const [field, path, max] of [["title", "common.meta.title", 90], ["description", "common.meta.description", 320], ["keywords", "common.meta.keywords", 1200]] as const) {
      const v = str(fd, `${field}_${l}`).slice(0, max);
      if (!v || v === defaultFor(l, path)) delete next[l][path]; else next[l][path] = v;
    }
  }
  await saveSiteText(next, user.id);
  await log("Search-engine title / description / keywords updated");
  refreshAll();
  return { ok: true, message: "Saved. Google picks it up the next time it visits the site." };
}

// ─── Centers ───
export async function saveCentersAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireDeveloper();
  let raw: unknown;
  try { raw = JSON.parse(str(fd, "centers")); } catch { return { error: "Could not read the list. Reload the page and try again." }; }
  if (!Array.isArray(raw)) return { error: "Could not read the list." };
  for (const r of raw as Partial<Center>[]) {
    if (!r?.key || !KEY_RE.test(String(r.key).trim())) return { error: `“${r?.key ?? ""}” isn't a valid center ID: use 2–40 letters (and spaces, dots or dashes), starting with a letter.` };
    if (String(r.key).trim().toLowerCase() === ONLINE_KEY.toLowerCase()) return { error: "“Online” is built in, so it can't be added as a center." };
  }
  const centers = normalizeCenters(raw);
  const keys = (raw as Center[]).map((r) => String(r.key).trim().toLowerCase());
  if (new Set(keys).size !== keys.length) return { error: "Two centers have the same ID." };

  // A center that students or classes still use can't be deleted (they would keep a name that no longer exists).
  const old = await getCenters();
  const removed = old.filter((c) => !centers.some((n) => n.key === c.key)).map((c) => c.key);
  if (removed.length) {
    const used = await asService(async (c) => (await c.query(
      `select t.town, (select count(*) from public.profiles where town = t.town)::int as students, (select count(*) from public.classes where town = t.town)::int as classes
         from unnest($1::text[]) as t(town)`, [removed])).rows as { town: string; students: number; classes: number }[]);
    const blocked = used.filter((u) => u.students || u.classes);
    if (blocked.length) return { error: `Can't remove ${blocked.map((u) => `${u.town} (${u.students} students, ${u.classes} classes)`).join(", ")}: move them to another center first, or just clear its map position to hide it from the map.` };
  }
  await saveCenters(centers, user.id);
  await log(`Centers → ${centers.map((c) => c.key).join(", ")}`, { centers: centers.map((c) => c.key) });
  refreshAll();
  return { ok: true, message: `Saved ${centers.length} centers. They show in the forms, the store, the leaderboards and the home page.` };
}

// ─── Site text (any sentence on the site) ───
export async function saveSiteTextAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireDeveloper();
  const lang = str(fd, "lang") as Locale;
  if (lang !== "en" && lang !== "si") return { error: "Pick a language." };
  const text = await getSiteText();
  const next: SiteText = { en: { ...text.en }, si: { ...text.si } };
  let changed = 0;
  const problems: string[] = [];
  for (const [k, v] of fd.entries()) {
    if (!k.startsWith("t:")) continue;
    const path = k.slice(2);
    if (!EDITABLE_NS.some((ns) => path.startsWith(`${ns}.`))) continue;
    const def = defaultFor(lang, path);
    if (def === undefined) continue;
    const value = String(v).replace(/\r\n/g, "\n").trim();
    if (!value || value === def) { if (path in next[lang]) { delete next[lang][path]; changed++; } continue; }
    if (value.length > 3000) { problems.push(`${path}: too long`); continue; }
    const missing = missingVars(def, value);
    if (missing.length) { problems.push(`${path}: keep ${missing.map((m) => `{${m}}`).join(", ")}`); continue; }
    if (next[lang][path] !== value) { next[lang][path] = value; changed++; }
  }
  if (problems.length) return { error: `Not saved: ${problems.slice(0, 4).join(" · ")}` };
  if (!changed) return { ok: true, message: "Nothing changed." };
  await saveSiteText(next, user.id);
  await log(`Site text (${lang}): ${changed} change(s)`, { lang, changed });
  refreshAll();
  return { ok: true, message: `Saved ${changed} change${changed === 1 ? "" : "s"}. Live on the next page load.` };
}

// ─── Contact, social links, channels, bank accounts, featured videos ───
const URL_OK = (u: string) => !u || /^https:\/\/[^\s<>"]+$/.test(u);

export async function saveSiteDataAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireDeveloper();
  const section = str(fd, "section");
  let data: Record<string, unknown> | Record<string, unknown>[];
  try { data = JSON.parse(str(fd, "data")); } catch { return { error: "Could not read the form. Reload the page and try again." }; }
  const cur = await getSiteData();
  const next = structuredClone(cur);
  const text = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const phoneRe = /^[+\d][\d\s-]{6,22}$/;

  if (section === "contact") {
    const d = data as Record<string, unknown>;
    if (!phoneRe.test(text(d.phone, 24))) return { error: "The phone number looks wrong. Use digits, like 077 265 4198." };
    if (!phoneRe.test(text(d.whatsapp, 24))) return { error: "The WhatsApp number looks wrong. Use digits, like 070 339 9339." };
    if (text(d.email, 80) && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(text(d.email, 80))) return { error: "The e-mail address looks wrong." };
    next.contact = { phone: text(d.phone, 24), whatsapp: text(d.whatsapp, 24), email: text(d.email, 80), address: text(d.address, 160) };
  } else if (section === "social") {
    const d = data as Record<string, unknown>;
    for (const k of ["youtube", "facebook", "tiktok", "instagram"] as const) if (!URL_OK(text(d[k], 300))) return { error: `${k[0].toUpperCase()}${k.slice(1)}: the link must start with https://` };
    next.social = { youtube: text(d.youtube, 300), facebook: text(d.facebook, 300), tiktok: text(d.tiktok, 300), instagram: text(d.instagram, 300) };
  } else if (section === "youtube") {
    const d = data as Record<string, unknown>;
    if (text(d.handle, 60).length < 2) return { error: "Enter the channel name, like @HasithaCmaths." };
    next.youtube = { ...next.youtube, handle: text(d.handle, 60), avatar: text(d.avatar, 300) || next.youtube.avatar };
  } else if (section === "videos") {
    const d = data as { stories?: Record<string, unknown>[]; lessons?: Record<string, unknown>[] };
    for (const list of ["stories", "lessons"] as const) {
      const rows = (d[list] ?? []).filter((r) => text(r.id) || text(r.title));
      for (const r of rows) if (!youtubeId(text(r.id))) return { error: `“${text(r.title) || text(r.id)}”: paste a YouTube video link (or its 11-letter ID).` };
      next.youtube[list] = rows.map((r) => ({ id: youtubeId(text(r.id))!, title: text(r.title, 140) }));
    }
  } else if (section === "channels") {
    const rows = data as Record<string, unknown>[];
    const seen = new Set<string>();
    const out = [] as typeof next.channels;
    for (const [i, r] of rows.entries()) {
      const url = text(r.url, 300), kind = r.kind === "whatsapp" ? "whatsapp" : r.kind === "telegram" ? "telegram" : "";
      if (!kind) return { error: `Channel ${i + 1}: choose Telegram or WhatsApp.` };
      if (!/^https:\/\/\S+$/.test(url)) return { error: `Channel ${i + 1}: the link must start with https://` };
      const titleEn = text(r.titleEn, 60);
      if (!titleEn) return { error: `Channel ${i + 1}: give it a name.` };
      let key = text(r.key, 40).replace(/[^\w-]/g, "") || `ch${Date.now().toString(36)}${i}`;
      while (seen.has(key)) key += "x";
      seen.add(key);
      out.push({ key, kind, titleEn, titleSi: text(r.titleSi, 60) || titleEn, handle: text(r.handle, 60), url, image: text(r.image, 300) });
    }
    next.channels = out;
  } else if (section === "bank") {
    const rows = data as Record<string, unknown>[];
    const out = [] as typeof next.bankAccounts;
    for (const [i, r] of rows.entries()) {
      const b = { bank: text(r.bank, 60), branch: text(r.branch, 60), accountName: text(r.accountName, 70), accountNumber: text(r.accountNumber, 32) };
      if (!b.bank) return { error: `Account ${i + 1}: enter the bank's name.` };
      if (!/^[\d\s-]{5,32}$/.test(b.accountNumber)) return { error: `Account ${i + 1}: the account number should be digits only.` };
      out.push(b);
    }
    next.bankAccounts = out;
  } else return { error: "Unknown section." };

  await saveSiteData(next, user.id);
  await log(`Contact & links → ${section}`, { section });
  refreshAll();
  revalidatePath("/sitemap.xml");
  const zeros = section === "bank" && next.bankAccounts.some((b) => /^[0\s-]+$/.test(b.accountNumber));
  return { ok: true, message: zeros ? "Saved, but an account number is all zeros. Students would pay into nothing, so please enter the real one." : "Saved. Live on the next page load." };
}

// ─── Frequently Asked Questions (FAQ) ───
export async function saveFaqsAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const { user } = await requireDeveloper();
  let raw: unknown;
  try {
    raw = JSON.parse(str(fd, "faqs"));
  } catch {
    return { error: "Could not read the FAQ list. Reload the page and try again." };
  }
  if (!Array.isArray(raw)) return { error: "Invalid FAQ list format." };

  const text = (v: unknown, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const out: FaqItem[] = [];

  for (const [i, item] of (raw as Record<string, unknown>[]).entries()) {
    const qEn = text(item.qEn, 300);
    const aEn = text(item.aEn, 3000);
    const qSi = text(item.qSi, 300);
    const aSi = text(item.aSi, 3000);

    if (!qEn && !qSi) return { error: `FAQ #${i + 1}: please provide a question in English or Sinhala.` };
    if (!aEn && !aSi) return { error: `FAQ #${i + 1}: please provide an answer.` };

    const id = text(item.id, 50) || `faq-${Date.now().toString(36)}${i}`;
    out.push({ id, qEn, aEn, qSi, aSi });
  }

  await saveFaqs(out, user.id);
  await log(`FAQ updated → ${out.length} questions`, { count: out.length });
  refreshAll();
  revalidatePath("/dashboard/faq");
  revalidatePath("/");
  return { ok: true, message: `Saved ${out.length} FAQ questions. Live across the home page and student portal.` };
}
