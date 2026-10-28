import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Activity, Database, GitCommit, HardDrive, HelpCircle, MapPin, Megaphone, Palette, Phone, Power, Server, ShieldCheck, Tag, Type, Users, UserRoundCheck, Wrench } from "lucide-react";
import { requireDeveloper } from "@/lib/auth";
import { asService } from "@/lib/db/pg";
import { getAccessSettings, getAnnouncementSettings, getMaintenanceSettings, getThemeSettings } from "@/lib/settings";
import { ActionCard, Badge, Card, CardContent, CardHeader, HeroCard, HeroChip, ListRow, StatCard } from "@/components/ui";

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
  const { profile } = await requireDeveloper();
  const started = Date.now();
  const [git, db, rest, storage, backup, theme, maint, ann, access] = await Promise.all([
    gitVersion(),
    asService(async (c) => {
      const r = await c.query(`select
          (select count(*) from public.profiles where role = 'student')::int as students,
          (select count(*) from public.profiles where role in ('admin','owner','developer'))::int as staff,
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
    { label: "Website", ok: true, detail: `Node ${process.version} · up ${fmtUptime(process.uptime())}` },
    { label: "Database", ok: !!db, detail: db ? `PostgreSQL ${db.pg_version} · ${db.db_size}` : "Not reachable" },
    { label: "Database API (PostgREST)", ok: rest, detail: rest ? "Responding" : "Not responding" },
    { label: "File storage", ok: true, detail: `${storage.files} files · ${mb(storage.bytes)}` },
    { label: "Latest backup", ok: !!backup && Date.now() - backup.at.getTime() < 2 * 864e5, detail: backup ? `${backup.name} · ${ago(backup.at)} · ${mb(backup.bytes)}` : "No backups found" },
    { label: "Server", ok: load < cpus * 1.5, detail: `Load ${load.toFixed(2)} on ${cpus} CPUs · app memory ${mb(mem)} · free ${mb(os.freemem())} of ${mb(os.totalmem())}` },
  ];

  return (
    <div className="space-y-5">
      <HeroCard tone="dark" symbol="{ }">
        <p className="text-sm text-white/90">Developer panel</p>
        <h1 className="mt-1 font-display text-[1.6rem] font-extrabold leading-tight sm:text-3xl">Hi, {profile.full_name.split(" ")[0]}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <HeroChip><GitCommit className="h-3.5 w-3.5" /> {git.branch} · {git.commit}</HeroChip>
          <HeroChip><Activity className="h-3.5 w-3.5" /> checks took {ms} ms</HeroChip>
          <HeroChip>{checks.every((c) => c.ok) ? "All systems normal" : `${checks.filter((c) => !c.ok).length} need attention`}</HeroChip>
        </div>
      </HeroCard>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Students" value={db?.students ?? "—"} icon={Users} tone="info" />
        <StatCard label="Online now" value={db?.online ?? "—"} hint={`${db?.active24 ?? "—"} active in 24 h`} icon={UserRoundCheck} tone="success" />
        <StatCard label="Slips waiting" value={db?.pending ?? "—"} icon={ShieldCheck} tone="warning" />
        <StatCard label="Active classes" value={db?.classes ?? "—"} hint={`${db?.staff ?? "—"} staff accounts`} icon={Database} tone="highlight" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader icon={Server} title="System health" description="Checked live when this page loads." />
          <CardContent className="space-y-2">
            {checks.map((c) => (
              <ListRow key={c.label} icon={c.ok ? ShieldCheck : Power} tone={c.ok ? "success" : "danger"} title={c.label} subtitle={c.detail}
                trailing={<Badge variant={c.ok ? "success" : "destructive"}>{c.ok ? "OK" : "Check"}</Badge>} />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader icon={Wrench} title="Site switches" description="What visitors see right now." />
          <CardContent className="space-y-2">
            <ListRow href="/dev/site" icon={Power} tone={maint.enabled ? "danger" : "neutral"} title="Maintenance mode" subtitle={maint.enabled ? "ON, students see the maintenance screen" : "Off"} chevron
              trailing={<Badge variant={maint.enabled ? "destructive" : "secondary"}>{maint.enabled ? "ON" : "Off"}</Badge>} />
            <ListRow href="/dev/site" icon={Megaphone} tone={ann.enabled ? "info" : "neutral"} title="Announcement banner" subtitle={ann.enabled ? ann.text : "Hidden"} chevron
              trailing={<Badge variant={ann.enabled ? "info" : "secondary"}>{ann.enabled ? "Live" : "Off"}</Badge>} />
            <ListRow href="/dev/site" icon={Users} tone={access.registrationOpen ? "success" : "warning"} title="Student sign-ups" subtitle={access.registrationOpen ? "Open" : "Closed"} chevron
              trailing={<Badge variant={access.registrationOpen ? "success" : "warning"}>{access.registrationOpen ? "Open" : "Closed"}</Badge>} />
            <ListRow href="/dev/theme" leading={<span className="h-10 w-10 shrink-0 rounded-xl ring-1 ring-black/10" style={{ background: theme.brand }} />}
              title="Theme" subtitle={`${theme.brand} · ${theme.buttons} buttons · ${theme.defaultMode}${theme.allowToggle ? "" : " (locked)"}`} chevron />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ActionCard href="/dev/theme" title="Theme & colours" description="Brand colour, light/dark, roundness" icon={Palette} />
        <ActionCard href="/dev/site" title="Maintenance & site" description="Maintenance, banner, sign-ups" icon={Power} tone="danger" />
        <ActionCard href="/dev/users" title="Accounts & sessions" description="Developers, sign everyone out" icon={Users} tone="info" />
        <ActionCard href="/dev/tools" title="Tools & exports" description="CSV exports, clear cache" icon={HardDrive} tone="highlight" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <ActionCard href="/dev/brand" title="Brand & SEO" description="Name, logo, home photos, Google text" icon={Tag} />
        <ActionCard href="/dev/content" title="Site text" description="Edit any sentence, English or Sinhala" icon={Type} tone="info" />
        <ActionCard href="/dev/faq" title="FAQ" description="Add, edit and reorder frequently asked questions" icon={HelpCircle} tone="brand" />
        <ActionCard href="/dev/centers" title="Centers" description="Class locations (Nugegoda, …)" icon={MapPin} tone="success" />
        <ActionCard href="/dev/contact" title="Contact & links" description="Phones, channels, bank accounts, videos" icon={Phone} tone="warning" />
      </div>
    </div>
  );
}
