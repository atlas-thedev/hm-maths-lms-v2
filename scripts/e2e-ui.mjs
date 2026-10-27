#!/usr/bin/env node
// Full browser E2E against a running app (default http://localhost:3100) and its database.
// Local run:  bash scripts/dev-stack.sh up && eval "$(bash scripts/dev-stack.sh env)"
//             psql -h 127.0.0.1 -p 55432 -U postgres -d hm_dev -v admin_email=admin@example.com -v admin_pw=... -f deploy/seed-admin.sql
//             npm run build && npx next start -p 3100   (same env)   then:
//             BASE=http://localhost:3100 ADMIN_EMAIL=admin@example.com ADMIN_PW=... npm run test:ui
// Env: ADMIN_DATABASE_URL (superuser, test cleanup only), POSTGREST_URL, JWT_SECRET, STORAGE_DIR.
import { chromium } from "playwright";
import { createHmac, randomBytes } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import { loadRestClient, mintToken, requireEnv } from "./_rest.mjs";

const { ADMIN_DATABASE_URL, POSTGREST_URL, JWT_SECRET, STORAGE_DIR } = requireEnv("ADMIN_DATABASE_URL", "POSTGREST_URL", "JWT_SECRET", "STORAGE_DIR");

const BASE = process.env.BASE ?? "http://localhost:3100";
const SHOTS = process.env.SHOTS; // set SHOTS=/some/dir to also save a screenshot of every page
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@nativelaunch.xyz";
const ADMIN_PW = process.env.ADMIN_PW;
if (!ADMIN_PW) { console.error("Set ADMIN_PW"); process.exit(1); }
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const RestClient = await loadRestClient();
// Service-role client (bypasses row-level security) used to seed and check data.
const svc = new RestClient(POSTGREST_URL, { headers: { Authorization: `Bearer ${mintToken(JWT_SECRET, { role: "service_role" }, 3600)}` } });
const adminDb = new pg.Pool({ connectionString: ADMIN_DATABASE_URL, max: 2 });
const tag = `UI${Date.now().toString(36)}`;
const month = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7);
const mobile = "07" + String(Date.now()).slice(-8);
const nic = String(Date.now()).slice(-12).padStart(12, "2");
const SLIP = process.env.SLIP ?? "/tmp/slip.png";
if (!process.env.SLIP) writeFileSync(SLIP, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"));

let pass = 0; const problems = [];
const ok = (m) => { pass++; console.log("  ✓", m); };
const bad = (m) => { problems.push(m); console.log("  ✗", m); };
const check = (cond, m) => (cond ? ok(m) : bad(m));

const cleanup = { classes: [], users: [] };
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? undefined, args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"] });
const consoleErrors = [];
const newPage = async (vp = { width: 1366, height: 860 }, locale, { stickers = false } = {}) => {
  const ctx = await browser.newContext({ viewport: vp });
  // Videos (and, unless a check needs them, Lottie stickers) are skipped to keep the browser small on shared machines.
  await ctx.route(stickers ? /\.(mp4|webm)(\?|$)/ : /\.(mp4|webm|tgs)(\?|$)/, (r) => r.abort());
  if (locale) await ctx.addCookies([{ name: "hm_locale", value: locale, url: BASE }]);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => consoleErrors.push(`${page.url()}: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && !/favicon|ERR_FAILED|Failed to load resource.*(404|images)/i.test(m.text())) consoleErrors.push(`${page.url()}: ${m.text().slice(0, 200)}`); });
  page.on("dialog", (d) => d.accept());
  return page;
};
const shot = async (page, name, full = true) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: full }); };
const go = async (page, path) => {
  try { const r = await page.goto(BASE + path, { waitUntil: "networkidle" }); return r?.status() ?? 0; }
  catch (e) { if (!/crashed/i.test(String(e))) throw e; const r = await page.goto(BASE + path, { waitUntil: "networkidle" }); return r?.status() ?? 0; } // renderer crash in low-memory sandboxes: retry once
};
const missingKeys = async (page) => (await page.content()).match(/\b(?:portal|admin|common|landing|auth|errors)\.[a-z]+\.[a-zA-Z.]+\b/g) ?? [];

try {
  // ── Seed content as admin (service role) ──
  console.log("Seed");
  const { data: cls } = await svc.from("classes").insert({ title: `${tag} 2027 A/L Theory`, description: "Pure Maths — Functions\nApplied — Vectors\nWeekly tute", class_type: "Theory", target_year: 2027, town: "Panadura", fee: 3500, schedule_days: [6], start_time: "08:00", duration_minutes: 240, is_active: true }).select().single();
  const { data: free } = await svc.from("classes").insert({ title: `${tag} Free Seminar`, class_type: "Free Seminar", target_year: 2027, fee: 0, is_free: true, is_active: true }).select().single();
  cleanup.classes.push(cls.id, free.id);
  const soon = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const { data: seeded } = await svc.from("lessons").insert([
    { class_id: cls.id, month, week_number: 1, title: `${tag} Functions — intro`, youtube_url: "https://youtu.be/dQw4w9WgXcQ" },
    { class_id: cls.id, month, week_number: 2, title: `${tag} Live: Vectors`, live_start_time: soon, session_type: "extra" },
    { class_id: free.id, month, week_number: 1, title: `${tag} Orientation`, youtube_url: "https://youtu.be/dQw4w9WgXcQ" },
  ]).select("id, live_start_time");
  await svc.from("lesson_live_links").insert({ lesson_id: seeded.find((l) => l.live_start_time).id, live_url: "https://zoom.us/j/123456789" });
  const { data: exam } = await svc.from("exams").insert({ class_id: cls.id, title: `${tag} Unit Test`, duration_minutes: 15, is_published: true }).select().single();
  await svc.from("exam_questions").insert([
    { exam_id: exam.id, question_text: "2 + 2 = ?", options_json: ["3", "4", "5"], correct_answer: 1, sort_order: 1 },
    { exam_id: exam.id, question_text: "d/dx (x²) = ?", options_json: ["x", "2x", "x²"], correct_answer: 1, sort_order: 2 },
  ]);
  await svc.from("notices").insert({ title: `${tag} Welcome notice`, content: "Classes start this Saturday.", tag: "General" });
  ok("seeded class, free class, lessons, MCQ, notice");

  // ── Public pages ──
  console.log("Public pages");
  for (const [vpName, vp] of [["desk", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
    for (const loc of ["en", "si"]) {
      const p = await newPage(vp, loc);
      for (const [name, path] of [["home", "/"], ["store", "/store"], ["login", "/login"], ["register", "/register"], ["404", "/nope-" + tag]]) {
        const st = await go(p, path);
        if (name === "home" && process.env.E2E_SCROLL) { for (let y = 0; y < 9000; y += 700) { await p.mouse.wheel(0, 700); await p.waitForTimeout(120); } await p.waitForTimeout(500); }
        check(name === "404" ? st === 404 : st === 200, `${vpName}/${loc} ${path} → ${st}`);
        const mk = await missingKeys(p); if (mk.length) bad(`${loc} ${path} untranslated keys: ${[...new Set(mk)].join(", ")}`);
        if (loc === "en" || name !== "404") await shot(p, `${vpName}-${loc}-${name}`);
      }
      if (vpName === "desk" && loc === "en") check((await p.locator("body").innerText()).length > 0, "pages render");
      await p.context().close();
    }
  }
  {
    const p = await newPage();
    await go(p, "/");
    check(await p.locator(`text=${tag} 2027 A/L Theory`).count() > 0, "home carousel lists DB class");
    check(await p.locator("[data-testid=hero-ab-results]", { hasText: "+500" }).count() === 1, "Part 11: hero shows +500 A/B results near YouTube subscribers");
    check(await p.locator("[data-testid=community-ab-results]", { hasText: "+500" }).count() === 1, "Part 11: community strip shows +500 A/B results");
    await go(p, "/store");
    check(await p.locator(`text=${tag} 2027 A/L Theory`).count() > 0, "public store lists class");
    await p.context().close();
  }

  // ── Student registration via UI ──
  console.log("Student register");
  const sp = await newPage(undefined, "en");
  await go(sp, "/register");
  await sp.click("button[type=submit]"); await sp.waitForTimeout(300);
  check(sp.url().includes("/register"), "empty register blocked");
  await sp.fill("[name=first_name]", "Ui"); await sp.fill("[name=last_name]", `Tester ${tag}`);
  await sp.fill("[name=mobile]", mobile); await sp.fill("[name=nic]", nic);
  await sp.selectOption("[name=al_year]", "2027"); await sp.selectOption("[name=town]", "Panadura");
  await sp.fill("[name=school]", "Royal College"); await sp.selectOption("[name=district]", "Kalutara");
  await sp.fill("[name=address]", "12 Galle Road, Panadura"); await sp.fill("[name=city]", "Panadura");
  await sp.fill("[name=password]", "Str0ng!Pass"); await sp.fill("[name=confirm]", "Str0ng!Pass");
  await sp.fill("[name=hm_trap_7f]", "http://spam.example"); await sp.waitForTimeout(4500); await sp.click("button[type=submit]"); await sp.waitForTimeout(2500);
  check(sp.url().includes("/register") && (await sp.locator("[role=alert], .text-destructive").count()) > 0, "honeypot-filled sign-up rejected");
  check((await sp.inputValue("[name=first_name]")) === "Ui", "form keeps values after error");
  // A student who is already registered under one number: the first try fails, then they fix the number
  // and press Sign up again on the SAME page (no refresh) — that must work.
  const dupMobile = "07" + String(Date.now() + 7).slice(-8);
  const [dup] = (await adminDb.query(`insert into auth.users (email, encrypted_password, raw_user_meta_data) values ($1, 'x', $2) returning id`,
    [`${dupMobile}@students.hmmaths.lk`, JSON.stringify({ full_name: `Dup ${tag}`, mobile: dupMobile, nic: `D${tag}`, al_year: "2027", town: "Horana" })])).rows;
  cleanup.users.push(dup.id);
  await go(sp, "/register");
  await sp.fill("[name=first_name]", "Ui"); await sp.fill("[name=last_name]", `Tester ${tag}`);
  await sp.fill("[name=mobile]", dupMobile); await sp.fill("[name=nic]", nic);
  await sp.uncheck("[name=wa_same]"); await sp.fill("[name=whatsapp]", "0719998877");
  await sp.selectOption("[name=al_year]", "2027"); await sp.selectOption("[name=attempt]", "2"); await sp.selectOption("[name=town]", "Panadura");
  await sp.fill("[name=school]", "Royal College"); await sp.selectOption("[name=district]", "Kalutara");
  await sp.fill("[name=address]", "12 Galle Road, Panadura"); await sp.fill("[name=city]", "Panadura");
  await sp.fill("[name=password]", "Str0ng!Pass"); await sp.fill("[name=confirm]", "Str0ng!Pass");
  await sp.waitForTimeout(4500); // the invisible bot check rejects forms posted within 4 s
  await sp.click("button[type=submit]"); await sp.waitForTimeout(2500);
  check(sp.url().includes("/register") && (await sp.locator("[role=alert]").count()) > 0, "already-registered mobile rejected");
  await sp.fill("[name=mobile]", mobile);
  await sp.fill("[name=password]", "Str0ng!Pass"); await sp.fill("[name=confirm]", "Str0ng!Pass");
  await Promise.all([sp.waitForURL(/\/dashboard/, { timeout: 20000 }), sp.click("button[type=submit]")])
    .then(() => ok("fixed mobile + resubmit on the same page → registered " + new URL(sp.url()).pathname),
          async () => bad(`resubmit after "mobile taken" failed: ${(await sp.locator("[role=alert]").allInnerTexts()).join(" | ")}`));
  const { data: prof } = await svc.from("profiles").select("id, student_id, full_name, school, district, whatsapp, attempt").eq("mobile", mobile).single();
  cleanup.users.push(prof.id);
  check(/^2027\d{4}$/.test(prof.student_id) && prof.full_name === `Ui Tester ${tag}` && prof.school === "Royal College", `profile ${prof.student_id} saved with school/district`);
  check(prof.whatsapp === "0719998877" && prof.attempt === 2, "WhatsApp number + attempt saved");
  await sp.waitForLoadState("networkidle"); await shot(sp, "student-dashboard-new");

  // Logout + login with mobile
  await sp.context().clearCookies();
  await sp.context().addCookies([{ name: "hm_locale", value: "en", url: BASE }]); // clearing cookies also drops the language choice
  await go(sp, "/login"); await sp.fill("#identifier", mobile); await sp.fill("#password", "wrong-pass"); await sp.click("button[type=submit]"); await sp.waitForTimeout(2000);
  check(sp.url().includes("/login"), "wrong password rejected");
  await sp.fill("#identifier", mobile); await sp.fill("#password", "Str0ng!Pass");
  await Promise.all([sp.waitForURL(/\/dashboard/, { timeout: 15000 }), sp.click("button[type=submit]")]); ok("student login with mobile");
  check((await go(sp, "/admin")) && !sp.url().includes("/admin"), "student cannot open /admin");

  // ── Student portal pages before payment ──
  console.log("Portal (unpaid)");
  for (const [name, path] of [["dashboard", "/dashboard"], ["classes", "/dashboard/classes"], ["free", "/dashboard/free-zone"], ["exams", "/dashboard/exams"], ["notifications", "/dashboard/notifications"], ["profile", "/dashboard/profile"], ["payments", "/dashboard/payments"], ["store", "/dashboard/store"], ["store-class", `/dashboard/store/class/${cls.id}`]]) {
    const st = await go(sp, path); check(st === 200, `${path} → ${st}`);
    const mk = await missingKeys(sp); if (mk.length) bad(`${path} untranslated: ${[...new Set(mk)].join(", ")}`);
    await shot(sp, `student-${name}`);
  }
  await go(sp, "/dashboard/free-zone"); check(await sp.locator(`text=${tag} Orientation`).count() > 0, "free zone shows free lesson");
  await go(sp, "/dashboard/notifications"); check(await sp.locator(`text=${tag} Welcome notice`).count() > 0, "notice visible");
  await go(sp, `/dashboard/classes/${cls.id}`); check(await sp.locator(`text=${tag} Functions — intro`).count() === 0 || sp.url().includes("store"), "paid lesson hidden before payment");

  // ── Store (Part 8): tabs, exam-year + Online / Physical filters, sections per center ──
  console.log("Store");
  {
    await go(sp, "/dashboard/store");
    const cardIn = (key) => sp.locator(`[data-testid=store-section-${key}]`, { hasText: `${tag} 2027 A/L Theory` }).count();
    check(await sp.locator("[data-testid=filter-year-2027][class*=bg-primary]").count() === 1, "Store opens on the student's exam year (2027)");
    check(await cardIn("Panadura") === 1, "class listed under its center (Panadura — physical)");
    await go(sp, "/dashboard/store?tab=classes&year=2027&mode=online");
    check(await sp.locator(`text=${tag} 2027 A/L Theory`).count() === 0, "Online filter hides the physical class");
    await go(sp, "/dashboard/store?tab=classes&year=2027&mode=physical");
    check(await cardIn("Panadura") === 1, "Physical filter shows it");
    await go(sp, "/dashboard/store?tab=classes&year=2026&mode=all");
    check(await sp.locator(`text=${tag} 2027 A/L Theory`).count() === 0, "another exam year hides the 2027 class");
    await go(sp, "/dashboard/store?tab=books");
    check(await sp.locator("[data-testid=store-filters]").count() === 0 && await sp.locator("text=/Tute books/").count() > 0, "Tute books tab");
    await go(sp, "/dashboard/payments");
    check(await sp.locator('main a[href^="/dashboard/store"]', { hasText: /Pay class fees/ }).count() > 0, "Payments → Pay class fees goes to the Store");
    await go(sp, "/store?year=2027&mode=physical");
    check(await sp.locator(`text=${tag} 2027 A/L Theory`).count() > 0, "public store uses the same filters");
  }

  // ── Enroll with slip ──
  console.log("Enroll");
  await go(sp, `/dashboard/store/class/${cls.id}`);
  await sp.selectOption("#month", month);
  await sp.setInputFiles('input[type=file]', SLIP);
  await sp.waitForSelector('input[type=hidden][name=slip_url]', { state: "attached", timeout: 15000 });
  await sp.fill("#bank_ref", "REF123");
  await sp.locator("form", { has: sp.locator("#bank_ref") }).locator("button[type=submit]").click(); await sp.waitForTimeout(3000);
  const { data: enr } = await svc.from("enrollments").select("id, status, amount, slip_url").eq("student_id", prof.id).eq("class_id", cls.id).single();
  check(enr?.status === "pending" && Number(enr.amount) === 3500 && enr.slip_url?.startsWith(prof.id), "slip uploaded, enrollment pending with fee");

  // ── Dashboard (Part 6) ──
  console.log("Dashboard");
  await go(sp, "/dashboard");
  const sidText = (await sp.locator("[data-testid=student-id]").innerText()).trim();
  check(/^\d{8}$/.test(sidText) && sidText === prof.student_id, `dashboard shows the 8-digit Student ID (${sidText})`);
  const payCard = sp.locator("[data-testid=payment-delivery]");
  check(await payCard.locator(`text=${tag} 2027 A/L Theory`).count() > 0 && await payCard.locator("text=Pending").count() > 0, "Payment & Delivery shows the pending slip");
  check(await sp.locator("[data-testid=payment-delivery] a[href='/dashboard/store']").count() > 0, "Payment & Delivery has Pay class fees → Store");
  check(await sp.locator(`[data-testid=free-seminars] >> text=${tag} Free Seminar`).count() > 0, "free seminar listed under Upcoming Classes");
  const dashText = await sp.locator("main").innerText();
  check(!/Your streaks|Latest paper result|Support Center|My classes ·/i.test(dashText), "streaks, latest result, My classes card and Support Center removed");
  await shot(sp, "student-dashboard-pending");
  await shot(sp, "student-enroll-submitted");

  // ── Admin approves via UI ──
  console.log("Admin");
  const ap = await newPage(undefined, "en");
  await go(ap, "/login"); await ap.fill("#identifier", ADMIN_EMAIL); await ap.fill("#password", ADMIN_PW);
  await Promise.all([ap.waitForURL(/\/admin/, { timeout: 15000 }), ap.click("button[type=submit]")]); ok("admin login → /admin");
  for (const [name, path] of [["overview", "/admin"], ["payments", "/admin/payments"], ["classes", "/admin/classes"], ["class", `/admin/classes/${cls.id}`], ["new-class", "/admin/classes/new"], ["exams", "/admin/exams"], ["exam", `/admin/exams/${exam.id}`], ["new-exam", "/admin/exams/new"], ["notices", "/admin/notices"], ["students", "/admin/students"], ["store", "/admin/store"], ["owner", "/admin/owner"]]) {
    const st = await go(ap, path); check(st === 200, `${path} → ${st}`);
    const mk = await missingKeys(ap); if (mk.length) bad(`${path} untranslated: ${[...new Set(mk)].join(", ")}`);
    await shot(ap, `admin-${name}`);
  }
  await go(ap, "/admin/students?q=" + encodeURIComponent(mobile)); check(await ap.locator(`text=${prof.student_id}`).count() > 0, "admin finds student by mobile");
  await go(ap, "/admin/payments");
  const card = ap.locator(`text=Ui Tester ${tag}`).first();
  check(await card.count() > 0, "pending slip visible in approval center");
  const row = ap.locator("form", { has: ap.locator('button[value=approved]') }).filter({ has: ap.locator(`input[value="${enr.id}"]`) });
  await row.locator('button[value=approved]').click(); await ap.waitForTimeout(3000);
  const { data: enr2 } = await svc.from("enrollments").select("status, reviewed_by").eq("id", enr.id).single();
  check(enr2.status === "approved" && !!enr2.reviewed_by, "admin approved slip via UI and stamped reviewed_by");
  await go(ap, "/admin/payments");
  check(await ap.locator("[data-testid=receipt-reviewed-by]").count() > 0, "Part 12: reviewed receipt card shows reviewing admin & timestamp");

  // ── Part 12: Owner Console (/admin/owner + tabs) — Activity log, Staff creation ──
  console.log("Owner Console (Part 12)");
  await go(ap, "/admin/owner/activity");
  check(await ap.locator("[data-testid=owner-audit-logs]", { hasText: `Ui Tester ${tag}` }).count() > 0, "Part 12: Owner Console audit log records receipt approval with student details");
  check(await ap.locator("[data-testid=owner-audit-logs]", { hasText: "REF123" }).count() > 0, "Part 12: Owner Console audit log shows bank reference & slip link");
  check(await ap.locator("[data-testid=owner-verification-form]").count() === 0, "Owner Console no longer has the Verification & API keys section");
  await go(ap, "/admin/owner/staff");
  {
    const staffEmail = `staff.${tag.toLowerCase()}@hmmaths.lk`;
    const staffForm = ap.locator("[data-testid=create-staff-form]");
    await staffForm.locator("[name=full_name]").fill(`Staff Admin ${tag}`);
    await staffForm.locator("[name=email]").fill(staffEmail);
    await staffForm.locator("[name=password]").fill("Staff!Pass99");
    await staffForm.locator("[name=role]").selectOption("admin");
    await staffForm.locator("button[type=submit]").click();
    await ap.waitForTimeout(2500);
    const { rows: staffUsers } = await adminDb.query("select id from auth.users where lower(email) = $1", [staffEmail]);
    check(staffUsers.length === 1, "Part 12: Owner created a new Admin staff account from /admin/owner");
    if (staffUsers[0]) {
      cleanup.users.push(staffUsers[0].id);
      // Verify regular admin can open /admin but CANNOT open /admin/owner
      const sap = await newPage(undefined, "en");
      await go(sap, "/login");
      await sap.fill("#identifier", staffEmail);
      await sap.fill("#password", "Staff!Pass99");
      await Promise.all([sap.waitForURL(/\/admin/, { timeout: 15000 }), sap.click("button[type=submit]")]);
      await go(sap, "/admin/owner");
      check(!sap.url().includes("/admin/owner"), "Part 12: regular admin is blocked from /admin/owner");
      await sap.context().close();
    }
    await adminDb.query("delete from public.admin_emails where lower(email) = $1", [staffEmail]);
  }

  // Admin creates a class + lesson through the forms
  await go(ap, "/admin/classes/new");
  await ap.fill("[name=title]", `${tag} UI-made Revision`); await ap.selectOption("[name=class_type]", "Revision");
  await ap.fill("[name=fee]", "2500");
  await Promise.all([ap.waitForURL(/\/admin\/classes\/[0-9a-f-]{36}/, { timeout: 15000 }), ap.locator("form button[type=submit]").last().click()]);
  const newId = ap.url().split("/").pop(); cleanup.classes.push(newId); ok("admin created class via form");
  await ap.fill("[name=title] >> nth=-1", `${tag} Lesson via UI`).catch(() => {});
  const lessonForm = ap.locator("form", { has: ap.locator('[name=week_number]') }).last();
  await lessonForm.locator("[name=title]").fill(`${tag} Lesson via UI`);
  await lessonForm.locator("summary").click(); // recording / tute / notes live in a collapsed "more" section
  await lessonForm.locator("[name=youtube_url]").fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await lessonForm.locator("button[type=submit]").click(); await ap.waitForTimeout(3000);
  const { data: ul } = await svc.from("lessons").select("id").eq("class_id", newId);
  check((ul ?? []).length === 1, "admin added lesson via form");
  await shot(ap, "admin-class-created");

  // Admin publishes a notice via UI
  await go(ap, "/admin/notices");
  await ap.fill("[name=title]", `${tag} UI notice`); await ap.fill("[name=content]", "Paper class moved to Sunday.");
  await ap.locator("form", { has: ap.locator("[name=content]") }).locator("button[type=submit]").click(); await ap.waitForTimeout(2500);
  check((await svc.from("notices").select("id").eq("title", `${tag} UI notice`)).data?.length === 1, "admin published notice via form");

  // Admin adds an event via the form (Part 8) — students see published events, not hidden ones
  await go(ap, "/admin/events");
  const evDay = new Date(Date.now() + 3 * 86400000).toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
  const evForm = ap.locator("form", { has: ap.locator("[name=start_time]") });
  await evForm.locator("[name=title]").fill(`${tag} Paper day`);
  await evForm.locator("[name=date]").fill(evDay); await evForm.locator("[name=start_time]").fill("09:00"); await evForm.locator("[name=end_time]").fill("12:00");
  await evForm.locator("[name=venue]").fill("Panadura hall");
  await evForm.locator("button[type=submit]").click(); await ap.waitForTimeout(2500);
  const { data: evRows } = await svc.from("events").select("id, is_published, starts_at, ends_at").eq("title", `${tag} Paper day`);
  check(evRows?.length === 1 && evRows[0].is_published && new Date(evRows[0].starts_at).toISOString().endsWith("T03:30:00.000Z"), "admin created an event via the form (9:00 SL time)");
  check(await ap.locator(`[data-testid=admin-events] >> text=${tag} Paper day`).count() > 0, "event listed on Admin → Events");

  // ── Student after approval ──
  console.log("Portal (paid)");
  await go(sp, "/dashboard/classes"); check(await sp.locator(`text=${tag} 2027 A/L Theory`).count() > 0, "class unlocked in My Classes");
  await shot(sp, "student-classes-paid");
  // ── My Classes (Part 7): one card per paid month → tap → that month's recordings ──
  {
    const card = sp.locator("[data-testid=class-month-card]", { hasText: `${tag} 2027 A/L Theory` });
    check(await card.count() === 1, "one card for the paid month");
    check(await card.locator("text=1 recording").count() > 0, "card shows the month's recording count");
    check(await card.locator("[data-testid=join-live]").count() === 1, "card shows Live now · Join during the join window");
    const pageText = await sp.locator("main").innerText();
    check(!/Learning Hub|Pay Fees|Upcoming live sessions/i.test(pageText), "Learning Hub tabs, Pay Fees and the live-sessions tab removed");
    check(await sp.locator('main img[src="/stickers/binders.webp"]').count() > 0, "the duck animation is still on My Classes");
    await card.locator("h3 a").click();
    await sp.waitForURL((u) => u.pathname === `/dashboard/classes/${cls.id}` && u.searchParams.get("month") === month, { timeout: 15000 })
      .then(() => ok("tapping the card opens that month's classroom"), () => bad(`card tap went to ${sp.url()}`));
    const seen = (sel) => sp.locator(sel).first().waitFor({ timeout: 15000 }).then(() => true, () => false); // the URL changes before the new page has rendered
    check(await seen("#recordings") && await seen(`text=${tag} Functions — intro`), "classroom lists the month's recordings");
    await sp.locator("[data-testid=classroom-back]").click();
    await sp.waitForURL((u) => u.pathname === "/dashboard/classes", { timeout: 10000 }).then(() => ok("classroom Back → My Classes"), () => bad("classroom Back did not return to My Classes"));
    await sp.locator("[data-testid=join-live]").first().click();
    await sp.waitForURL((u) => u.pathname === `/dashboard/classes/${cls.id}`, { timeout: 15000 });
    check(await seen("#live"), "Join opens the classroom's live section");
  }
  await go(sp, `/dashboard/classes/${cls.id}`); await shot(sp, "student-classroom");
  check(await sp.locator(`text=${tag} Functions — intro`).count() > 0, "recording listed in classroom");
  check(await sp.locator("text=/Join opens|Class starts in|Starting in|Join Live|Join on/").count() > 0, "live session countdown shown");
  const { data: les } = await svc.from("lessons").select("id").eq("class_id", cls.id).eq("week_number", 1).single();
  await go(sp, `/dashboard/classes/${cls.id}/lessons/${les.id}`); await sp.waitForTimeout(1000); await shot(sp, "student-lesson");
  check(await sp.locator("iframe[src*='youtube']").count() > 0 || await sp.locator("[data-video]").count() > 0 || await sp.locator("text=watermarked").count() > 0, "lesson player rendered");
  await go(sp, "/dashboard/notifications"); check(await sp.locator(`text=${tag} UI notice`).count() > 0, "admin UI notice reaches student");
  await go(sp, "/dashboard/events"); check(await sp.locator(`text=${tag} Paper day`).count() > 0, "published event shows on the student's Events page");
  await go(ap, "/admin/events");
  await ap.locator("[data-testid=admin-events] > div", { hasText: `${tag} Paper day` }).locator("button", { hasText: "Hide" }).click(); await ap.waitForTimeout(2000);
  await go(sp, "/dashboard/events"); check(await sp.locator(`text=${tag} Paper day`).count() === 0, "hidden event disappears for students");
  await svc.from("events").delete().like("title", `${tag}%`);

  // Client-side navigation: every tab/sidebar link switches page and keeps its icon visible. Animated
  // stickers are ON here: the old bug left an icon blank (fallback image hidden, animation gone) after its tab
  // stopped being the active one, which can only happen when animations actually load.
  console.log("Navigation");
  const iconsVisible = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(`${s} a`)].filter((a) => {
    const img = a.querySelector('img[src^="/stickers/"]');
    return img && img.offsetParent && getComputedStyle(img).opacity === "0" && !a.querySelector("svg");
  }).length, sel);
  for (const [label, vp, sel] of [["desktop sidebar", { width: 1366, height: 860 }, "aside nav"], ["mobile tab bar", { width: 390, height: 844 }, "nav.fixed"]]) {
    const np = await newPage(vp, "en", { stickers: true }); await np.context().addCookies(await sp.context().cookies());
    await go(np, "/dashboard");
    const hrefs = await np.$$eval(`${sel} a[href^="/dashboard"]`, (as) => [...new Set(as.filter((a) => a.offsetParent).map((a) => a.getAttribute("href")))]);
    check(hrefs.length >= 4, `${label}: ${hrefs.length} links found`);
    for (const h of [...hrefs, ...hrefs.slice().reverse()]) {
      await np.click(`${sel} a[href="${h}"]`);
      await np.waitForURL((u) => u.pathname === h, { timeout: 10000 }).then(() => ok(`${label} → ${h}`), () => bad(`${label}: click ${h} did not navigate (at ${np.url()})`));
      await np.waitForTimeout(1200); // time for the active tab's animation to load
      const hidden = await iconsVisible(np, sel); if (hidden) bad(`${label} at ${h}: ${hidden} icon(s) blank`);
    }
    await np.context().close();
  }

  // MCQ
  console.log("MCQ");
  await go(sp, `/dashboard/exams/${exam.id}`); await shot(sp, "student-exam-intro");
  await sp.getByRole("button", { name: /Start paper/ }).click();
  await sp.waitForSelector("text=2 + 2 = ?", { timeout: 15000 });
  await sp.getByRole("button", { name: /^\s*B?\s*4\s*$/ }).first().click().catch(async () => { await sp.locator("button", { hasText: "4" }).first().click(); });
  await shot(sp, "student-exam-running", false);
  await sp.getByRole("button", { name: /^Next$/ }).click();
  await sp.locator("button", { hasText: "2x" }).first().click();
  await sp.getByRole("button", { name: /Submit paper/ }).first().click();
  await sp.waitForTimeout(3500); await shot(sp, "student-exam-done");
  const { data: sub } = await svc.from("exam_submissions").select("score, total_marks").eq("exam_id", exam.id).eq("student_id", prof.id).single();
  check(Number(sub?.score) === 2 && Number(sub?.total_marks) === 2, `MCQ scored server-side ${sub?.score}/${sub?.total_marks}`);
  check((await go(sp, `/dashboard/exams/${exam.id}/review`)) === 200 && (await sp.locator("text=2x").count()) > 0, "review page"); await shot(sp, "student-review");
  check((await go(sp, `/dashboard/exams/${exam.id}/leaderboard`)) === 200 && (await sp.locator(`text=${prof.student_id}`).count() + await sp.locator("text=(you)").count()) > 0, "leaderboard shows me"); await shot(sp, "student-leaderboard");
  await go(sp, "/dashboard"); await shot(sp, "student-dashboard-paid");
  check(await sp.locator("[data-testid=payment-delivery] >> text=Approved").count() > 0, "Payment & Delivery shows the approved slip");
  await go(sp, "/dashboard/payments"); check(await sp.locator("text=REF123").count() > 0, "payment history lists slip"); await shot(sp, "student-payments");

  // Profile update + QR code (Part 10)
  await go(sp, "/dashboard/profile");
  check(await sp.locator("[data-testid=my-qr] [role=img] svg").count() === 1, "My Profile shows the student's QR code");
  check(await sp.locator("[data-testid=my-qr]", { hasText: "2nd attempt · 2027 A/L" }).count() === 1, "QR card prints name, Student ID, attempt & exam year");
  check(await sp.locator("input[name=current]").count() === 0 && await sp.locator("#google").count() === 0 && await sp.locator("#id").count() === 0, "Change password, Google connect and My Student ID card removed from profile");
  await sp.fill("[name=school]", "Ananda College");
  await sp.fill("[name=guardian_mobile]", "0771122334");
  await sp.locator("form", { has: sp.locator("[name=school]") }).locator("button[type=submit]").click(); await sp.waitForTimeout(2500);
  const { data: pAfter } = await svc.from("profiles").select("school, guardian_mobile").eq("id", prof.id).single();
  check(pAfter.school === "Ananda College" && pAfter.guardian_mobile === "0771122334", "profile updated (school, guardian mobile)");

  // Sinhala portal + mobile
  // ── Papers & Marks + Leaderboard + Premium (Part 9) ──
  console.log("Papers & Premium");
  {
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
    const mateMobile = "07" + String(Date.now() + 9).slice(-8);
    const [mate] = (await adminDb.query(`insert into auth.users (email, encrypted_password, raw_user_meta_data) values ($1,'x',$2) returning id`,
      [`${mateMobile}@students.hmmaths.lk`, JSON.stringify({ full_name: `Rank Mate ${tag}`, mobile: mateMobile, nic: `M${tag}`, al_year: "2027", town: "Panadura" })])).rows;
    cleanup.users.push(mate.id);
    const marks = [45, 40, 42]; // 90 %, 80 %, 84 % → Premium; the classmate gets 60 % on each
    for (let i = 0; i < 3; i++) {
      const { data: pp } = await svc.from("papers").insert({ title: `${tag} Week ${i + 1}`, paper_date: today, total_marks: 50, al_year: 2027, paper_type: "weekly" }).select("id").single();
      await svc.from("paper_marks").insert([{ paper_id: pp.id, student_id: prof.id, marks: marks[i] }, { paper_id: pp.id, student_id: mate.id, marks: 30 }]);
    }
    await go(sp, "/dashboard/leaderboard");
    const rowOf = (name) => sp.locator("[data-testid=board-row], .grid-cols-3 > div", { hasText: name }).first();
    const meRow = rowOf(`Ui Tester ${tag}`);
    check(await meRow.locator("[data-testid=premium-mark]").count() > 0, "leaderboard shows Premium ✓ next to the student");
    check(await meRow.locator("text=(2nd attempt)").count() > 0, "repeat student marked (2nd attempt)");
    const mateRow = rowOf(`Rank Mate ${tag}`);
    check(await mateRow.count() > 0 && await mateRow.locator("[data-testid=premium-mark]").count() === 0, "no badge for a student below the rules");
    check(await sp.locator("[data-testid=repeat-note]").count() === 1, "repeat-student note on the leaderboard");
    await shot(sp, "student-leaderboard-premium");
    await go(sp, "/dashboard/papers");
    check(await sp.locator("[data-testid=premium-card] >> text=Verified").count() > 0, "Papers & Marks: Premium Verified card is active");
    check(await sp.locator("[data-testid=paper-ranks]", { hasText: "#1 of 2 all-island" }).count() === 3, "each paper shows all-island rank (#1 of 2)");
    check(await sp.locator("[data-testid=paper-ranks]", { hasText: "Panadura" }).count() === 3, "each paper shows the center rank");
    await shot(sp, "student-papers-premium");
    await go(sp, "/dashboard");
    check(await sp.locator("main [data-testid=premium-mark]").count() > 0, "dashboard shows Premium ✓ by the student's name");

    // ── Admin Attendance & QR Scanner (Part 10) ──
    console.log("Attendance & QR Scanner");
    await go(ap, "/admin");
    check(await ap.locator("[data-testid=topbar-qr-scanner]").count() === 1, "Admin top bar has the quick-access QR Scanner button");
    await go(ap, "/admin/attendance");
    await ap.fill("[data-testid=scanner-manual]", prof.student_id);
    await ap.locator("form", { has: ap.locator("[data-testid=scanner-manual]") }).locator("button[type=submit]").click();
    await ap.waitForSelector("[data-testid=scan-checked-in]", { timeout: 10000 });
    check(await ap.locator("[data-testid=scan-name]", { hasText: `Ui Tester ${tag}` }).count() === 1, "Attendance scan displays student details & recent paper marks");
    await shot(ap, "admin-attendance-scanned");
  }

  console.log("Sinhala + mobile");
  await sp.context().addCookies([{ name: "hm_locale", value: "si", url: BASE }]);
  for (const [name, path] of [["dashboard", "/dashboard"], ["classes", "/dashboard/classes"], ["payments", "/dashboard/payments"], ["exams", "/dashboard/exams"], ["profile", "/dashboard/profile"]]) {
    await go(sp, path); const mk = await missingKeys(sp); if (mk.length) bad(`si ${path} untranslated: ${[...new Set(mk)].join(", ")}`); await shot(sp, `si-student-${name}`);
  }
  check(await sp.locator("text=පුවරුව").count() > 0, "Sinhala UI active");
  await go(ap, "/admin"); await ap.context().addCookies([{ name: "hm_locale", value: "si", url: BASE }]); await go(ap, "/admin/payments"); await shot(ap, "si-admin-payments");
  const mp = await newPage({ width: 390, height: 844 });
  await mp.context().addCookies(await sp.context().cookies());
  await mp.context().addCookies([{ name: "hm_locale", value: "en", url: BASE }]);
  for (const [name, path] of [["dashboard", "/dashboard"], ["classes", "/dashboard/classes"], ["classroom", `/dashboard/classes/${cls.id}`], ["payments", "/dashboard/payments"], ["exams", "/dashboard/exams"]]) { await go(mp, path); await shot(mp, `mobile-student-${name}`); }
  const ma = await newPage({ width: 390, height: 844 }); await ma.context().addCookies(await ap.context().cookies()); await ma.context().addCookies([{ name: "hm_locale", value: "en", url: BASE }]);
  await go(ma, "/admin"); await shot(ma, "mobile-admin-overview"); await go(ma, "/admin/payments"); await shot(ma, "mobile-admin-payments");

  // Logout
  await go(sp, "/dashboard"); await sp.context().clearCookies(); check((await go(sp, "/dashboard")) && sp.url().includes("/login"), "signed-out user redirected to login");
} catch (e) {
  bad("CRASH: " + (e?.stack ?? e));
} finally {
  for (const id of cleanup.classes) await svc.from("classes").delete().eq("id", id);
  await svc.from("notices").delete().like("title", `${tag}%`);
  await svc.from("papers").delete().like("title", `${tag}%`);
  for (const id of cleanup.users) {
    rmSync(path.join(STORAGE_DIR, "bank-slips", id), { recursive: true, force: true });
    await adminDb.query("delete from auth.users where id = $1", [id]);
  }
  await adminDb.query("delete from public.admin_audit_logs where target_label ilike $1 or item_label ilike $1", [`%${tag}%`]).catch(() => {});
  await browser.close();
  await adminDb.end();
}
const uniqErr = [...new Set(consoleErrors)];
if (uniqErr.length) { console.log("\nBrowser console errors:"); uniqErr.slice(0, 30).forEach((e) => console.log("  -", e)); }
console.log(`\n${pass} passed, ${problems.length} failed.${SHOTS ? ` Screenshots: ${SHOTS}` : ""}`);
process.exit(problems.length ? 1 : 0);
