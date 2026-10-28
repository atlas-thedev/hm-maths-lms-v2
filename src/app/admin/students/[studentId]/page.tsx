import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Award,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  QrCode,
  School,
  User,
  Users,
} from "lucide-react";
import { canDeleteAccount, isOwnerRole, requireAdmin } from "@/lib/auth";
import { asService } from "@/lib/db/pg";
import { qrSvg } from "@/lib/qr";
import { getFormat, getT } from "@/i18n/server";
import type { Profile } from "@/lib/types";
import { cn, formatLKR, initials, whatsappLink } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, Badge, buttonVariants, Table, EmptyState } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { WhatsAppIcon } from "@/components/brand-icons";
import { StudentIdCard } from "@/components/student-id-card";
import { DeleteUserButton, ResetPasswordButton } from "../../forms";
import { PrintButton } from "./print-button";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  if (!UUID.test(studentId)) return { title: "Student Not Found" };
  const { db } = await requireAdmin();
  const { data } = await db.from("profiles").select("full_name").eq("id", studentId).maybeSingle();
  return { title: data?.full_name ? `${data.full_name} | ශිෂ්‍ය විස්තර` : "ශිෂ්‍ය විස්තර" };
}

type EnrollmentRow = {
  id: string;
  month: string;
  status: string;
  slip_url: string | null;
  bank_ref: string | null;
  admin_note: string | null;
  amount: number | null;
  created_at: string;
  class_title: string | null;
  class_fee: number | null;
};

type AttendanceRow = {
  day: string;
  scanned_at: string;
  method: "qr" | "manual";
  class_title: string | null;
};

type PaperMarkRow = {
  id: string;
  title: string;
  date: string;
  total: number;
  marks: number | null;
  remark: string | null;
};

export default async function StudentDetailPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  if (!UUID.test(studentId)) notFound();

  const { db, user, profile: adminProfile } = await requireAdmin();
  const isOwner = isOwnerRole(adminProfile.role);
  const [t, tc, f] = await Promise.all([getT("admin.students"), getT("common"), getFormat()]);

  // 1. Fetch Student Profile
  const { data } = await db.from("profiles").select("*").eq("id", studentId).maybeSingle();
  const student = data as Profile | null;
  if (!student) notFound();

  // 2. Fetch Avatar Signed URL & QR SVG
  const [avatarRes, qr] = await Promise.all([
    student.avatar_path ? db.storage.from("avatars").createSignedUrl(student.avatar_path, 3600) : null,
    qrSvg(student.id),
  ]);
  const photoUrl = avatarRes?.data?.signedUrl ?? null;

  // 3. Fetch Enrollments
  const enrollments = await asService(async (c) => (await c.query(
    `select e.id, e.month, e.status, e.slip_url, e.bank_ref, e.admin_note, e.amount, e.created_at,
            c.title as class_title, c.fee as class_fee
       from public.enrollments e
       left join public.classes c on c.id = e.class_id
      where e.student_id = $1
      order by e.month desc, e.created_at desc`, [studentId])).rows as EnrollmentRow[]);

  const slipPaths = enrollments.map((e) => e.slip_url).filter(Boolean) as string[];
  const signedSlips = slipPaths.length ? (await db.storage.from("bank-slips").createSignedUrls(slipPaths, 3600)).data ?? [] : [];
  const slipMap = new Map(signedSlips.map((x) => [x.path, x.signedUrl]));

  // 4. Fetch Attendance History
  const attendance = await asService(async (c) => (await c.query(
    `select a.day::text as day, a.scanned_at, a.method, c.title as class_title
       from public.attendance a
       left join public.classes c on c.id = a.class_id
      where a.student_id = $1
      order by a.day desc, a.scanned_at desc
      limit 50`, [studentId])).rows as AttendanceRow[]);

  // 5. Fetch Paper Marks
  const paperMarks = await asService(async (c) => (await c.query(
    `select pa.id, pa.title, pa.paper_date::text as date, pa.total_marks::float8 as total, m.marks::float8 as marks, m.remark
       from public.paper_marks m
       join public.papers pa on pa.id = m.paper_id
      where m.student_id = $1
      order by pa.paper_date desc, pa.created_at desc
      limit 30`, [studentId])).rows as PaperMarkRow[]);

  // Derived calculations
  const approvedEnrollments = enrollments.filter((e) => e.status === "approved").length;
  const pendingEnrollments = enrollments.filter((e) => e.status === "pending").length;
  const gradedPapers = paperMarks.filter((p) => p.marks !== null);
  const avgMarks = gradedPapers.length
    ? Math.round(gradedPapers.reduce((acc, p) => acc + ((p.marks ?? 0) / p.total) * 100, 0) / gradedPapers.length)
    : null;

  const wa = whatsappLink(student.whatsapp || student.mobile, t("waHello", { name: student.full_name }));
  const guardianWa = whatsappLink(student.guardian_mobile, `හලෝ, ${student.full_name} සම්බන්ධවයි.`);
  const meta = [tc(`attempts.${student.attempt ?? 1}`), student.al_year ? tc("alBatch", { year: student.al_year }) : null].filter(Boolean).join(" · ");

  return (
    <div className="space-y-6 pt-2 sm:pt-4">
      {/* ── Top Navigation & Quick Actions ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <Link href="/admin/students" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <ArrowLeft className="h-4 w-4" /> සියලු සිසුන් වෙත (Back)
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {student.mobile && (
            <a href={`tel:${student.mobile}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Phone className="h-3.5 w-3.5 text-primary" /> අමතන්න ({student.mobile})
            </a>
          )}
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm", className: "text-whatsapp hover:text-whatsapp" })}>
              <WhatsAppIcon className="h-4 w-4" /> WhatsApp
            </a>
          )}
          <PrintButton label="හැඳුනුම්පත Print කරන්න" />
          {student.id !== user.id && (student.role === "student" || (isOwner && student.role !== "developer")) && (
            <ResetPasswordButton id={student.id} name={student.full_name} compact />
          )}
          {student.id !== user.id && canDeleteAccount(adminProfile.role, student.role) && (
            <DeleteUserButton id={student.id} name={student.full_name} compact />
          )}
        </div>
      </div>

      {/* ── Student Hero Card with Profile Picture (PFP) ── */}
      <Card className="overflow-hidden bg-gradient-to-br from-card via-card to-muted/30">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            {/* Profile Picture (PFP) */}
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-border bg-muted shadow-md ring-4 ring-primary/10 sm:h-28 sm:w-28">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt={student.full_name} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center bg-gradient-brand font-display text-3xl font-extrabold text-white">
                  {initials(student.full_name)}
                </div>
              )}
            </div>

            {/* Student Info */}
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                  {student.full_name}
                </h1>
                {student.student_id && (
                  <Badge variant="outline" className="font-mono text-xs font-bold tracking-wider text-primary border-primary/30 bg-primary/5">
                    {student.student_id}
                  </Badge>
                )}
                {student.role !== "student" && <Badge variant="warning">{tc(`shell.${student.role}`)}</Badge>}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {student.al_year && <Badge variant="secondary"><GraduationCap className="h-3 w-3 mr-1" /> {tc("alBatch", { year: student.al_year })}</Badge>}
                <Badge variant="secondary">{tc(`attempts.${student.attempt ?? 1}`)}</Badge>
                <Badge variant="secondary"><MapPin className="h-3 w-3 mr-1" /> {tc(`towns.${student.town}`)}</Badge>
                {student.school && <span className="text-muted-foreground"><School className="inline h-3.5 w-3.5 mr-1" />{student.school}</span>}
              </div>

              <p className="text-xs text-muted-foreground pt-1">
                ගිණුම නිර්මාණය කළ දිනය: <span className="font-medium text-foreground">{f.dateTime(student.created_at)}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Key Performance Metrics ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <CreditCard className="h-4 w-4 text-primary" /> පන්ති ගාස්තු (Months)
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-foreground">
            {approvedEnrollments} <span className="text-xs font-normal text-muted-foreground">අනුමතයි</span>
            {pendingEnrollments > 0 && <span className="ml-2 text-xs font-semibold text-warning">({pendingEnrollments} pending)</span>}
          </p>
        </Card>

        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <CalendarCheck2 className="h-4 w-4 text-teal-600" /> පැමිණීම (Attendance)
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-foreground">
            {attendance.length} <span className="text-xs font-normal text-muted-foreground">දින</span>
          </p>
        </Card>

        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Award className="h-4 w-4 text-amber-500" /> ප්‍රශ්න පත්‍ර (Papers)
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-foreground">
            {gradedPapers.length} <span className="text-xs font-normal text-muted-foreground">සම්පූර්ණයි</span>
          </p>
        </Card>

        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <GraduationCap className="h-4 w-4 text-indigo-500" /> සාමාන්‍ය ලකුණු (Average)
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-foreground">
            {avgMarks !== null ? `${avgMarks}%` : tc("dash")}
          </p>
        </Card>
      </div>

      {/* ── Two Column Layout: Details & ID Card / QR ── */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        {/* Left: Complete Personal & Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-primary" /> පුද්ගලික සහ සම්බන්ධතා විස්තර (Student Details)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 text-sm">
              <div className="rounded-xl border bg-muted/20 p-2.5">
                <dt className="text-xs text-muted-foreground">සම්පූර්ණ නම (Full Name)</dt>
                <dd className="font-semibold text-foreground break-words">{student.full_name}</dd>
              </div>

              <div className="rounded-xl border bg-muted/20 p-2.5">
                <dt className="text-xs text-muted-foreground">ශිෂ්‍ය හැඳුනුම්පත (Student ID)</dt>
                <dd className="font-mono font-semibold text-primary">{student.student_id ?? tc("dash")}</dd>
              </div>

              <div className="rounded-xl border bg-muted/20 p-2.5">
                <dt className="text-xs text-muted-foreground">ජාතික හැඳුනුම්පත (NIC)</dt>
                <dd className="font-mono font-medium">{student.nic ?? tc("dash")}</dd>
              </div>

              <div className="rounded-xl border bg-muted/20 p-2.5">
                <dt className="text-xs text-muted-foreground">ප්‍රධාන මධ්‍යස්ථානය (Town / Center)</dt>
                <dd className="font-medium">{tc(`towns.${student.town}`)}</dd>
              </div>

              <div className="rounded-xl border bg-muted/20 p-2.5">
                <dt className="text-xs text-muted-foreground">දුරකථන අංකය (Mobile)</dt>
                <dd className="mt-0.5">
                  {student.mobile ? (
                    <a href={`tel:${student.mobile}`} className="font-mono font-semibold text-primary hover:underline">
                      {student.mobile}
                    </a>
                  ) : tc("dash")}
                </dd>
              </div>

              <div className="rounded-xl border bg-muted/20 p-2.5">
                <dt className="text-xs text-muted-foreground">WhatsApp අංකය</dt>
                <dd className="mt-0.5 flex items-center gap-1.5">
                  {student.whatsapp || student.mobile ? (
                    <>
                      <span className="font-mono font-semibold">{student.whatsapp || student.mobile}</span>
                      {wa && (
                        <a href={wa} target="_blank" rel="noreferrer" className="text-whatsapp">
                          <WhatsAppIcon className="h-4 w-4" />
                        </a>
                      )}
                    </>
                  ) : tc("dash")}
                </dd>
              </div>

              <div className="rounded-xl border bg-muted/20 p-2.5">
                <dt className="text-xs text-muted-foreground">භාරකරුගේ දුරකථනය (Guardian Mobile)</dt>
                <dd className="mt-0.5 flex items-center gap-1.5">
                  {student.guardian_mobile ? (
                    <>
                      <a href={`tel:${student.guardian_mobile}`} className="font-mono font-semibold text-primary hover:underline">
                        {student.guardian_mobile}
                      </a>
                      {guardianWa && (
                        <a href={guardianWa} target="_blank" rel="noreferrer" className="text-whatsapp">
                          <WhatsAppIcon className="h-4 w-4" />
                        </a>
                      )}
                    </>
                  ) : tc("dash")}
                </dd>
              </div>

              <div className="rounded-xl border bg-muted/20 p-2.5">
                <dt className="text-xs text-muted-foreground">ඊමේල් (Recovery Email)</dt>
                <dd className="font-medium truncate">{student.recovery_email ?? tc("dash")}</dd>
              </div>

              <div className="rounded-xl border bg-muted/20 p-2.5">
                <dt className="text-xs text-muted-foreground">පාසල (School)</dt>
                <dd className="font-medium">{student.school ?? tc("dash")}</dd>
              </div>

              <div className="rounded-xl border bg-muted/20 p-2.5">
                <dt className="text-xs text-muted-foreground">දිස්ත්‍රික්කය (District)</dt>
                <dd className="font-medium">{student.district ?? tc("dash")}</dd>
              </div>

              <div className="col-span-1 sm:col-span-2 rounded-xl border bg-muted/20 p-2.5">
                <dt className="text-xs text-muted-foreground">භාරදීමේ ලිපිනය (Delivery Address)</dt>
                <dd className="mt-0.5 font-medium whitespace-pre-line">
                  {[student.address, [student.city, student.postal_code].filter(Boolean).join(" ")].filter(Boolean).join("\n") || tc("dash")}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Right: Printable Student ID Card & Attendance QR */}
        <div className="space-y-6">
          <StudentIdCard profile={student} photoUrl={photoUrl} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <QrCode className="h-4 w-4 text-teal-700" /> පැමිණීමේ QR කේතය (Attendance QR Code)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="force-light mx-auto max-w-[280px] rounded-2xl border bg-white p-5 text-center text-ink shadow-sm">
                <div
                  className="mx-auto aspect-square w-full [&>svg]:h-full [&>svg]:w-full"
                  role="img"
                  aria-label="Attendance QR Code"
                  dangerouslySetInnerHTML={{ __html: qr }}
                />
                <p className="mt-3 truncate font-display text-base font-bold text-slate-900">{student.full_name}</p>
                {student.student_id && (
                  <p className="font-mono text-sm font-semibold tracking-wider text-teal-700">{student.student_id}</p>
                )}
                <p className="mt-1 text-xs font-medium text-slate-500">{meta}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Section: Class Enrollments & Payment History ── */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4 text-primary" /> පන්ති ලියාපදිංචි සහ ගෙවීම් ඉතිහාසය (Class Enrollments & Payments)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 sm:pt-4">
          {enrollments.length ? (
            <Table>
              <thead>
                <tr>
                  <th>පන්තිය</th>
                  <th>මාසය</th>
                  <th>තත්ත්වය</th>
                  <th>සම්බන්ධ වන ආකාරය / සටහන්</th>
                  <th>ගෙවූ මුදල</th>
                  <th>රිසිට්පත (Slip)</th>
                  <th>දිනය</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e) => {
                  const slipUrl = e.slip_url ? slipMap.get(e.slip_url) : null;
                  const isPdf = e.slip_url?.toLowerCase().endsWith(".pdf");
                  return (
                    <tr key={e.id}>
                      <td className="font-medium text-xs">
                        <p>{e.class_title ?? tc("dash")}</p>
                        {e.bank_ref && <p className="font-mono text-[11px] text-muted-foreground">Ref: {e.bank_ref}</p>}
                      </td>
                      <td className="whitespace-nowrap font-medium text-xs">{f.month(e.month)}</td>
                      <td>
                        <StatusBadge status={e.status} />
                      </td>
                      <td className="text-xs max-w-xs">
                        {e.admin_note ? (
                          <span className="text-muted-foreground">{e.admin_note}</span>
                        ) : (
                          <span className="text-muted-foreground italic">-</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap font-mono text-xs font-semibold">
                        {e.amount !== null ? formatLKR(e.amount) : e.class_fee ? formatLKR(e.class_fee) : tc("dash")}
                      </td>
                      <td className="text-xs">
                        {slipUrl ? (
                          <a
                            href={slipUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            {isPdf ? "PDF රිසිට්පත" : "රිසිට්පත බලන්න"}
                          </a>
                        ) : (
                          <span className="text-muted-foreground italic">නැත</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-xs text-muted-foreground">
                        {f.date(e.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          ) : (
            <EmptyState icon={CreditCard} title="පන්ති ගෙවීම් වාර්තා නැත" description="මෙම ශිෂ්‍යයා තවමත් කිසිදු පන්තියකට ලියාපදිංචි වී නොමැත." />
          )}
        </CardContent>
      </Card>

      {/* ── Section: Attendance History ── */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarCheck2 className="h-4 w-4 text-teal-600" /> පන්තියට පැමිණීමේ ඉතිහාසය (Attendance History)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 sm:pt-4">
          {attendance.length ? (
            <Table>
              <thead>
                <tr>
                  <th>දිනය</th>
                  <th>වේලාව</th>
                  <th>පන්තිය</th>
                  <th>ක්‍රමය (Method)</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((a, idx) => (
                  <tr key={`${a.day}-${idx}`}>
                    <td className="whitespace-nowrap font-medium text-xs">{f.date(a.day)}</td>
                    <td className="whitespace-nowrap font-mono text-xs">{f.time(a.scanned_at)}</td>
                    <td className="text-xs">
                      {a.class_title ? (
                        <span className="font-semibold text-teal-700 dark:text-teal-400">{a.class_title}</span>
                      ) : (
                        <span className="text-muted-foreground italic">සාමාන්‍ය දෛනික පැමිණීම (General)</span>
                      )}
                    </td>
                    <td className="text-xs text-muted-foreground">
                      {a.method === "qr" ? "QR කාඩ්පත් Scanner" : "Manual ඇතුළත් කිරීම"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState icon={CalendarDays} title="පැමිණීමේ වාර්තා නැත" description="මෙම ශිෂ්‍යයා සඳහා තවම දෛනික පැමිණීමක් වාර්තා වී නොමැත." />
          )}
        </CardContent>
      </Card>

      {/* ── Section: Paper Marks & Performance ── */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-4 w-4 text-amber-500" /> ප්‍රශ්න පත්‍ර ලකුණු සහ ප්‍රගතිය (Paper Marks & Performance)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 sm:pt-4">
          {paperMarks.length ? (
            <Table>
              <thead>
                <tr>
                  <th>ප්‍රශ්න පත්‍රය</th>
                  <th>දිනය</th>
                  <th>ලකුණු</th>
                  <th>ප්‍රතිශතය</th>
                  <th>ගුරු සටහන (Remark)</th>
                </tr>
              </thead>
              <tbody>
                {paperMarks.map((p) => {
                  const pct = p.marks === null ? null : Math.round((p.marks / p.total) * 100);
                  return (
                    <tr key={p.id}>
                      <td className="font-medium text-xs">{p.title}</td>
                      <td className="whitespace-nowrap text-xs text-muted-foreground">{f.date(p.date)}</td>
                      <td className="whitespace-nowrap font-mono text-xs">
                        {p.marks !== null ? (
                          <span className="font-semibold">{p.marks} / {p.total}</span>
                        ) : (
                          <span className="rounded-full bg-destructive-soft px-2 py-0.5 text-xs font-semibold text-destructive-soft-foreground">Missed</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-xs">
                        {pct !== null ? (
                          <span className={cn(
                            "rounded-full px-2 py-0.5 font-mono text-xs font-bold",
                            pct >= 75 ? "bg-success-soft text-success-soft-foreground" :
                            pct >= 50 ? "bg-info-soft text-info-soft-foreground" :
                            "bg-warning-soft text-warning-soft-foreground"
                          )}>
                            {pct}%
                          </span>
                        ) : tc("dash")}
                      </td>
                      <td className="text-xs text-muted-foreground">{p.remark ?? tc("dash")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          ) : (
            <EmptyState icon={Award} title="ප්‍රශ්න පත්‍ර වාර්තා නැත" description="මෙම ශිෂ්‍යයා සඳහා තවම ප්‍රශ්න පත්‍ර ලකුණු ඇතුළත් කර නොමැත." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
