import { Code2, LogOut, Radio, UserPlus } from "lucide-react";
import { requireDeveloper } from "@/lib/auth";
import { asService } from "@/lib/db/pg";
import { getFormat } from "@/i18n/server";
import { Avatar, Badge, Card, CardContent, CardHeader, ListRow, PageHeader } from "@/components/ui";
import { CreateDeveloperForm, RemoveDeveloperButton, SignOutForm } from "./users-forms";

export const metadata = { title: "Accounts & sessions" };
export const dynamic = "force-dynamic";

const ROLE_BADGE: Record<string, "highlight" | "warning" | "default" | "secondary"> = { developer: "highlight", owner: "warning", admin: "default", student: "secondary" };

export default async function DevUsersPage() {
  const { user } = await requireDeveloper();
  const f = await getFormat();
  const { devs, online, counts } = await asService(async (c) => ({
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
      <PageHeader title="Accounts & sessions" sticker="group" description="Developer accounts, who is online right now, and emergency sign-out." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {["student", "admin", "owner", "developer"].map((r) => {
          const c = counts.find((x) => x.role === r);
          return (
            <div key={r} className="rounded-2xl border border-border/80 bg-card p-4 shadow-soft dark:border-white/10">
              <Badge variant={ROLE_BADGE[r]} className="capitalize">{r}s</Badge>
              <p className="mt-2 font-display text-2xl font-bold">{c?.users ?? 0}</p>
              <p className="text-xs text-muted-foreground">signed in (30 days) · {c?.sessions ?? 0} sessions</p>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader icon={Radio} title={`Online now (${online.length})`} description="Anyone active in the last 20 minutes." />
          <CardContent className="space-y-2">
            {online.length ? online.map((o, i) => (
              <ListRow key={i} leading={<Avatar name={o.full_name} size="sm" />} title={o.full_name} subtitle={`${o.student_id ?? o.role} · ${f.dateTime(o.last_seen_at)}`}
                trailing={<Badge variant={ROLE_BADGE[o.role] ?? "secondary"} className="capitalize">{o.role}</Badge>} />
            )) : <p className="text-sm text-muted-foreground">Nobody right now.</p>}
          </CardContent>
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader icon={Code2} title="Developer accounts" description="Developers can do everything owners can, plus this panel. Owners can't change developer accounts." />
            <CardContent className="space-y-2">
              {devs.map((d) => (
                <ListRow key={d.id} leading={<Avatar name={d.full_name} />} title={<>{d.full_name}{d.id === user.id ? <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span> : null}</>} subtitle={d.email}
                  trailing={d.id !== user.id ? <RemoveDeveloperButton id={d.id} name={d.full_name} /> : null} />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader icon={UserPlus} title="Add a developer" description="New e-mail → creates the account. Existing e-mail → that account becomes a developer." />
            <CardContent><CreateDeveloperForm /></CardContent>
          </Card>
          <Card>
            <CardHeader icon={LogOut} title="Sign people out" description="Ends sessions on every device. Your own session stays signed in." />
            <CardContent className="grid gap-2 sm:grid-cols-2">
              <SignOutForm scope="students" label="Sign out all students" />
              <SignOutForm scope="everyone" label="Sign out everyone else" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
