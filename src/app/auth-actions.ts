"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/db/server";
import { createAdminClient } from "@/lib/db/admin";
import { AL_YEARS, ATTEMPTS } from "@/lib/constants";
import { townKeys } from "@/lib/centers";
import { HONEYPOT, checkFormTicket } from "@/lib/form-guard";
import type { ActionState } from "@/lib/types";
import { getT } from "@/i18n/server";
import type { T } from "@/i18n/translate";
import { mobileToEmail, normalizeMobile, normalizeNic, toStudentId } from "@/lib/utils";
import { resolveAccount } from "@/lib/accounts";
import { clientIp, rateLimit, safeNext } from "@/lib/security";

import { getAccessSettings, getCenters } from "@/lib/settings";
import { isStaffRole } from "@/lib/auth";

const registerSchema = (t: T, towns: string[]) =>
  z
    .object({
      first_name: z.string().trim().min(1, t("auth.firstName")).max(60),
      last_name: z.string().trim().min(1, t("auth.lastName")).max(60),
      mobile: z.string().transform((v, ctx) => {
        const n = normalizeMobile(v);
        if (!n) ctx.addIssue({ code: "custom", message: t("auth.mobile") });
        return n ?? "";
      }),
      nic: z.string().transform((v, ctx) => {
        const n = normalizeNic(v);
        if (!n) ctx.addIssue({ code: "custom", message: t("auth.nic") });
        return n ?? "";
      }),
      wa_same: z.string().optional(),
      whatsapp: z.string().optional(),
      al_year: z.coerce.number().refine((y) => (AL_YEARS as readonly number[]).includes(y), t("auth.alYear")),
      attempt: z.coerce.number().refine((a) => (ATTEMPTS as readonly number[]).includes(a), t("auth.attempt")),
      town: z.string().refine((v) => towns.includes(v), t("auth.town")),
      school: z.string().trim().min(2, t("auth.school")).max(120),
      district: z.string().trim().min(2, t("auth.district")).max(60),
      address: z.string().trim().min(8, t("auth.address")).max(300),
      city: z.string().trim().min(2, t("auth.city")).max(80),
      postal_code: z.string().trim().regex(/^(\d{5})?$/, t("auth.postal")).optional(),
      password: z.string().min(8, t("auth.password")).max(72),
      confirm: z.string(),
      form_ticket: z.string().optional(),
      [HONEYPOT]: z.string().optional(),
    })
    .refine((d) => d.password === d.confirm, { path: ["confirm"], message: t("auth.mismatch") })
    .transform((d, ctx) => {
      const whatsapp = d.wa_same ? d.mobile : normalizeMobile(d.whatsapp ?? "");
      if (!whatsapp) ctx.addIssue({ code: "custom", path: ["whatsapp"], message: t("auth.whatsapp") });
      return { ...d, whatsapp: whatsapp ?? "" };
    });

function fieldErrors(err: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of err.issues) out[String(i.path[0])] ??= i.message;
  return out;
}

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const [t, access] = await Promise.all([getT("errors"), getAccessSettings()]);
  if (!access.registrationOpen) return { error: access.registrationClosedMessage || t("auth.registrationClosed") };
  const ip = await clientIp();
  if (!rateLimit(`register:${ip}`, 8, 60 * 60 * 1000)) return { error: t("auth.tooMany") };
  const fields = Object.fromEntries(formData) as Record<string, FormDataEntryValue>;
  const parsed = registerSchema(t, townKeys(await getCenters())).safeParse(fields);
  if (!parsed.success) return { error: t("generic.fixFields"), fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  const ticket = checkFormTicket(d.form_ticket ?? "", d[HONEYPOT] ?? "");
  if (!ticket.ok) return { error: t(ticket.reason === "fast" ? "auth.botFast" : "auth.botCheck") };
  const full_name = `${d.first_name} ${d.last_name}`.replace(/\s+/g, " ").trim();

  const admin = createAdminClient();
  // One-time ticket: a form page that already created an account cannot be replayed for more sign-ups.
  // It is only used up once the account exists (below), so a student who hits "mobile already
  // registered" can fix the field and submit the same page again.
  await admin.from("used_captchas").delete().lt("expires_at", new Date().toISOString());
  const { data: used, error: usedErr } = await admin.from("used_captchas").select("nonce").eq("nonce", ticket.nonce).limit(1);
  if (usedErr) return { error: t("generic.dbNotReady") };
  if (used?.length) return { error: t("auth.botCheck") };

  // Parameterised look-ups (no string-built filters).
  const [byMobile, byNic] = await Promise.all([
    admin.from("profiles").select("id").eq("mobile", d.mobile).limit(1),
    admin.from("profiles").select("id").eq("nic", d.nic).limit(1),
  ]);
  if (byMobile.error || byNic.error) return { error: t("generic.dbNotReady") };
  if (byMobile.data?.length || byNic.data?.length) {
    const fe: Record<string, string> = {};
    if (byMobile.data?.length) fe.mobile = t("auth.mobileTaken");
    if (byNic.data?.length) fe.nic = t("auth.nicTaken");
    return { error: t("auth.exists"), fieldErrors: fe };
  }

  // Students sign in with their mobile number; we map it to an internal e-mail so no SMS/e-mail
  // provider is needed (zero cost). The account is confirmed immediately via the service role.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: mobileToEmail(d.mobile),
    password: d.password,
    email_confirm: true,
    user_metadata: {
      full_name, mobile: d.mobile, whatsapp: d.whatsapp, nic: d.nic, al_year: String(d.al_year), attempt: String(d.attempt),
      town: d.town, school: d.school, district: d.district,
      address: d.address, city: d.city, postal_code: d.postal_code ?? "",
    },
  });
  if (createErr || !created?.user) {
    return { error: createErr && /already/i.test(createErr.message) ? t("auth.mobileTaken") : t("auth.createFailed") };
  }
  // Now the ticket is spent (best effort: the account already exists, and a replay would hit "mobile taken").
  await admin.from("used_captchas").insert({ nonce: ticket.nonce, expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() });
  // Belt & braces: make sure these land on the profile even if the signup trigger predates them.
  await admin.from("profiles").update({
    address: d.address, city: d.city, postal_code: d.postal_code || null, whatsapp: d.whatsapp, attempt: d.attempt,
  }).eq("id", created.user.id);

  const db = await createClient();
  const { error: signInErr } = await db.auth.signInWithPassword({ email: mobileToEmail(d.mobile), password: d.password });
  if (signInErr) return { ok: true, message: t("auth.created") };
  redirect("/dashboard?welcome=1");
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = await getT("errors.auth");
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");
  if (!identifier || !password) return { error: t("missingCredentials") };
  const ip = await clientIp();
  if (!rateLimit(`login:${ip}`, 30, 15 * 60 * 1000) || !rateLimit(`login:${ip}:${identifier.toLowerCase()}`, 8, 15 * 60 * 1000)) {
    return { error: t("tooMany") };
  }

  // Mobile number, 8-digit Student ID, or (admins) e-mail.
  const account = await resolveAccount(identifier);
  if (!account) return { error: /^\d{8}$/.test(toStudentId(identifier)) ? t("badCredentials") : t("badIdentifier") };
  const email = account.email;

  const db = await createClient();
  let { data, error } = await db.auth.signInWithPassword({ email, password });
  // Copy-pasted passwords often carry stray spaces: retry once with the trimmed value.
  if (error && password.trim() !== password && password.trim()) {
    ({ data, error } = await db.auth.signInWithPassword({ email, password: password.trim() }));
  }
  if (error || !data.user) {
    const invalid = error?.code === "invalid_credentials" || /invalid login credentials/i.test(error?.message ?? "");
    if (error && !invalid) console.error("[login] auth error:", error.status, error.code, error.message);
    return { error: invalid || !error ? t("badCredentials") : t("serviceError") };
  }

  const { data: profile } = await db.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  const back = safeNext(next);
  if (isStaffRole(profile?.role)) redirect(back && (back.startsWith("/admin") || back.startsWith("/dev")) ? back : "/admin");
  redirect(back ?? "/dashboard");
}

export async function logoutAction() {
  const db = await createClient();
  await db.auth.signOut();
  redirect("/");
}
