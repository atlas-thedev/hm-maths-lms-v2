import Link from "next/link";
import { Phone, QrCode, Search, UserRound } from "lucide-react";
import { WhatsAppIcon } from "@/components/brand-icons";
import { canDeleteAccount, isOwnerRole, requireAdmin } from "@/lib/auth";
import { Badge, Input, PageHeader, Select, Table, buttonVariants, cardVariants } from "@/components/ui";
import { AL_YEARS } from "@/lib/constants";
import { townKeys } from "@/lib/centers";
import { getCenters } from "@/lib/settings";
import type { Profile } from "@/lib/types";
import { cn, initials, toStudentId, whatsappLink } from "@/lib/utils";
import { getFormat, getT } from "@/i18n/server";
import { DeleteUserButton, ResetPasswordButton, RoleButton } from "../forms";

export async function generateMetadata() {
  return { title: (await getT("admin.nav"))("students") };
}

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ q?: string; town?: string; year?: string }> }) {
  const { q, town, year } = await searchParams;
  const { db, user, profile } = await requireAdmin();
  const isOwner = isOwnerRole(profile.role);
  const [t, tc, f, centers] = await Promise.all([getT("admin.students"), getT("common"), getFormat(), getCenters()]);
  const townsList = townKeys(centers);
  let query = db.from("profiles").select("*, enrollments:enrollments!enrollments_student_id_fkey(count)", { count: "exact" }).order("created_at", { ascending: false }).limit(200);
  const term = toStudentId(q ?? "").replace(/[%,()*]/g, "");
  if (term) query = query.or(`full_name.ilike.%${term}%,mobile.ilike.%${term}%,nic.ilike.%${term}%,student_id.ilike.%${term}%,school.ilike.%${term}%`);
  if (town && townsList.includes(town)) query = query.eq("town", town);
  if (year && /^\d{4}$/.test(year)) query = query.eq("al_year", Number(year));
  const { data, count } = await query;
  const rows = (data ?? []) as (Profile & { enrollments: { count: number }[] })[];

  const avatarPaths = rows.map((r) => r.avatar_path).filter(Boolean) as string[];
  const signedAvatars = avatarPaths.length ? (await db.storage.from("avatars").createSignedUrls(avatarPaths, 1800)).data ?? [] : [];
  const avatarUrlMap = new Map(signedAvatars.map((x) => [x.path, x.signedUrl]));

  return (
    <div>
      <PageHeader title={t("title")} description={t("shown", { n: rows.length, total: count ?? rows.length })} />
      <form className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_160px_140px_auto]">
        <Input name="q" type="search" enterKeyHint="search" defaultValue={q} placeholder={t("search")} className="col-span-2 sm:col-span-1" />
        <Select name="town" defaultValue={town ?? ""}><option value="">{t("allCenters")}</option>{townsList.map((x) => <option key={x} value={x}>{tc(`towns.${x}`)}</option>)}</Select>
        <Select name="year" defaultValue={year ?? ""}><option value="">{t("allYears")}</option>{AL_YEARS.map((y) => <option key={y}>{y}</option>)}</Select>
        <button className={buttonVariants({ className: "col-span-2 sm:col-span-1" })}><Search /> {t("filter")}</button>
      </form>

      {/* Phones: one card per student */}
      <ul className="space-y-2.5 sm:hidden">
        {rows.map((p) => {
          const wa = whatsappLink(p.mobile, t("waHello", { name: p.full_name }));
          const avatarUrl = avatarUrlMap.get(p.avatar_path ?? "");
          return (
            <li key={p.id} className={cn(cardVariants(), "p-3.5")}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Link href={`/admin/students/${p.id}`} className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border bg-muted ring-1 ring-border/50">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-teal-600/10 font-display text-xs font-bold text-teal-700 dark:text-teal-400">
                        {initials(p.full_name)}
                      </div>
                    )}
                  </Link>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5 font-semibold leading-snug">
                      <Link href={`/admin/students/${p.id}`} className="break-words hover:text-primary hover:underline">
                        {p.full_name}
                      </Link>
                      {p.role === "developer" ? <Badge variant="highlight">{tc("shell.developer")}</Badge> : p.role === "owner" ? <Badge variant="warning">{tc("shell.owner")}</Badge> : p.role === "admin" ? <Badge>{tc("shell.admin")}</Badge> : null}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">{p.student_id ?? tc("dash")} · {p.al_year ?? tc("dash")} · {tc(`towns.${p.town}`)}</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{t("cols.enrollments")}: {p.enrollments?.[0]?.count ?? 0}</span>
              </div>
              <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                <p>{p.mobile ?? tc("dash")} · {t("nic")} {p.nic ?? tc("dash")}</p>
                {p.school ? <p className="line-clamp-1">{p.school}{p.district ? `, ${p.district}` : ""}</p> : null}
                <p>{t("cols.joined")}: {f.date(p.created_at)}</p>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t pt-2.5">
                <Link href={`/admin/students/${p.id}`} className={buttonVariants({ variant: "outline", size: "sm", className: "h-9 gap-1 text-xs" })}>
                  <UserRound className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" /> විස්තර
                </Link>
                {p.mobile && <a href={`tel:${p.mobile}`} aria-label={p.mobile} className={buttonVariants({ variant: "outline", size: "sm", className: "h-9" })}><Phone /> {p.mobile}</a>}
                {wa && <a href={wa} target="_blank" rel="noreferrer" aria-label={t("whatsapp")} className={buttonVariants({ variant: "outline", size: "icon" })}><WhatsAppIcon className="h-5 w-5" /></a>}
                <span className="ml-auto flex items-center gap-1">
                  {p.role === "student" && <Link href={`/admin/students/${p.id}`} aria-label={t("qr")} title={t("qr")} className={buttonVariants({ variant: "outline", size: "icon", className: "h-9" })}><QrCode className="h-4 w-4" /></Link>}
                  {p.id !== user.id && (p.role === "student" || (isOwner && p.role !== "developer")) && <ResetPasswordButton id={p.id} name={p.full_name} />}
                  {isOwner && p.id !== user.id && !isOwnerRole(p.role) && <RoleButton id={p.id} role={p.role} />}
                  {p.id !== user.id && canDeleteAccount(profile.role, p.role) && <DeleteUserButton id={p.id} name={p.full_name} compact />}
                </span>
              </div>
            </li>
          );
        })}
        {!rows.length && <li className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t("empty")}</li>}
      </ul>

      <div className="hidden sm:block">
      <Table>
        <thead><tr><th>{t("cols.student")}</th><th>{t("cols.contact")}</th><th>{t("cols.batch")}</th><th>{t("cols.school")}</th><th>{t("cols.enrollments")}</th><th>{t("cols.joined")}</th><th /></tr></thead>
        <tbody>
          {rows.map((p) => {
            const wa = whatsappLink(p.mobile, t("waHello", { name: p.full_name }));
            const avatarUrl = avatarUrlMap.get(p.avatar_path ?? "");
            return (
              <tr key={p.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <Link href={`/admin/students/${p.id}`} className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border bg-muted ring-1 ring-border/50 transition hover:ring-primary">
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center bg-teal-600/10 font-display text-xs font-bold text-teal-700 dark:text-teal-400">
                          {initials(p.full_name)}
                        </div>
                      )}
                    </Link>
                    <div className="min-w-0">
                      <Link href={`/admin/students/${p.id}`} className="font-medium hover:text-primary hover:underline block truncate">
                        {p.full_name}{" "}
                        {p.role === "developer" ? <Badge variant="highlight">{tc("shell.developer")}</Badge> : p.role === "owner" ? <Badge variant="warning">{tc("shell.owner")}</Badge> : p.role === "admin" ? <Badge>{tc("shell.admin")}</Badge> : null}
                      </Link>
                      <p className="font-mono text-xs text-muted-foreground">{p.student_id ?? tc("dash")}</p>
                    </div>
                  </div>
                </td>
                <td className="text-xs"><p>{p.mobile ?? tc("dash")}</p><p className="text-muted-foreground">{t("nic")} {p.nic ?? tc("dash")}</p></td>
                <td className="text-xs">{p.al_year ?? tc("dash")} · {tc(`towns.${p.town}`)}</td>
                <td className="max-w-56 text-xs"><p>{p.school ?? tc("dash")}{p.district ? `, ${p.district}` : ""}</p>{p.address ? <p className="mt-0.5 line-clamp-2 text-muted-foreground" title={p.address}>{[p.address, p.city, p.postal_code].filter(Boolean).join(", ")}</p> : null}</td>
                <td>{p.enrollments?.[0]?.count ?? 0}</td>
                <td className="text-xs text-muted-foreground">{f.date(p.created_at)}</td>
                <td>
                  <div className="flex items-center justify-end gap-1.5">
                    <Link href={`/admin/students/${p.id}`} aria-label="විස්තර බලන්න" title="විස්තර බලන්න (View Profile)" className={buttonVariants({ variant: "outline", size: "sm", className: "h-8 px-2 text-xs gap-1" })}>
                      <UserRound className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />
                      <span>විස්තර</span>
                    </Link>
                    {p.role === "student" && <Link href={`/admin/students/${p.id}`} aria-label={t("qr")} title={t("qr")} className={buttonVariants({ variant: "ghost", size: "icon", className: "h-8 w-8" })}><QrCode className="h-4 w-4" /></Link>}
                    {wa && <a href={wa} target="_blank" rel="noreferrer" aria-label={t("whatsapp")} className={buttonVariants({ variant: "ghost", size: "icon", className: "h-8 w-8" })}><WhatsAppIcon className="h-4 w-4" /></a>}
                    {p.id !== user.id && (p.role === "student" || (isOwner && p.role !== "developer")) && <ResetPasswordButton id={p.id} name={p.full_name} compact />}
                    {isOwner && p.id !== user.id && !isOwnerRole(p.role) && <RoleButton id={p.id} role={p.role} />}
                    {p.id !== user.id && canDeleteAccount(profile.role, p.role) && <DeleteUserButton id={p.id} name={p.full_name} compact />}
                  </div>
                </td>
              </tr>
            );
          })}
          {!rows.length && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">{t("empty")}</td></tr>}
        </tbody>
      </Table>
      </div>
    </div>
  );
}
