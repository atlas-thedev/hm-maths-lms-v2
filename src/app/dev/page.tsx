import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Activity, Database, GitCommit, HardDrive, HelpCircle, MapPin, Megaphone, Palette, Phone, Power, Server, ShieldCheck, Tag, Type, Users, UserRoundCheck, Wrench } from "lucide-react";
import { requireDeveloper } from "@/lib/auth";
import { asService } from "@/lib/db/pg";
import { getAccessSettings, getAnnouncementSettings, getMaintenanceSettings, getThemeSettings } from "@/lib/settings";
import { ActionCard, Badge, Card, CardContent, CardHeader, HeroCard, HeroChip, ListRow, StatCard } from "@/components/ui";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";

async function gitVersion(): Promise<{ commit: string; branch: string }> {
  try {
    const head = (await fs.readFile(path.join(process.cwd(), ".git/HEAD"), "utf8")).trim();
    if (!head.startsWith("ref:")) return { commit: head.slice(0, 7), branch: "detached" };
    const ref = head.slice(5).trim();
    const commit = (await fs.readFile(path.join(process.cwd(), ".git", ref), "utf8").catch(async () => {
      const packed = await fs.readFile(path.join(process.cwd(), ".git/packed-refs"), "utf8");
      return packed.split("\n").find((l) => l.endsWith(ref))?.split(" ")[0] ?? "";
    })).trim();
    return { commit: commit.slice(0, 7), branch: ref.replace("refs/heads/", "") };
  } catch { return { commit: "unknown", branch: "unknown" }; }
}

async function dirSize(dir: string): Promise<{ bytes: number; files: number }> {
  let bytes = 0, files = 0;
  const walk = async (d: string) => {
    for (const e of await fs.readdir(d, { withFileTypes: true }).catch(() => [])) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else { files++; bytes += (await fs.stat(p).catch(() => ({ size: 0 }))).size; }
    }
  };
  await walk(dir);
  return { bytes, files };
}

async function latestBackup(): Promise<{ name: string; at: Date; bytes: number } | null> {
  const dir = path.join(path.dirname(process.env.STORAGE_DIR || "/srv/hm-maths/storage"), "backups");
  const names = (await fs.readdir(dir).catch(() => [] as string[])).filter((n) => n.endsWith(".gz") || n.endsWith(".sql"));
  if (!names.length) return null;
  const stats = await Promise.all(names.map(async (n) => ({ n, s: await fs.stat(path.join(dir, n)) })));
  const top = stats.sort((a, b) => b.s.mtimeMs - a.s.mtimeMs)[0];
  return { name: top.n, at: top.s.mtime, bytes: top.s.size };
}

async function postgrestOk(): Promise<boolean> {
  try {
    const r = await fetch(process.env.POSTGREST_URL || "http://127.0.0.1:3001", { signal: AbortSignal.timeout(2500), cache: "no-store" });
    return r.status < 500;
  } catch { return false; }
}

const mb = (b: number) => (b > 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(1)} GB` : `${(b / 1024 ** 2).toFixed(1)} MB`);
const ago = (d: Date) => { const h = Math.round((Date.now() - d.getTime()) / 36e5); return h < 1 ? "just now" : h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`; };
const fmtUptime = (s: number) => (s > 86400 ? `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h` : `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`);

export default async function DevOverviewPage() {
  const [{ profile }, t, tn] = await Promise.all([requireDeveloper(), getT("dev.overview"), getT("dev.nav")]);
  const started = Date.now();
  const [git, db, rest, storage, backup, theme, maint, ann, access] = await Promise.all([
    gitVersion(),
    asService(async (c) => {
      const r = await c.query(`select
          (select count(*) from public.profiles where role = 'student')::int as students,
          (select count(*) from public.profiles where role in ('admin','owner','developer','superadmin'))::int as staff,
          (select count(*) from auth.sessions where revoked_at is null and last_seen_at > now() - interval '24 hours')::int as active24,
          (select count(*) from auth.sessions where revoked_at is null and last_seen_at > now() - interval '20 minutes')::int as online,
          (select count(*) from public.enrollments where status = 'pending')::int as pending,
          (select count(*) from public.classes where is_active)::int as classes,
          pg_size_pretty(pg_database_size(current_database())) as db_size,
          split_part(version(), ' ', 2) as pg_version`);
      return r.rows[0] as Record<string, number | string>;
    }).catch(() => null),
    postgrestOk(),
    dirSize(process.env.STORAGE_DIR || "/srv/hm-maths/storage"),
    latestBackup(),
    getThemeSettings(), getMaintenanceSettings(), getAnnouncementSettings(), getAccessSettings(),
  ]);
  const ms = Date.now() - started;
  const mem = process.memoryUsage().rss;
  const load = os.loadavg()[0];
  const cpus = os.cpus().length;

  const checks = [
    { label: t("website"), ok: true, detail: t("websiteDetail", { node: process.version, uptime: fmtUptime(process.uptime()) }) },
    { label: t("database"), ok: !!db, detail: db ? t("databaseDetail", { ver: db.pg_version, size: db.db_size }) : t("notReachable") },
    { label: t("dbApi"), ok: rest, detail: rest ? t("responding") : t("notResponding") },
    { label: t("fileStorage"), ok: true, detail: t("filesDetail", { files: storage.files, size: mb(storage.bytes) }) },
    { label: t("latestBackup"), ok: !!backup && Date.now() - backup.at.getTime() < 2 * 864e5, detail: backup ? `${backup.name} · ${ago(backup.at)} · ${mb(backup.bytes)}` : t("noBackups") },
    { label: t("server"), ok: load < cpus * 1.5, detail: t("serverDetail", { load: load.toFixed(2), cpus, mem: mb(mem), free: mb(os.freemem()), total: mb(os.totalmem()) }) },
  ];

  return (
    <div className="space-y-5">
      <HeroCard tone="dark" symbol="{ }">
        <p className="text-sm text-white/90">{t("panelLabel")}</p>
        <h1 className="mt-1 font-display text-[1.6rem] font-extrabold leading-tight sm:text-3xl">{t("hi", { name: profile.full_name.split(" ")[0] })}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <HeroChip><GitCommit className="h-3.5 w-3.5" /> {git.branch} · {git.commit}</HeroChip>
          <HeroChip><Activity className="h-3.5 w-3.5" /> {t("checksTook", { ms })}</HeroChip>
          <HeroChip>{checks.every((c) => c.ok) ? t("allOk") : t("needAttention", { count: checks.filter((c) => !c.ok).length })}</HeroChip>
        </div>
      </HeroCard>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("students")} value={db?.students ?? "—"} icon={Users} tone="info" />
        <StatCard label={t("onlineNow")} value={db?.online ?? "—"} hint={t("active24", { count: db?.active24 ?? "—" })} icon={UserRoundCheck} tone="success" />
        <StatCard label={t("slipsWaiting")} value={db?.pending ?? "—"} icon={ShieldCheck} tone="warning" />
        <StatCard label={t("activeClasses")} value={db?.classes ?? "—"} hint={t("staffAccounts", { count: db?.staff ?? "—" })} icon={Database} tone="highlight" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader icon={Server} title={t("systemHealth")} description={t("systemHealthDesc")} />
          <CardContent className="space-y-2">
            {checks.map((c) => (
              <ListRow key={c.label} icon={c.ok ? ShieldCheck : Power} tone={c.ok ? "success" : "danger"} title={c.label} subtitle={c.detail}
                trailing={<Badge variant={c.ok ? "success" : "destructive"}>{c.ok ? t("ok") : t("check")}</Badge>} />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader icon={Wrench} title={t("siteSwitches")} description={t("siteSwitchesDesc")} />
          <CardContent className="space-y-2">
            <ListRow href="/dev/site" icon={Power} tone={maint.enabled ? "danger" : "neutral"} title={t("maintenanceMode")} subtitle={maint.enabled ? t("maintenanceOnSub") : t("off")} chevron
              trailing={<Badge variant={maint.enabled ? "destructive" : "secondary"}>{maint.enabled ? t("on") : t("off")}</Badge>} />
            <ListRow href="/dev/site" icon={Megaphone} tone={ann.enabled ? "info" : "neutral"} title={t("announcementBanner")} subtitle={ann.enabled ? ann.text : t("hidden")} chevron
              trailing={<Badge variant={ann.enabled ? "info" : "secondary"}>{ann.enabled ? t("live") : t("off")}</Badge>} />
            <ListRow href="/dev/site" icon={Users} tone={access.registrationOpen ? "success" : "warning"} title={t("studentSignups")} subtitle={access.registrationOpen ? t("open") : t("closed")} chevron
              trailing={<Badge variant={access.registrationOpen ? "success" : "warning"}>{access.registrationOpen ? t("open") : t("closed")}</Badge>} />
            <ListRow href="/dev/theme" leading={<span className="h-10 w-10 shrink-0 rounded-xl ring-1 ring-black/10" style={{ background: theme.brand }} />}
              title={t("theme")} subtitle={`${theme.brand} · ${theme.buttons} · ${theme.defaultMode}${theme.allowToggle ? "" : " (locked)"}`} chevron />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ActionCard href="/dev/theme" title={tn("theme")} description={t("themeDesc")} icon={Palette} />
        <ActionCard href="/dev/site" title={tn("site")} description={t("siteDesc")} icon={Power} tone="danger" />
        <ActionCard href="/dev/users" title={tn("users")} description={t("usersDesc")} icon={Users} tone="info" />
        <ActionCard href="/dev/tools" title={tn("tools")} description={t("toolsDesc")} icon={HardDrive} tone="highlight" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <ActionCard href="/dev/brand" title={tn("brand")} description={t("brandDesc")} icon={Tag} />
        <ActionCard href="/dev/content" title={tn("content")} description={t("contentDesc")} icon={Type} tone="info" />
        <ActionCard href="/dev/faq" title={tn("faq")} description={t("faqDesc")} icon={HelpCircle} tone="brand" />
        <ActionCard href="/dev/centers" title={tn("centers")} description={t("centersDesc")} icon={MapPin} tone="success" />
        <ActionCard href="/dev/contact" title={tn("contact")} description={t("contactDesc")} icon={Phone} tone="warning" />
      </div>
    </div>
  );
}
