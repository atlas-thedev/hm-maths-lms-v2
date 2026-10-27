import { CalendarDays, CheckCircle2, GraduationCap, MapPin, QrCode, Repeat, School, Truck, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { CopyButton } from "@/components/copy-button";
import { Alert, Card, CardContent, CardHeader, PageHeader } from "@/components/ui";
import { getFormat, getT } from "@/i18n/server";
import { cn, initials } from "@/lib/utils";
import { qrSvg } from "@/lib/qr";
import { AvatarControls, ProfileForm } from "./profile-forms";
import { PremiumMark } from "@/components/premium-badge";
import { StudentIdCard } from "@/components/student-id-card";

export async function generateMetadata() {
  return { title: (await getT("portal.nav"))("profile") };
}

export default async function ProfilePage() {
  const { db, user, profile } = await requireUser();
  const [t, tc, f] = await Promise.all([getT("portal.profile"), getT("common"), getFormat()]);
  const isStudent = profile.role === "student";
  const [{ data: enr }, { data: subs }, { data: isPremium }, avatar, qr] = await Promise.all([
    db.from("enrollments").select("class_id").eq("student_id", user.id).eq("status", "approved"),
    db.from("exam_submissions").select("score, total_marks").eq("student_id", user.id).in("status", ["submitted", "graded"]),
    db.rpc("is_premium", { p_student: user.id }),
    profile.avatar_path ? db.storage.from("avatars").createSignedUrl(profile.avatar_path, 3600) : null,
    isStudent ? qrSvg(user.id) : null,
  ]);
  const photo = avatar?.data?.signedUrl ?? null;
  const classes = new Set((enr ?? []).map((e) => e.class_id as string)).size;
  const scored = (subs ?? []).filter((s) => s.score !== null && Number(s.total_marks) > 0);
  const avg = scored.length ? Math.round(scored.reduce((a, s) => a + (Number(s.score) / Number(s.total_marks)) * 100, 0) / scored.length) : null;

  const phone = profile.mobile || profile.whatsapp;
  const studentFields = [
    profile.full_name,
    phone,
    profile.school,
    profile.district,
    profile.address,
    profile.city,
    profile.town,
  ];
  const filledCount = studentFields.filter((v) => v !== null && v !== undefined && String(v).trim() !== "").length;
  const pct = Math.round((filledCount / studentFields.length) * 100);

  const missingSchoolOrDistrict = !profile.school || !profile.district;
  const missingAddress = !profile.address || !profile.city;
  const missingPhone = !phone;
  const hintText = pct === 100
    ? t("completeDone")
    : missingSchoolOrDistrict
      ? t("completeHint")
      : missingAddress
        ? t("completeHintAddress")
        : missingPhone
          ? t("completeHintPhone")
          : t("completeHintGeneric");

  const chips = [
    profile.al_year ? { icon: GraduationCap, text: tc("alBatch", { year: profile.al_year }) } : null,
    isStudent ? { icon: Repeat, text: tc(`attempts.${profile.attempt ?? 1}`) } : null,
    { icon: MapPin, text: tc(`towns.${profile.town}`) },
    profile.school ? { icon: School, text: profile.school } : null,
    profile.city ? { icon: Truck, text: profile.city } : null,
    { icon: CalendarDays, text: t("joined", { date: f.date(profile.created_at) }) },
  ].filter(Boolean) as { icon: typeof MapPin; text: string }[];

  const stats = [
    { label: t("stats.classes"), value: String(classes) },
    { label: t("stats.papers"), value: String(subs?.length ?? 0) },
    { label: t("stats.average"), value: avg === null ? tc("dash") : `${avg}%` },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title={t("title")} description={t("subtitle")} icon={UserRound} />
      {isStudent && !profile.address && <Alert variant="info"><a href="#address" className="font-semibold underline-offset-2 hover:underline">{t("addAddress")}</a></Alert>}

      {/* ── Hero ── */}
      <Card className="overflow-hidden">
        <div className="relative h-28 bg-gradient-dark sm:h-32">
          <div className="bg-dots absolute inset-0 opacity-25" />
          <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-brand-500/25 blur-3xl" />
          <div className="absolute -left-10 bottom-0 h-32 w-48 rounded-full bg-warning/15 blur-3xl" />
          <span className="absolute -bottom-8 right-6 select-none font-display text-[8rem] font-black leading-none text-white/10">∑</span>
        </div>
        <div className="relative px-5 pb-5 sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <AvatarControls
                userId={user.id}
                hasPhoto={!!profile.avatar_path}
                photoUrl={photo}
                initialsText={initials(profile.full_name)}
                fullName={profile.full_name}
              />
              <div className="min-w-0">
                <h2 className="min-w-0 font-display text-2xl font-bold leading-tight"><span className="line-clamp-2 break-words">{profile.full_name}</span></h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="inline-flex items-center gap-1">
                    <span className="font-mono text-sm font-semibold tracking-wider text-teal-700 dark:text-teal-400">{profile.student_id ?? tc("idCard.admin")}</span>
                    {profile.student_id && <CopyButton value={profile.student_id} />}
                  </span>
                  {isPremium === true && <PremiumMark label={tc("premium.name")} withText />}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {chips.map(({ icon: I, text }, i) => (
                    <span key={`${i}-${text}`} className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      <I className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{text}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-border rounded-2xl border bg-muted/30 lg:min-w-[360px]">
              {stats.map((s) => (
                <div key={s.label} className="px-3 py-3 text-center">
                  <p className="font-display text-xl font-bold">{s.value}</p>
                  <p className="text-[11px] leading-tight text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {isStudent && (
            <div className="mt-5 rounded-xl bg-muted/40 p-3">
              <div className="flex flex-col gap-0.5 text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <span className={cn("font-semibold inline-flex items-center gap-1.5", pct === 100 && "text-success-soft-foreground")}>
                  {pct === 100 && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
                  {t("completeness", { pct })}
                </span>
                <span className="text-muted-foreground">{hintText}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", pct === 100 ? "bg-success" : "bg-gradient-brand")}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_1fr]">
        {/* ── My student card + QR code ── */}
        <div className="space-y-5 lg:sticky lg:top-24 lg:h-fit">
          <div id="student-card" className="scroll-mt-24" data-testid="my-student-card"><StudentIdCard profile={profile} photoUrl={photo} premium={isPremium === true} /></div>
          {qr && (
            <Card id="qr" className="scroll-mt-24" data-testid="my-qr">
              <CardHeader icon={QrCode} title={t("qrTitle")} description={t("qrHint")} />
              <CardContent>
                <div className="force-light mx-auto max-w-[260px] rounded-2xl border bg-white p-4 text-center text-ink shadow-sm">
                  <div className="mx-auto aspect-square w-full [&>svg]:h-full [&>svg]:w-full" role="img" aria-label={t("qrTitle")} dangerouslySetInnerHTML={{ __html: qr }} />
                  <p className="mt-3 truncate font-display text-base font-bold">{profile.full_name}</p>
                  {profile.student_id && <p className="font-mono text-sm font-semibold tracking-wider text-primary">{profile.student_id}</p>}
                  <p className="mt-1 text-xs font-medium text-slate-600">
                    {[tc(`attempts.${profile.attempt ?? 1}`), profile.al_year ? tc("alBatch", { year: profile.al_year }) : null].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <p className="mt-3 text-center text-xs text-muted-foreground">{t("qrUse")}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Forms ── */}
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader icon={UserRound} title={t("details")} description={t("detailsHint")} className="border-b" />
            <CardContent className="pt-5 sm:pt-5"><ProfileForm profile={profile} initialPhotoUrl={photo} /></CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
