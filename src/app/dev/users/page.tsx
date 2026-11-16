import { Code2, Crown, LogOut, Radio, UserPlus } from "lucide-react";
import { requireDeveloper } from "@/lib/auth";
import { asService } from "@/lib/db/pg";
import { getFormat, getT } from "@/i18n/server";
import { Avatar, Badge, Card, CardContent, CardHeader, ListRow, PageHeader } from "@/components/ui";
import { CreateDeveloperForm, CreateSuperadminForm, RemoveDeveloperButton, RemoveSuperadminButton, SignOutForm } from "./users-forms";

export const metadata = { title: "Accounts & sessions" };
export const dynamic = "force-dynamic";

const ROLE_BADGE: Record<string, "destructive" | "highlight" | "warning" | "default" | "secondary"> = {
  superadmin: "destructive",
  developer: "highlight",
  owner: "warning",
  admin: "default",
  student: "secondary",
};

export default async function DevUsersPage() {
  const [{ user, profile }, f, t] = await Promise.all([requireDeveloper(), getFormat(), getT("dev.users")]);
  const isSuper = profile.role === "superadmin";
  const { supers, devs, online, counts } = await asService(async (c) => ({
    supers: isSuper ? (await c.query(`select p.id, p.full_name, u.email, p.created_at from public.profiles p join auth.users u on u.id = p.id where p.role = 'superadmin' order by p.created_at`)).rows as { id: string; full_name: string; email: string; created_at: string }[] : [],
    devs: (await c.query(`select p.id, p.full_name, u.email, p.created_at from public.profiles p join auth.users u on u.id = p.id where p.role = 'developer' order by p.created_at`)).rows as { id: string; full_name: string; email: string; created_at: string }[],
    online: (await c.query(`select distinct on (s.user_id) p.full_name, p.role, p.student_id, s.last_seen_at
                              from auth.sessions s join public.profiles p on p.id = s.user_id
                             where s.revoked_at is null and s.last_seen_at > now() - interval '20 minutes'
                             order by s.user_id, s.last_seen_at desc limit 40`)).rows as { full_name: string; role: string; student_id: string | null; last_seen_at: string }[],
    counts: (await c.query(`select p.role, count(distinct s.user_id)::int as users, count(*)::int as sessions
                              from auth.sessions s join public.profiles p on p.id = s.user_id
                             where s.revoked_at is null and s.last_seen_at > now() - interval '30 days' group by p.role`)).rows as { role: string; users: number; sessions: number }[],
  }));
  return (
    <div className="space-y-5">
      <PageHeader title={t("title")} sticker="group" description={t("description")} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {["student", "admin", "owner", "developer", "superadmin"].map((r) => {
          const c = counts.find((x) => x.role === r);
          return (
            <div key={r} className="rounded-2xl border border-border/80 bg-card p-4 shadow-soft dark:border-white/10">
              <Badge variant={ROLE_BADGE[r]}>{t(`roles.${r}`)}</Badge>
              <p className="mt-2 font-display text-2xl font-bold">{c?.users ?? 0}</p>
              <p className="text-xs text-muted-foreground">{t("signedIn30d", { sessions: c?.sessions ?? 0 })}</p>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader icon={Radio} title={t("onlineNow", { count: online.length })} description={t("onlineDesc")} />
          <CardContent className="space-y-2">
            {online.length ? online.map((o, i) => (
              <ListRow key={i} leading={<Avatar name={o.full_name} size="sm" />} title={o.full_name} subtitle={`${o.student_id ?? t(`roleSingular.${o.role}`)} · ${f.dateTime(o.last_seen_at)}`}
                trailing={<Badge variant={ROLE_BADGE[o.role] ?? "secondary"}>{t(`roleSingular.${o.role}`)}</Badge>} />
            )) : <p className="text-sm text-muted-foreground">{t("nobody")}</p>}
          </CardContent>
        </Card>
        <div className="space-y-5">
          {isSuper && (
            <>
              <Card>
                <CardHeader icon={Crown} title={t("superadmins")} description={t("superadminsDesc")} />
                <CardContent className="space-y-2">
                  {supers.map((d) => (
                    <ListRow key={d.id} leading={<Avatar name={d.full_name} />} title={<>{d.full_name}{d.id === user.id ? <span className="ml-1.5 text-xs font-normal text-muted-foreground">{t("you")}</span> : null}</>} subtitle={d.email}
                      trailing={d.id !== user.id ? <RemoveSuperadminButton id={d.id} name={d.full_name} /> : null} />
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader icon={UserPlus} title={t("addSuperadmin")} description={t("addSuperadminDesc")} />
                <CardContent><CreateSuperadminForm /></CardContent>
              </Card>
            </>
          )}
          <Card>
            <CardHeader icon={Code2} title={t("developers")} description={t("developersDesc")} />
            <CardContent className="space-y-2">
              {devs.map((d) => (
                <ListRow key={d.id} leading={<Avatar name={d.full_name} />} title={<>{d.full_name}{d.id === user.id ? <span className="ml-1.5 text-xs font-normal text-muted-foreground">{t("you")}</span> : null}</>} subtitle={d.email}
                  trailing={d.id !== user.id ? <RemoveDeveloperButton id={d.id} name={d.full_name} /> : null} />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader icon={UserPlus} title={t("addDeveloper")} description={t("addDeveloperDesc")} />
            <CardContent><CreateDeveloperForm /></CardContent>
          </Card>
          <Card>
            <CardHeader icon={LogOut} title={t("signOutTitle")} description={t("signOutDesc")} />
            <CardContent className="grid gap-2 sm:grid-cols-2">
              <SignOutForm scope="students" label={t("signOutStudents")} />
              <SignOutForm scope="everyone" label={t("signOutEveryone")} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
