"use client";
import { useState } from "react";
import { Ban, CalendarPlus, Check, KeyRound, Link2, Pin, PinOff, RotateCcw, Send, ShieldAlert, ShieldCheck, Trash2, Truck, X } from "lucide-react";
import { toast } from "sonner";
import { ActionForm } from "@/components/action-form";
import { FileUpload } from "@/components/file-upload";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { AL_YEARS, CLASS_TYPES, DURATION_OPTIONS, NOTICE_TAGS, WEEK_DAYS } from "@/lib/constants";
import type { ActionState, ClassRow, Exam, Lesson, Product } from "@/lib/types";
import { cn, currentMonth, formatMonth, isoToColomboLocal, shiftMonth } from "@/lib/utils";
import { formatDuration, livePlatform, scheduleLabel } from "@/lib/schedule";
import * as A from "./actions";
import { useT, useTownKeys } from "@/i18n/client";
import { BannerBuilder } from "./banner-builder";

function useForms() {
  const t = useT("admin.forms");
  const tc = useT("common");
  const months = tc.raw<string[]>("months");
  return { t, tc, fm: (m: string) => formatMonth(m, months) };
}

type Act = (p: ActionState, fd: FormData) => Promise<ActionState>;

export function DeleteButton({ action, id, label, confirm, size = "sm" }: {
  action: Act; id: string; label?: string; confirm?: string; size?: "sm" | "icon";
}) {
  const { t } = useForms();
  label ??= t("delete");
  return (
    <ActionForm action={action} confirm={confirm ?? t("deleteConfirm")}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="ghost" size={size} className="text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label={label}>
        <Trash2 />{size === "sm" ? label : null}
      </SubmitButton>
    </ActionForm>
  );
}

const monthOptions = () => {
  const cur = currentMonth();
  return Array.from({ length: 16 }, (_, i) => shiftMonth(cur, 3 - i));
};

// ───────────── Shared bits ─────────────
function PlatformHint({ url }: { url: string }) {
  const ts = useT("common.schedule");
  const p = livePlatform(url);
  if (!url || !p) return null;
  return <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 dark:bg-teal-500/10 dark:text-teal-300"><Link2 className="h-3 w-3" />{ts(`platforms.${p}`)}</span>;
}

function DurationSelect({ id, name, value, onChange, allowDefault, defaultMinutes }: {
  id: string; name: string; value: string; onChange: (v: string) => void; allowDefault?: boolean; defaultMinutes?: number;
}) {
  const { t } = useForms();
  return (
    <Select id={id} name={name} value={value} onChange={(e) => onChange(e.target.value)}>
      {allowDefault && <option value="">{t("lesson.classDefault", { d: formatDuration(defaultMinutes ?? 120) })}</option>}
      {DURATION_OPTIONS.map((d) => <option key={d} value={d}>{formatDuration(d)}</option>)}
    </Select>
  );
}

// ───────────── Classes ─────────────
export type ClassOption = { id: string; title: string; class_type: string; target_year: number | null };

export function ClassForm({
  cls,
  defaultLiveUrl,
  availableClasses = [],
  initialComboItemIds = [],
}: {
  cls?: ClassRow;
  defaultLiveUrl?: string | null;
  availableClasses?: ClassOption[];
  initialComboItemIds?: string[];
}) {
  const { t, tc } = useForms();
  const townKeys = useTownKeys();
  const [type, setType] = useState<string>(cls?.class_type ?? "Theory");
  const [free, setFree] = useState<boolean>(cls?.is_free ?? false);
  const [days, setDays] = useState<number[]>(cls?.schedule_days ?? []);
  const [start, setStart] = useState<string>(cls?.start_time?.slice(0, 5) ?? "");
  const [duration, setDuration] = useState<string>(String(cls?.duration_minutes ?? 120));
  const [note, setNote] = useState<string>(cls?.schedule ?? "");
  const [link, setLink] = useState<string>(defaultLiveUrl ?? "");
  const [title, setTitle] = useState<string>(cls?.title ?? "");
  const [year, setYear] = useState<string>(cls?.target_year ? String(cls.target_year) : "");
  const [town, setTown] = useState<string>(cls?.town ?? "");
  const isFree = free || type === "Free Seminar";
  const isCombo = type === "Combo";
  const [selectedCombo, setSelectedCombo] = useState<string[]>(initialComboItemIds);
  const toggleCombo = (id: string) => setSelectedCombo((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const dayNames = tc.raw<string[]>("schedule.days") ?? [];
  const preview = scheduleLabel({ schedule_days: days, start_time: start || null, duration_minutes: Number(duration), schedule: note },
    dayNames, (d) => tc("schedule.every", { days: d }), tc("schedule.and"));
  const toggle = (d: number) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  return (
    <ActionForm action={A.saveClassAction} className="space-y-4">
      {cls && <input type="hidden" name="id" value={cls.id} />}
      <Field label={t("class.title")} htmlFor="title"><Input id="title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("class.titlePh")} required /></Field>
      <Field label={t("class.description")} htmlFor="description" hint={t("class.descriptionHint")}><Textarea id="description" name="description" defaultValue={cls?.description ?? ""} placeholder={t("class.descriptionPh")} /></Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label={t("class.type")} htmlFor="class_type">
          <Select id="class_type" name="class_type" value={type} onChange={(e) => setType(e.target.value)}>{CLASS_TYPES.map((x) => <option key={x} value={x}>{tc(`classTypes.${x}`)}</option>)}</Select>
        </Field>
        <Field label={t("class.year")} htmlFor="target_year">
          <Select id="target_year" name="target_year" value={year} onChange={(e) => setYear(e.target.value)}><option value="">{t("allBatches")}</option>{AL_YEARS.map((y) => <option key={y}>{y}</option>)}</Select>
        </Field>
        <Field label={t("class.center")} htmlFor="town">
          <Select id="town" name="town" value={town} onChange={(e) => setTown(e.target.value)}><option value="">{t("class.anyCenter")}</option>{townKeys.map((x) => <option key={x} value={x}>{tc(`towns.${x}`)}</option>)}</Select>
        </Field>
      </div>
      <Field label={t("class.fee")} htmlFor="fee" hint={isFree ? t("class.feeFree") : undefined}>
        <Input id="fee" name="fee" type="number" min={0} step={50} defaultValue={cls?.fee ?? 2500} disabled={isFree} />
      </Field>

      {/* When type is Combo, show bundled classes selector. When normal class, show Timetable */}
      {isCombo ? (
        <fieldset className="scroll-mt-24 space-y-3 rounded-2xl border border-teal-200 bg-teal-50/40 p-4 dark:border-teal-900/50 dark:bg-teal-950/20">
          <legend className="px-1 font-display text-sm font-semibold text-teal-800 dark:text-teal-300">
            Combo පැකේජයට ඇතුළත් පන්ති (Bundled Classes)
          </legend>
          <p className="text-xs text-muted-foreground">
            ශිෂ්‍යයෙකු මෙම Combo පැකේජය ලබාගත් විට, ඔහුට ස්වයංක්‍රීයව ප්‍රවේශය හිමිවන පන්ති පහතින් තෝරන්න. එක් එක් පන්තියේ කාලසටහන ඒ ඒ පන්තියට අනුව අදාළ වේ.
          </p>
          {availableClasses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {availableClasses.map((item) => {
                const checked = selectedCombo.includes(item.id);
                return (
                  <label key={item.id} className={cn("flex items-start gap-2.5 p-3 rounded-xl border text-sm cursor-pointer transition select-none", checked ? "border-teal-600 bg-white shadow-sm ring-1 ring-teal-500/20 dark:bg-slate-900" : "bg-card/70 hover:border-border")}>
                    <input type="checkbox" name="combo_items" value={item.id} checked={checked} onChange={() => toggleCombo(item.id)} className="mt-0.5 h-4 w-4 rounded accent-teal-600" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground text-xs sm:text-sm leading-snug">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{item.target_year ? `${item.target_year} A/L · ` : ""}{tc(`classTypes.${item.class_type}`)}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">ඇතුළත් කිරීමට වෙනත් පන්ති හමු නොවීය.</p>
          )}
        </fieldset>
      ) : (
        <fieldset id="timetable" className="scroll-mt-24 space-y-4 rounded-2xl border bg-muted/30 p-4">
          <legend className="px-1 font-display text-sm font-semibold">{t("class.timetable")}</legend>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">{t("class.days")}</p>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEK_DAYS.map((d) => (
                <label key={d} className="cursor-pointer">
                  <input type="checkbox" name="schedule_days" value={d} checked={days.includes(d)} onChange={() => toggle(d)} className="peer sr-only" />
                  <span className="flex h-10 items-center justify-center rounded-lg border bg-background text-xs font-semibold transition hover:border-teal-500/50 peer-checked:border-teal-600 peer-checked:bg-teal-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-ring sm:text-sm">
                    {dayNames[d]}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t("class.startTime")} htmlFor="start_time"><Input id="start_time" name="start_time" type="time" value={start} onChange={(e) => setStart(e.target.value)} required={days.length > 0} /></Field>
            <Field label={t("class.duration")} htmlFor="duration_minutes"><DurationSelect id="duration_minutes" name="duration_minutes" value={duration} onChange={setDuration} /></Field>
          </div>
          <Field label={t("class.defaultLink")} htmlFor="default_live_url" hint={t("class.defaultLinkHint")}>
            <div className="relative">
              <Input id="default_live_url" name="default_live_url" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://youtube.com/live/… · https://zoom.us/j/…" className="pr-32" />
              <span className="absolute right-2 top-1/2 -translate-y-1/2"><PlatformHint url={link} /></span>
            </div>
          </Field>
          <Field label={t("class.note")} htmlFor="schedule"><Input id="schedule" name="schedule" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("class.notePh")} /></Field>
          <div className="rounded-xl border border-dashed border-teal-500/40 bg-background px-3 py-2.5 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("class.preview")} </span>
            <span className="font-medium">{preview ?? t("class.noDays")}</span>
          </div>
        </fieldset>
      )}

      <Field label={t("class.banner")}>
        <BannerBuilder initialConfig={cls?.banner_config ?? null} initialPhoto={cls?.banner_url ?? null} uploadLabel={t("class.bannerUpload")}
          cls={{ class_type: type, title: title || t("class.titlePh"), town: town || null, target_year: year ? Number(year) : null, start_time: start || null, duration_minutes: Number(duration), schedule_days: days }} />
      </Field>
      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="is_active" defaultChecked={cls?.is_active ?? true} className="h-4 w-4 accent-[hsl(var(--primary))]" /> {t("class.active")}</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="is_free" checked={isFree} onChange={(e) => setFree(e.target.checked)} disabled={type === "Free Seminar"} className="h-4 w-4 accent-[hsl(var(--primary))]" /> {t("class.free")}</label>
      </div>
      <SubmitButton pendingText={tc("actions.saving")}>{cls ? t("class.save") : t("class.create")}</SubmitButton>
    </ActionForm>
  );
}

// ───────────── Sessions & lessons ─────────────
export type SessionDefaults = { liveUrl?: string | null; durationMinutes?: number; startTime?: string | null };

export function LessonForm({ classId, lesson, liveUrl, defaults, defaultType = "regular", onDone }: {
  classId: string; lesson?: Lesson; liveUrl?: string | null; defaults?: SessionDefaults; defaultType?: "regular" | "extra"; onDone?: () => void;
}) {
  const { t, tc, fm } = useForms();
  const k = lesson?.id ?? "new";
  const local = isoToColomboLocal(lesson?.live_start_time); // "YYYY-MM-DDTHH:mm"
  const [type, setType] = useState<"regular" | "extra">(lesson?.session_type ?? defaultType);
  const [date, setDate] = useState(local.slice(0, 10));
  const [time, setTime] = useState(local.slice(11, 16) || (defaults?.startTime?.slice(0, 5) ?? ""));
  const [duration, setDuration] = useState(lesson?.duration_minutes ? String(lesson.duration_minutes) : "");
  const [link, setLink] = useState(lesson ? liveUrl ?? "" : defaults?.liveUrl ?? "");
  const [month, setMonth] = useState(lesson?.month ?? currentMonth());
  const effMonth = date ? date.slice(0, 7) : month;
  return (
    <ActionForm action={A.saveLessonAction} className="space-y-4" resetOnSuccess={!lesson}
      onSuccess={() => { if (!lesson) { setDate(""); setDuration(""); setLink(defaults?.liveUrl ?? ""); } onDone?.(); }}>
      {lesson && <input type="hidden" name="id" value={lesson.id} />}
      <input type="hidden" name="class_id" value={classId} />

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="radiogroup" aria-label={t("lesson.type")}>
        {(["regular", "extra"] as const).map((v) => (
          <label key={v} className="cursor-pointer">
            <input type="radio" name="session_type" value={v} checked={type === v} onChange={() => setType(v)} className="peer sr-only" />
            <span className="flex min-h-9 items-center justify-center rounded-lg px-2 py-1.5 text-center text-sm leading-snug font-semibold text-muted-foreground transition peer-checked:bg-card peer-checked:text-foreground peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
              {tc(`schedule.types.${v}`)}
            </span>
          </label>
        ))}
      </div>

      <Field label={t("lesson.title")} htmlFor={`title-${k}`}>
        <Input id={`title-${k}`} name="title" defaultValue={lesson?.title} placeholder={type === "extra" ? t("lesson.extraTitlePh") : t("lesson.titlePh")} required />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label={t("lesson.date")} htmlFor={`date-${k}`}><Input id={`date-${k}`} name="live_date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label={t("lesson.time")} htmlFor={`time-${k}`}><Input id={`time-${k}`} name="live_time" type="time" value={date ? time : ""} onChange={(e) => setTime(e.target.value)} disabled={!date} required={!!date} /></Field>
        <Field label={t("lesson.duration")} htmlFor={`dur-${k}`}>
          <DurationSelect id={`dur-${k}`} name="duration_minutes" value={duration} onChange={setDuration} allowDefault defaultMinutes={defaults?.durationMinutes} />
        </Field>
      </div>

      {!date && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_120px]">
          <Field label={t("month")} htmlFor={`month-${k}`} hint={t("lesson.noDateHint")}>
            <Select id={`month-${k}`} name="month" value={month} onChange={(e) => setMonth(e.target.value)}>
              {monthOptions().map((m) => <option key={m} value={m}>{fm(m)}</option>)}
            </Select>
          </Field>
          <Field label={t("lesson.week")} htmlFor={`week-${k}`}>
            <Select id={`week-${k}`} name="week_number" defaultValue={lesson?.week_number ?? 1}>{[1, 2, 3, 4, 5, 6].map((w) => <option key={w} value={w}>{t("lesson.weekN", { n: w })}</option>)}</Select>
          </Field>
        </div>
      )}

      <Field label={t("lesson.liveUrl")} htmlFor={`lu-${k}`} hint={date ? t("lesson.liveUrlHint") : t("lesson.liveNeedsDate")}>
        <div className="relative">
          <Input id={`lu-${k}`} name="live_url" type="url" value={link} onChange={(e) => setLink(e.target.value)} disabled={!date}
            placeholder="https://youtube.com/live/… · https://zoom.us/j/…" className="pr-32" />
          <span className="absolute right-2 top-1/2 -translate-y-1/2"><PlatformHint url={date ? link : ""} /></span>
        </div>
      </Field>

      <details className="group rounded-xl border px-4 py-3 [&_summary::-webkit-details-marker]:hidden" open={!!lesson && !!(lesson.youtube_url || lesson.tute_pdf_url || lesson.description)}>
        <summary className="cursor-pointer select-none text-sm font-semibold">{t("lesson.more")}</summary>
        <div className="mt-4 space-y-4">
          <Field label={t("lesson.youtube")} htmlFor={`yt-${k}`} hint={t("lesson.youtubeHint")}>
            <Input id={`yt-${k}`} name="youtube_url" type="url" defaultValue={lesson?.youtube_url ?? ""} placeholder="https://youtu.be/…" />
          </Field>
          <Field label={t("lesson.notes")} htmlFor={`desc-${k}`}><Textarea id={`desc-${k}`} name="description" defaultValue={lesson?.description ?? ""} className="min-h-[60px]" /></Field>
          <Field label={t("lesson.tute")}>
            <FileUpload key={effMonth} bucket="tute-pdfs" prefix={`${classId}/${effMonth}`} name="tute_pdf_url" accept="application/pdf" maxMB={50}
              defaultValue={lesson?.month === effMonth ? lesson?.tute_pdf_url : null} label={t("lesson.tuteUpload")} />
          </Field>
        </div>
      </details>

      {lesson && (
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_cancelled" defaultChecked={lesson.is_cancelled} className="h-4 w-4 accent-[hsl(var(--destructive))]" /> {t("lesson.cancelled")}</label>
      )}
      <SubmitButton pendingText={tc("actions.saving")}>{lesson ? t("lesson.save") : type === "extra" ? t("lesson.addExtra") : t("lesson.add")}</SubmitButton>
    </ActionForm>
  );
}

export function GenerateSessionsForm({ classId, ready, defaultTitle }: { classId: string; ready: boolean; defaultTitle: string }) {
  const { t, fm } = useForms();
  const cur = currentMonth();
  const months = [cur, shiftMonth(cur, 1), shiftMonth(cur, 2), shiftMonth(cur, -1)];
  if (!ready) return <p className="text-sm text-muted-foreground">{t("generate.needTimetable")} <a href="#timetable" className="font-semibold text-primary hover:underline">{t("generate.setTimetable")}</a></p>;
  return (
    <ActionForm action={A.generateSessionsAction} className="grid grid-cols-1 gap-3 sm:grid-cols-[150px_1fr_auto] sm:items-end">
      <input type="hidden" name="class_id" value={classId} />
      <Field label={t("month")} htmlFor="gen-month"><Select id="gen-month" name="month" defaultValue={cur}>{months.map((m) => <option key={m} value={m}>{fm(m)}</option>)}</Select></Field>
      <Field label={t("generate.prefix")} htmlFor="gen-title"><Input id="gen-title" name="title" defaultValue={defaultTitle} maxLength={60} /></Field>
      <SubmitButton pendingText={t("generate.working")}><CalendarPlus /> {t("generate.submit")}</SubmitButton>
    </ActionForm>
  );
}

export function CancelSessionButton({ id, cancelled }: { id: string; cancelled: boolean }) {
  const { t } = useForms();
  return (
    <ActionForm action={A.toggleCancelAction} confirm={cancelled ? undefined : t("lesson.cancelConfirm")}>
      <input type="hidden" name="id" value={id} /><input type="hidden" name="cancel" value={cancelled ? "0" : "1"} />
      <SubmitButton variant="ghost" size="icon" aria-label={cancelled ? t("lesson.restore") : t("lesson.cancel")} title={cancelled ? t("lesson.restore") : t("lesson.cancel")}
        className={cn(!cancelled && "text-warning-soft-foreground hover:bg-warning-soft hover:text-warning-soft-foreground")}>
        {cancelled ? <RotateCcw /> : <Ban />}
      </SubmitButton>
    </ActionForm>
  );
}

// ───────────── Payments ─────────────
export function ReviewButtons({ id, status = "pending", action = A.reviewEnrollmentAction }: { id: string; status?: string; action?: Act }) {
  const { t } = useForms();
  if (status === "approved") {
    return (
      <ActionForm action={action} confirm={t("review.revokeConfirm")} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="id" value={id} />
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success-soft-foreground"><Check className="h-4 w-4" /> {t("review.approvedState")}</span>
        <SubmitButton name="decision" value="rejected" size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive"><RotateCcw /> {t("review.revoke")}</SubmitButton>
      </ActionForm>
    );
  }
  if (status === "rejected") {
    return (
      <ActionForm action={action} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="id" value={id} />
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-destructive"><X className="h-4 w-4" /> {t("review.rejectedState")}</span>
        <SubmitButton name="decision" value="approved" size="sm" variant="outline"><Check /> {t("review.approveNow")}</SubmitButton>
      </ActionForm>
    );
  }
  return (
    <ActionForm action={action} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input type="hidden" name="id" value={id} />
      <Input name="admin_note" placeholder={t("review.note")} className="h-9 sm:w-56" />
      <div className="flex gap-2">
        <SubmitButton name="decision" value="approved" size="sm" variant="success"><Check /> {t("review.approve")}</SubmitButton>
        <SubmitButton name="decision" value="rejected" size="sm" variant="outline" className="text-destructive"><X /> {t("review.reject")}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function OrderButtons({ id, status }: { id: string; status: string }) {
  const { t } = useForms();
  return (
    <ActionForm action={A.reviewOrderAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <Input name="admin_note" placeholder={t("review.tracking")} className="h-9 w-48" />
      {status === "pending" && <SubmitButton name="decision" value="approved" size="sm" variant="success"><Check /> {t("review.approve")}</SubmitButton>}
      {status !== "shipped" && status !== "rejected" && <SubmitButton name="decision" value="shipped" size="sm" variant="outline"><Truck /> {t("review.shipped")}</SubmitButton>}
      {status === "pending" && <SubmitButton name="decision" value="rejected" size="sm" variant="outline" className="text-destructive"><X /> {t("review.reject")}</SubmitButton>}
    </ActionForm>
  );
}

export function GrantAccessForm({ classes }: { classes: Pick<ClassRow, "id" | "title">[] }) {
  const { t, fm } = useForms();
  return (
    <ActionForm action={A.grantAccessAction} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_160px_auto] sm:items-end" resetOnSuccess>
      <Field label={t("grant.student")} htmlFor="grant-student"><Input id="grant-student" name="student" placeholder={t("grant.studentPh")} required /></Field>
      <Field label={t("class.label")} htmlFor="grant-class"><Select id="grant-class" name="class_id" required>{classes.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</Select></Field>
      <Field label={t("month")} htmlFor="grant-month"><Select id="grant-month" name="month" defaultValue={currentMonth()}>{monthOptions().map((m) => <option key={m} value={m}>{fm(m)}</option>)}</Select></Field>
      <SubmitButton>{t("grant.submit")}</SubmitButton>
    </ActionForm>
  );
}

// ───────────── Notices ─────────────
export function NoticeForm({ classes }: { classes: Pick<ClassRow, "id" | "title">[] }) {
  const { t, tc } = useForms();
  return (
    <ActionForm action={A.createNoticeAction} className="space-y-4" resetOnSuccess>
      <Field label={t("notice.title")} htmlFor="n-title"><Input id="n-title" name="title" required placeholder={t("notice.titlePh")} /></Field>
      <Field label={t("notice.message")} htmlFor="n-content"><Textarea id="n-content" name="content" required /></Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label={t("notice.tag")} htmlFor="n-tag"><Select id="n-tag" name="tag">{NOTICE_TAGS.map((x) => <option key={x} value={x}>{tc(`noticeTags.${x}`)}</option>)}</Select></Field>
        <Field label={t("class.label")} htmlFor="n-class"><Select id="n-class" name="class_id"><option value="">{t("notice.allStudents")}</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</Select></Field>
        <Field label={t("notice.batch")} htmlFor="n-year"><Select id="n-year" name="target_year"><option value="">{t("allBatches")}</option>{AL_YEARS.map((y) => <option key={y}>{y}</option>)}</Select></Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_pinned" className="h-4 w-4" /> {t("notice.pin")}</label>
      <SubmitButton pendingText={t("notice.publishing")}><Send /> {t("notice.publish")}</SubmitButton>
    </ActionForm>
  );
}

export function NoticeRowActions({ id, pinned }: { id: string; pinned: boolean }) {
  const { t } = useForms();
  return (
    <div className="flex gap-1">
      <ActionForm action={A.updateNoticeAction}>
        <input type="hidden" name="id" value={id} /><input type="hidden" name="op" value={pinned ? "unpin" : "pin"} />
        <SubmitButton variant="ghost" size="icon" aria-label={pinned ? t("notice.unpinAria") : t("notice.pinAria")}>{pinned ? <PinOff /> : <Pin />}</SubmitButton>
      </ActionForm>
      <ActionForm action={A.updateNoticeAction} confirm={t("notice.deleteConfirm")}>
        <input type="hidden" name="id" value={id} /><input type="hidden" name="op" value="delete" />
        <SubmitButton variant="ghost" size="icon" className="text-destructive" aria-label={t("delete")}><Trash2 /></SubmitButton>
      </ActionForm>
    </div>
  );
}

// ───────────── Exams ─────────────
export function ExamForm({ exam, classes }: { exam?: Exam; classes: Pick<ClassRow, "id" | "title">[] }) {
  const { t, tc } = useForms();
  const [type, setType] = useState(exam?.exam_type ?? "mcq");
  const [classId, setClassId] = useState(exam?.class_id ?? classes[0]?.id ?? "");
  return (
    <ActionForm action={A.saveExamAction} className="space-y-4">
      {exam && <input type="hidden" name="id" value={exam.id} />}
      <Field label={t("exam.title")} htmlFor="e-title"><Input id="e-title" name="title" defaultValue={exam?.title} required placeholder={t("exam.titlePh")} /></Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label={t("class.label")} htmlFor="e-class"><Select id="e-class" name="class_id" value={classId} onChange={(e) => setClassId(e.target.value)} required>{classes.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</Select></Field>
        <Field label={t("exam.type")} htmlFor="e-type"><Select id="e-type" name="exam_type" value={type} onChange={(e) => setType(e.target.value as "mcq" | "structured")} disabled={!!exam}>
          <option value="mcq">{t("exam.mcq")}</option><option value="structured">{t("exam.structured")}</option></Select>
          {exam && <input type="hidden" name="exam_type" value={type} />}</Field>
        <Field label={t("exam.duration")} htmlFor="e-dur"><Input id="e-dur" name="duration_minutes" type="number" min={1} max={600} defaultValue={exam?.duration_minutes ?? 60} /></Field>
      </div>
      <Field label={t("exam.instructions")} htmlFor="e-desc"><Textarea id="e-desc" name="description" defaultValue={exam?.description ?? ""} className="min-h-[60px]" /></Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("exam.opens")} htmlFor="e-open"><Input id="e-open" name="opens_at" type="datetime-local" defaultValue={isoToColomboLocal(exam?.opens_at)} /></Field>
        <Field label={t("exam.closes")} htmlFor="e-close"><Input id="e-close" name="closes_at" type="datetime-local" defaultValue={isoToColomboLocal(exam?.closes_at)} /></Field>
      </div>
      {type === "structured" && classId && (
        <Field label={t("exam.paper")}>
          <FileUpload bucket="tute-pdfs" prefix={`${classId}/exams`} name="paper_pdf_url" accept="application/pdf" maxMB={50} defaultValue={exam?.paper_pdf_url} label={t("exam.paperUpload")} />
        </Field>
      )}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_published" defaultChecked={exam?.is_published ?? false} className="h-4 w-4" /> {t("exam.published")}</label>
      <SubmitButton pendingText={tc("actions.saving")}>{exam ? t("exam.save") : t("exam.create")}</SubmitButton>
    </ActionForm>
  );
}

export function QuestionForm({ examId }: { examId: string }) {
  const { t } = useForms();
  return (
    <ActionForm action={A.addQuestionAction} className="space-y-4" resetOnSuccess>
      <input type="hidden" name="exam_id" value={examId} />
      <Field label={t("question.text")} htmlFor="q-text"><Textarea id="q-text" name="question_text" required placeholder={t("question.textPh")} /></Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Field key={i} label={i > 2 ? t("question.optionalOption", { n: i }) : t("question.option", { n: i })} htmlFor={`q-o${i}`}><Input id={`q-o${i}`} name={`option_${i}`} required={i <= 2} /></Field>
        ))}
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("question.correct")} htmlFor="q-correct"><Select id="q-correct" name="correct_answer">{[1, 2, 3, 4, 5].map((i) => <option key={i} value={i}>{t("question.option", { n: i })}</option>)}</Select></Field>
          <Field label={t("question.marks")} htmlFor="q-marks"><Input id="q-marks" name="marks" type="number" min={0} step={0.5} defaultValue={1} /></Field>
        </div>
      </div>
      <Field label={t("question.explanation")} htmlFor="q-exp"><Textarea id="q-exp" name="explanation" className="min-h-[60px]" /></Field>
      <SubmitButton pendingText={t("question.adding")}>{t("question.add")}</SubmitButton>
    </ActionForm>
  );
}

export function GradeForm({ id, score, total, feedback }: { id: string; score: number | null; total: number | null; feedback: string | null }) {
  const { t, tc } = useForms();
  return (
    <ActionForm action={A.gradeSubmissionAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <Field label={t("question.marks")} htmlFor={`g-s-${id}`}><Input id={`g-s-${id}`} name="score" type="number" step={0.5} min={0} defaultValue={score ?? ""} className="h-9 w-20" required /></Field>
      <Field label={t("grade.outOf")} htmlFor={`g-t-${id}`}><Input id={`g-t-${id}`} name="total_marks" type="number" min={1} defaultValue={total ?? 100} className="h-9 w-20" /></Field>
      <Field label={t("grade.feedback")} htmlFor={`g-f-${id}`} className="min-w-40 flex-1"><Input id={`g-f-${id}`} name="feedback" defaultValue={feedback ?? ""} className="h-9" /></Field>
      <SubmitButton size="sm">{tc("actions.save")}</SubmitButton>
    </ActionForm>
  );
}

// ───────────── Students ─────────────
/** `compact` = icon-only (desktop table, where the row is crowded); the label stays as tooltip / screen-reader text. */
export function ResetPasswordButton({ id, name, compact = false }: { id: string; name: string; compact?: boolean }) {
  const { t } = useForms();
  return (
    <ActionForm action={A.resetPasswordAction} toasts={false} confirm={t("students.resetConfirm", { name })}
      onError={(s) => { toast.error(s?.error ?? ""); }}
      onSuccess={(s) => { toast.success(s?.message ?? "", { duration: 60_000, description: t("students.resetShare") }); }}>
      <input type="hidden" name="id" value={id} />
      {compact
        ? <SubmitButton variant="outline" size="icon-sm" className="h-9 w-9 rounded-lg" aria-label={t("students.reset")} title={t("students.reset")}><KeyRound className="h-4 w-4" /></SubmitButton>
        : <SubmitButton variant="outline" size="sm" className="h-9 gap-1.5"><KeyRound className="h-4 w-4" /> {t("students.reset")}</SubmitButton>}
    </ActionForm>
  );
}

/** Delete an account for good (confirmation first). Show it only where canDeleteAccount() allows. */
export function DeleteUserButton({ id, name, compact = false }: { id: string; name: string; compact?: boolean }) {
  const { t } = useForms();
  return (
    <ActionForm action={A.deleteUserAction} confirm={t("students.deleteConfirm", { name })}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="ghost" size={compact ? "icon-sm" : "sm"} aria-label={t("students.delete")} title={t("students.delete")}
        className={cn("text-destructive hover:bg-destructive/10 hover:text-destructive", compact && "h-9 w-9 rounded-lg")}>
        <Trash2 className="h-4 w-4" />{compact ? null : t("students.delete")}
      </SubmitButton>
    </ActionForm>
  );
}

export function RoleButton({ id, role, compact }: { id: string; role: string; compact?: boolean }) {
  const { t } = useForms();
  const next = role === "admin" ? "student" : "admin";
  const label = next === "admin" ? t("students.makeAdmin") : t("students.makeStudent");
  return (
    <ActionForm action={A.setRoleAction} confirm={next === "admin" ? t("students.makeAdminConfirm") : t("students.makeStudentConfirm")}>
      <input type="hidden" name="id" value={id} /><input type="hidden" name="role" value={next} />
      {compact ? (
        <SubmitButton variant="ghost" size="icon-sm" className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground" title={label} aria-label={label}>
          {next === "admin" ? <ShieldCheck className="h-4 w-4 text-primary" /> : <ShieldAlert className="h-4 w-4 text-warning" />}
        </SubmitButton>
      ) : (
        <SubmitButton variant="ghost" size="sm">{label}</SubmitButton>
      )}
    </ActionForm>
  );
}

// ───────────── Store ─────────────
export function ProductForm({ product }: { product?: Product }) {
  const { t, tc } = useForms();
  return (
    <ActionForm action={A.saveProductAction} className="space-y-4" resetOnSuccess={!product}>
      {product && <input type="hidden" name="id" value={product.id} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_160px]">
        <Field label={t("product.title")} htmlFor={`p-t-${product?.id ?? "new"}`}><Input id={`p-t-${product?.id ?? "new"}`} name="title" defaultValue={product?.title} required placeholder={t("product.titlePh")} /></Field>
        <Field label={t("product.price")} htmlFor={`p-p-${product?.id ?? "new"}`}><Input id={`p-p-${product?.id ?? "new"}`} name="price" type="number" min={0} defaultValue={product?.price ?? 1500} /></Field>
      </div>
      <Field label={t("class.description")} htmlFor={`p-d-${product?.id ?? "new"}`}><Textarea id={`p-d-${product?.id ?? "new"}`} name="description" defaultValue={product?.description ?? ""} className="min-h-[60px]" /></Field>
      <Field label={t("product.image")}>
        <FileUpload bucket="class-banners" prefix="products" name="image_url" publicUrl accept="image/jpeg,image/png,image/webp" maxMB={3} defaultValue={product?.image_url} label={t("product.imageUpload")} />
      </Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={product?.is_active ?? true} className="h-4 w-4" /> {t("product.active")}</label>
      <SubmitButton>{product ? tc("actions.save") : t("product.add")}</SubmitButton>
    </ActionForm>
  );
}

// ───────────── Events ─────────────
export function EventForm({ classes }: { classes: Pick<ClassRow, "id" | "title">[] }) {
  const { t } = useForms();
  return (
    <ActionForm action={A.saveEventAction} className="space-y-4" resetOnSuccess>
      <Field label={t("event.title")} htmlFor="e-title"><Input id="e-title" name="title" required maxLength={160} placeholder={t("event.titlePh")} /></Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label={t("event.date")} htmlFor="e-date"><Input id="e-date" name="date" type="date" required /></Field>
        <Field label={t("event.start")} htmlFor="e-start"><Input id="e-start" name="start_time" type="time" required /></Field>
        <Field label={t("event.end")} htmlFor="e-end"><Input id="e-end" name="end_time" type="time" /></Field>
      </div>
      <Field label={t("event.venue")} htmlFor="e-venue"><Input id="e-venue" name="venue" maxLength={200} placeholder={t("event.venuePh")} /></Field>
      <Field label={t("event.online")} htmlFor="e-online"><Input id="e-online" name="online_url" type="url" placeholder="https://…" /></Field>
      <Field label={t("event.description")} htmlFor="e-desc"><Textarea id="e-desc" name="description" maxLength={4000} /></Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("class.label")} htmlFor="e-class"><Select id="e-class" name="class_id"><option value="">{t("event.everyone")}</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</Select></Field>
        <Field label={t("notice.batch")} htmlFor="e-year"><Select id="e-year" name="target_year"><option value="">{t("allBatches")}</option>{AL_YEARS.map((y) => <option key={y}>{y}</option>)}</Select></Field>
      </div>
      <Field label={t("event.poster")}>
        <FileUpload bucket="class-banners" prefix="events" name="poster_url" publicUrl accept="image/jpeg,image/png,image/webp" maxMB={3} label={t("event.posterUpload")} />
      </Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_published" defaultChecked className="h-4 w-4" /> {t("event.publishNow")}</label>
      <SubmitButton pendingText={t("event.saving")}><CalendarPlus /> {t("event.save")}</SubmitButton>
    </ActionForm>
  );
}

export function EventRowActions({ id, published, canDelete = false }: { id: string; published: boolean; canDelete?: boolean }) {
  const { t } = useForms();
  return (
    <div className="flex gap-1">
      <ActionForm action={A.updateEventAction}>
        <input type="hidden" name="id" value={id} /><input type="hidden" name="op" value={published ? "hide" : "publish"} />
        <SubmitButton variant="ghost" size="sm">{published ? t("event.hide") : t("event.publish")}</SubmitButton>
      </ActionForm>
      {canDelete && (
        <ActionForm action={A.updateEventAction} confirm={t("event.deleteConfirm")}>
          <input type="hidden" name="id" value={id} /><input type="hidden" name="op" value="delete" />
          <SubmitButton variant="ghost" size="icon" className="text-destructive" aria-label={t("delete")}><Trash2 /></SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}
