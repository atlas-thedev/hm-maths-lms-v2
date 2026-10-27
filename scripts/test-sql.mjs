// Offline test of db/migrations/*.sql using PGlite (real Postgres in WASM).
// Stubs the minimum of the auth + storage schemas (the real ones come from deploy/00_bootstrap.sql), then exercises RLS as real roles.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const db = new PGlite();
const sql = readFileSync(new URL("../db/migrations/0001_init.sql", import.meta.url), "utf8");

await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
  alter table storage.objects enable row level security;
  grant usage on schema auth, storage to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  grant select, insert, update, delete on storage.objects to authenticated;
  grant select on storage.objects to anon;
`);
const sql2 = readFileSync(new URL("../db/migrations/0002_class_schedule.sql", import.meta.url), "utf8");
await db.exec(sql);
await db.exec(sql); // idempotency check: must be re-runnable
// 0002 must move existing lessons.live_url values into lesson_live_links
await db.exec(`insert into public.classes (id, title) values ('00000000-0000-0000-0000-0000000000c0','tmp');
  insert into public.lessons (id, class_id, month, title, live_url) values ('00000000-0000-0000-0000-0000000000d0','00000000-0000-0000-0000-0000000000c0','2026-01','tmp','https://zoom.us/j/1');`);
await db.exec(sql2);
await db.exec(sql2);
const sql3 = readFileSync(new URL("../db/migrations/0003_papers_leaderboards.sql", import.meta.url), "utf8");
await db.exec(sql3);
await db.exec(sql3);
const sql4 = readFileSync(new URL("../db/migrations/0004_performance_streaks.sql", import.meta.url), "utf8");
await db.exec(sql4);
await db.exec(sql4);
const sql5w = readFileSync(new URL("../db/migrations/0005_enrollment_withdraw.sql", import.meta.url), "utf8");
await db.exec(sql5w);
const sql5 = readFileSync(new URL("../db/migrations/0006_security_hardening.sql", import.meta.url), "utf8");
await db.exec(sql5);
await db.exec(sql5);
const sql7 = readFileSync(new URL("../db/migrations/0007_google_identities.sql", import.meta.url), "utf8");
await db.exec(sql7);
await db.exec(sql7);
const sql8 = readFileSync(new URL("../db/migrations/0008_exam_integrity_privacy.sql", import.meta.url), "utf8");
await db.exec(sql8);
await db.exec(sql8);
// 0009 converts existing "HM-MATHS-YYYY-NNNN" IDs: seed one before applying it.
const OLD = "00000000-0000-0000-0000-0000000000e1";
await db.exec(`insert into auth.users values ('${OLD}','0700000000@students.hmmaths.lk','{"full_name":"Old Student","mobile":"0700000000","al_year":"2026"}');
  update public.profiles set student_id='HM-MATHS-2026-4321' where id='${OLD}';`);
const sql9 = readFileSync(new URL("../db/migrations/0009_data_foundations.sql", import.meta.url), "utf8");
await db.exec(sql9);
await db.exec(sql9);
const [old] = (await db.query(`select student_id, attempt from public.profiles where id='${OLD}'`)).rows;
assert.equal(old.student_id, "20264321"); assert.equal(old.attempt, 1);
await db.exec(`delete from auth.users where id='${OLD}'; delete from public.profiles where id='${OLD}';`);
console.log("✓ 0009: old Student IDs converted to 8 digits (keeps year + digits), attempt defaults to 1st");
const sql10 = readFileSync(new URL("../db/migrations/0010_notifications_bell.sql", import.meta.url), "utf8");
await db.exec(sql10);
await db.exec(sql10);
const sql11 = readFileSync(new URL("../db/migrations/0011_notify_cash_grants.sql", import.meta.url), "utf8");
await db.exec(sql11);
await db.exec(sql11);
const sql12 = readFileSync(new URL("../db/migrations/0012_premium_ranks.sql", import.meta.url), "utf8");
await db.exec(sql12);
await db.exec(sql12);
const sql13 = readFileSync(new URL("../db/migrations/0013_profile_reset_attendance.sql", import.meta.url), "utf8");
await db.exec(sql13);
await db.exec(sql13);
const sql14 = readFileSync(new URL("../db/migrations/0014_owner_audit_settings.sql", import.meta.url), "utf8");
await db.exec(sql14);
await db.exec(sql14);
const sql15 = readFileSync(new URL("../db/migrations/0015_owner_only_structure.sql", import.meta.url), "utf8");
await db.exec(sql15);
await db.exec(sql15);
const sql16 = readFileSync(new URL("../db/migrations/0016_developer_role.sql", import.meta.url), "utf8");
await db.exec(sql16);
await db.exec(sql16);
const sql17 = readFileSync(new URL("../db/migrations/0017_video_events.sql", import.meta.url), "utf8");
await db.exec(sql17);
await db.exec(sql17);
const sql18 = readFileSync(new URL("../db/migrations/0018_gallery.sql", import.meta.url), "utf8");
await db.exec(sql18);
await db.exec(sql18);
const sql19 = readFileSync(new URL("../db/migrations/0019_open_centers.sql", import.meta.url), "utf8");
await db.exec(sql19);
await db.exec(sql19);
const sql20 = readFileSync(new URL("../db/migrations/0020_class_banner_templates.sql", import.meta.url), "utf8");
await db.exec(sql20);
await db.exec(sql20);
const allMigrations = [sql, sql2, sql3, sql4, sql5w, sql5, sql7, sql8, sql9, sql10, sql11, sql12, sql13, sql14, sql15, sql16, sql17, sql18, sql19, sql20];
assert.equal((await db.query(`select live_url from public.lesson_live_links where lesson_id='00000000-0000-0000-0000-0000000000d0'`)).rows[0].live_url, "https://zoom.us/j/1");
assert.equal((await db.query(`select 1 from information_schema.columns where table_name='lessons' and column_name='live_url'`)).rows.length, 0);
await db.exec(`delete from public.classes where id='00000000-0000-0000-0000-0000000000c0'`);
console.log("✓ migrations 0001 – 0008 applied twice (idempotent), live links moved");

const ADMIN = "00000000-0000-0000-0000-00000000000a";
const OWNER = "00000000-0000-0000-0000-00000000000b";
const S1 = "00000000-0000-0000-0000-000000000001";
const S2 = "00000000-0000-0000-0000-000000000002";

async function as(uid, fn) {
  await db.exec(uid ? `set role authenticated; set request.jwt.claim.sub = '${uid}';`
                    : `set role anon; set request.jwt.claim.sub = '';`);
  try { return await fn(); } finally { await db.exec(`reset role; set request.jwt.claim.sub = '';`); }
}
const q = async (text, params) => (await db.query(text, params)).rows;
async function fails(promise, label) {
  try { await promise; } catch { console.log(`✓ blocked: ${label}`); return; }
  throw new Error(`expected failure: ${label}`);
}

// ---- signup trigger
await q(`insert into auth.users values ($1,'admin@nativelaunch.xyz','{"full_name":"Hasitha Madusanka"}')`, [ADMIN]);
await q(`insert into auth.users values ($1,'0771234567@students.hmmaths.lk',$2)`, [S1, JSON.stringify({ full_name: "Kasun Perera", mobile: "0771234567", nic: "200512345678", al_year: "2027", town: "Panadura", school: "Royal College", district: "Kalutara", address: "12 Galle Rd", city: "Panadura", postal_code: "12500" })]);
await q(`insert into auth.users values ($1,'0711111111@students.hmmaths.lk',$2)`, [S2, JSON.stringify({ full_name: "Nimali Silva", mobile: "0711111111", nic: "200698765432v", al_year: "2026", attempt: "2", whatsapp: "0712222222", guardian_mobile: "0713333333", town: "Horana" })]);
const [s2p] = await q(`select attempt, whatsapp, guardian_mobile from public.profiles where id=$1`, [S2]);
assert.deepEqual(s2p, { attempt: 2, whatsapp: "0712222222", guardian_mobile: "0713333333" });
console.log("✓ sign-up stores attempt, WhatsApp and guardian numbers");
await q(`insert into auth.users values ($1,'owner@hmmaths.lk','{"full_name":"Sir Hasitha"}')`, [OWNER]);
await q(`update public.profiles set role='owner', student_id=null where id=$1`, [OWNER]);
const profs = (await q(`select id, role, student_id, nic from public.profiles order by id`)).filter((p) => p.id !== OWNER);
assert.equal(profs.find(p => p.id === ADMIN).role, "admin");
assert.equal(profs.find(p => p.id === ADMIN).student_id, null);
assert.match(profs.find(p => p.id === S1).student_id, /^2027\d{4}$/);
assert.equal(profs.find(p => p.id === S2).nic, "200698765432V");
console.log("✓ profiles + student IDs:", profs.map(p => p.student_id ?? "admin").join(", "));

// ---- duplicate mobile rejected
await fails(q(`insert into auth.users values (gen_random_uuid(),'x@y.z','{"full_name":"Dup","mobile":"0771234567"}')`), "duplicate mobile number");
await fails(as(S1, () => q(`select * from public.used_captchas`)), "students reading captcha store");
await fails(as(S1, () => q(`insert into storage.objects (bucket_id, name) values ('bank-slips', $1)`, [`${S1}/evil.svg`])), "uploading an .svg bank slip");
await fails(as(S1, () => q(`insert into storage.objects (bucket_id, name) values ('bank-slips', $1)`, [`${S1}/x.html`])), "uploading an .html bank slip");
await fails(as(null, () => q(`select public.start_exam('00000000-0000-0000-0000-000000000000')`)), "anon calling exam RPCs");

// ---- privilege escalation blocked
await as(S1, () => q(`update public.profiles set role='admin', student_id='HACK', full_name='Kasun P.' where id=$1`, [S1]));
const [s1] = await q(`select role, student_id, full_name from public.profiles where id=$1`, [S1]);
assert.equal(s1.role, "student"); assert.notEqual(s1.student_id, "HACK"); assert.equal(s1.full_name, "Kasun P.");
console.log("✓ student cannot self-promote (name edit allowed)");
assert.equal((await as(S1, () => q(`select * from public.profiles`))).length, 1);
console.log("✓ student sees only own profile");

// ---- admin creates content
const [paid] = await as(OWNER, () => q(`insert into public.classes (title, class_type, target_year, fee, town) values ('2027 A/L Theory - Panadura','Theory',2027,3000,'Panadura') returning id`));
const [free] = await as(OWNER, () => q(`insert into public.classes (title, class_type, fee, is_free) values ('Free Seminar','Free Seminar',0,true) returning id`));
await as(OWNER, () => q(`insert into public.lessons (class_id, month, week_number, title, youtube_url) values ($1,'2026-10',1,'Differentiation','https://youtu.be/abc'),($1,'2026-11',1,'Integration','https://youtu.be/def'),($2,'2026-10',1,'Orientation','https://youtu.be/free')`, [paid.id, free.id]));
await fails(as(S1, () => q(`insert into public.classes (title) values ('hack')`)), "student creating a class");
console.log("✓ admin CRUD on classes/lessons");

// ---- anon storefront
assert.equal((await as(null, () => q(`select * from public.classes`))).length, 2);
await fails(as(null, () => q(`select * from public.lessons`)), "anon reading lessons");
console.log("✓ anon can browse classes");

// ---- access before payment
let l = await as(S1, () => q(`select title from public.lessons`));
assert.deepEqual(l.map(x => x.title), ["Orientation"]);
console.log("✓ unpaid student sees only Free Zone lessons");

// ---- enrollment flow
await fails(as(S1, () => q(`insert into public.enrollments (student_id,class_id,month,slip_url) values ($1,$2,'2026-10','someoneelse/x.jpg')`, [S1, paid.id])), "slip path outside own folder");
await fails(as(S1, () => q(`insert into public.enrollments (student_id,class_id,month,slip_url) values ($1,$2,'2026-10',$3)`, [S2, paid.id, `${S1}/x.jpg`])), "enrolling another student");
const [en] = await as(S1, () => q(`insert into public.enrollments (student_id,class_id,month,slip_url,status) values ($1,$2,'2026-10',$3,'pending') returning id, status, amount`, [S1, paid.id, `${S1}/slip.jpg`]));
assert.equal(en.status, "pending"); assert.equal(Number(en.amount), 3000);
await as(S1, () => q(`update public.enrollments set status='approved' where id=$1`, [en.id]));
assert.equal((await q(`select status from public.enrollments where id=$1`, [en.id]))[0].status, "pending");
console.log("✓ student cannot self-approve");
assert.equal((await as(S2, () => q(`select * from public.enrollments`))).length, 0);
await as(ADMIN, () => q(`update public.enrollments set status='approved' where id=$1`, [en.id]));
const [rev] = await q(`select status, reviewed_by, reviewed_at from public.enrollments where id=$1`, [en.id]);
assert.equal(rev.status, "approved"); assert.equal(rev.reviewed_by, ADMIN); assert.ok(rev.reviewed_at);
l = await as(S1, () => q(`select title from public.lessons order by title`));
assert.deepEqual(l.map(x => x.title), ["Differentiation", "Orientation"]);
console.log("✓ approval unlocks exactly the paid month (Oct ✓, Nov locked)");
// resubmission after rejection
const [en2] = await as(S2, () => q(`insert into public.enrollments (student_id,class_id,month,slip_url) values ($1,$2,'2026-10',$3) returning id`, [S2, paid.id, `${S2}/a.jpg`]));
await as(ADMIN, () => q(`update public.enrollments set status='rejected', admin_note='blurry' where id=$1`, [en2.id]));
await as(S2, () => q(`update public.enrollments set slip_url=$2 where id=$1`, [en2.id, `${S2}/b.jpg`]));
const [rs] = await q(`select status, slip_url, admin_note from public.enrollments where id=$1`, [en2.id]);
assert.equal(rs.status, "pending"); assert.equal(rs.admin_note, null);
console.log("✓ rejected slip can be re-uploaded → back to pending");

// ---- storage policies
await as(S1, () => q(`insert into storage.objects (bucket_id,name) values ('bank-slips',$1)`, [`${S1}/slip.jpg`]));
await fails(as(S1, () => q(`insert into storage.objects (bucket_id,name) values ('bank-slips',$1)`, [`${S2}/evil.jpg`])), "upload into another user's slip folder");
await fails(as(S1, () => q(`insert into storage.objects (bucket_id,name) values ('tute-pdfs',$1)`, [`${paid.id}/2026-10/t.pdf`])), "student uploading tutes");
await as(OWNER, () => q(`insert into storage.objects (bucket_id,name) values ('tute-pdfs',$1),('tute-pdfs',$2)`, [`${paid.id}/2026-10/t1.pdf`, `${paid.id}/2026-11/t2.pdf`]));
const tutes = await as(S1, () => q(`select name from storage.objects where bucket_id='tute-pdfs'`));
assert.deepEqual(tutes.map(t => t.name), [`${paid.id}/2026-10/t1.pdf`]);
assert.equal((await as(S2, () => q(`select name from storage.objects where bucket_id='bank-slips'`))).length, 0);
assert.equal((await as(ADMIN, () => q(`select name from storage.objects where bucket_id='bank-slips'`))).length, 1);
console.log("✓ storage: own slips only, tutes per approved month, admin sees all");

// ---- notices filtering
await as(ADMIN, () => q(`insert into public.notices (title,content,tag,class_id,target_year) values ('All','x','General',null,null),('2027 batch','x','Urgent',null,2027),('Paid class','x','Exam Notice',$1,null)`, [paid.id]));
assert.equal((await as(S1, () => q(`select * from public.notices`))).length, 3);
assert.equal((await as(S2, () => q(`select * from public.notices`))).length, 1);
console.log("✓ notices filtered by class + batch");

// ---- MCQ exam
const [exam] = await as(ADMIN, () => q(`insert into public.exams (class_id,title,duration_minutes,is_published) values ($1,'Unit test 1',30,true) returning id`, [paid.id]));
const qs = await as(ADMIN, () => q(`insert into public.exam_questions (exam_id,question_text,options_json,correct_answer,sort_order) values ($1,'1+1','["1","2","3","4"]',1,1),($1,'d/dx x^2','["x","2x","x^2","2"]',1,2),($1,'∫1 dx','["x+C","1","0","C"]',0,3) returning id`, [exam.id]));
assert.equal((await q(`select total_questions from public.exams where id=$1`, [exam.id]))[0].total_questions, 3);
await fails(as(S1, () => q(`select correct_answer from public.exam_questions`)).then(r => { if (r.length === 0) throw new Error("empty"); }), "student reading answer key");
await fails(as(S2, () => q(`select public.start_exam($1)`, [exam.id])), "unenrolled student starting exam");
const [{ start_exam: started }] = await as(S1, () => q(`select public.start_exam($1)`, [exam.id]));
assert.equal(started.questions.length, 3);
assert.ok(!("correct_answer" in started.questions[0]));
console.log("✓ start_exam returns questions without answers");
await fails(as(S1, () => q(`select public.get_exam_review($1)`, [exam.id])), "review before submitting");
const answers = { [qs[0].id]: 1, [qs[1].id]: 0, [qs[2].id]: 0 };
const [{ submit_mcq: res }] = await as(S1, () => q(`select public.submit_mcq($1,$2)`, [exam.id, JSON.stringify(answers)]));
assert.equal(Number(res.score), 2); assert.equal(Number(res.total), 3);
const [{ submit_mcq: again }] = await as(S1, () => q(`select public.submit_mcq($1,$2)`, [exam.id, JSON.stringify({ [qs[1].id]: 1 })]));
assert.equal(again.already_submitted, true);
console.log("✓ server-side scoring 2/3, resubmission blocked");
const [{ get_exam_review: review }] = await as(S1, () => q(`select public.get_exam_review($1)`, [exam.id]));
assert.equal(review.questions[1].your_answer, 0); assert.equal(review.questions[1].correct_answer, 1);
const lb = await as(S1, () => q(`select * from public.get_leaderboard($1)`, [exam.id]));
assert.equal(lb.length, 1); assert.equal(lb[0].is_me, true); assert.equal(Number(lb[0].rank), 1);
await as(S1, () => q(`update public.exam_submissions set score=100 where exam_id=$1`, [exam.id]));
assert.equal(Number((await q(`select score from public.exam_submissions where exam_id=$1`, [exam.id]))[0].score), 2);
console.log("✓ review mode, leaderboard, score tampering blocked");

// ---- structured exam
const [sx] = await as(ADMIN, () => q(`insert into public.exams (class_id,title,exam_type,is_published) values ($1,'Paper 1','structured',true) returning id`, [paid.id]));
await fails(as(S1, () => q(`select public.submit_structured($1,$2)`, [sx.id, [`${S2}/x.jpg`]])), "structured upload with foreign path");
await as(S1, () => q(`select public.submit_structured($1,$2)`, [sx.id, [`${S1}/p1.jpg`, `${S1}/p2.jpg`]]));
await as(ADMIN, () => q(`update public.exam_submissions set score=78, total_marks=100, status='graded' where exam_id=$1`, [sx.id]));
const lb2 = await as(S1, () => q(`select * from public.get_leaderboard($1)`, [sx.id]));
assert.equal(Number(lb2[0].score), 78);
console.log("✓ structured upload + admin grading");

// ---- orders
const [prod] = await as(OWNER, () => q(`insert into public.products (title,price) values ('Integration tute book',1500) returning id`));
const [ord] = await as(S1, () => q(`insert into public.orders (student_id,product_id,quantity,delivery_address,slip_url,status) values ($1,$2,2,'Panadura',$3,'shipped') returning status, amount`, [S1, prod.id, `${S1}/o.jpg`]));
assert.equal(ord.status, "pending"); assert.equal(Number(ord.amount), 3000);
await as(S1, () => q(`update public.orders set status='approved'`));
assert.equal((await q(`select status from public.orders`))[0].status, "pending");
console.log("✓ tute book orders");
const [oldProd] = await as(OWNER, () => q(`insert into public.products (title,price,is_active) values ('Old book',900,false) returning id`));
await fails(as(S1, () => q(`insert into public.orders (student_id,product_id,quantity,delivery_address,slip_url) values ($1,$2,1,'Panadura road 1',$3)`, [S1, oldProd.id, `${S1}/o2.jpg`])), "ordering an inactive product");

// ---- 0002: weekly timetable, session generator, private live links
await as(OWNER, () => q(`update public.classes set schedule_days='{3}', start_time='16:00', duration_minutes=120 where id=$1`, [paid.id]));
await as(OWNER, () => q(`insert into public.class_live_defaults (class_id, live_url) values ($1,'https://youtube.com/live/abcdefghijk')`, [paid.id]));
await fails(as(S1, () => q(`select public.generate_class_sessions($1,'2026-10','Theory')`, [paid.id])), "student generating sessions");
const [gen] = await as(OWNER, () => q(`select public.generate_class_sessions($1,'2026-10','Theory') as n`, [paid.id]));
assert.equal(gen.n, 4); // Wednesdays in Oct 2026: 7, 14, 21, 28
const [gen2] = await as(OWNER, () => q(`select public.generate_class_sessions($1,'2026-10','Theory') as n`, [paid.id]));
assert.equal(gen2.n, 0);
const sess = await q(`select l.title, l.week_number, l.live_start_time, k.live_url from public.lessons l join public.lesson_live_links k on k.lesson_id=l.id where l.class_id=$1 order by l.live_start_time`, [paid.id]);
assert.equal(sess.length, 4);
assert.equal(new Date(sess[0].live_start_time).toISOString(), "2026-10-07T10:30:00.000Z"); // 4:00 PM Colombo
assert.equal(sess[0].week_number, 1); assert.equal(sess[3].week_number, 4);
assert.match(sess[0].title, /^Theory · Wed 07 Oct$/);
console.log("✓ generator: 4 Wednesday sessions at 4:00 PM SL time, idempotent, default link copied");

await fails(as(S1, () => q(`insert into public.class_live_defaults (class_id, live_url) values ($1,'https://x.y')`, [free.id])), "student writing default links");
assert.equal((await as(S1, () => q(`select * from public.class_live_defaults`))).length, 0);
assert.equal((await as(S1, () => q(`select * from public.lesson_live_links`))).length, 0); // all generated sessions are far away
const mk = async (mins, extra = {}) => {
  const [r] = await as(OWNER, () => q(`insert into public.lessons (class_id, month, title, live_start_time, session_type, is_cancelled) values ($1,'2026-10','Extra', now() + make_interval(mins => $2), 'extra', $3) returning id`, [paid.id, mins, extra.cancelled ?? false]));
  await as(OWNER, () => q(`insert into public.lesson_live_links values ($1,'https://zoom.us/j/999')`, [r.id]));
  return r.id;
};
const soon = await mk(10), later = await mk(120), cancelled = await mk(5, { cancelled: true }), running = await mk(-100);
const vis = (await as(S1, () => q(`select lesson_id from public.lesson_live_links`))).map((r) => r.lesson_id).sort();
assert.deepEqual(vis, [soon, running].sort());
assert.equal((await as(S2, () => q(`select * from public.lesson_live_links`))).length, 0);
assert.equal((await as(S1, () => q(`select * from public.lessons where id=$1`, [later]))).length, 1); // lesson visible, link hidden
try { await as(S1, () => q(`update public.lesson_live_links set live_url='https://evil.example' where lesson_id=$1`, [soon])); } catch { /* blocked */ }
assert.equal((await q(`select live_url from public.lesson_live_links where lesson_id=$1`, [soon]))[0].live_url, "https://zoom.us/j/999");
assert.ok(cancelled);
console.log("✓ live link readable only inside the join window, by paid students, not when cancelled");

// ---- 0003: address, papers, marks, leaderboards, streaks
const [addr] = await q(`select address, city, postal_code from public.profiles where id=$1`, [S1]);
assert.deepEqual(addr, { address: "12 Galle Rd", city: "Panadura", postal_code: "12500" });
await as(S1, () => q(`update public.profiles set address='45 New Rd' where id=$1`, [S1]));
assert.equal((await q(`select address from public.profiles where id=$1`, [S1]))[0].address, "45 New Rd");
console.log("✓ address saved at sign-up and editable by the student");

const S3 = "00000000-0000-0000-0000-000000000003";
await q(`insert into auth.users values ($1,'0722222222@students.hmmaths.lk',$2)`, [S3, JSON.stringify({ full_name: "Amaya Dias", mobile: "0722222222", nic: "200712345678", al_year: "2027", town: "Panadura" })]);
await fails(as(S1, () => q(`insert into public.papers (title) values ('hack')`)), "student creating a paper");
const mkPaper = async (title, date, draft = false) => (await as(ADMIN, () => q(`insert into public.papers (title, paper_date, total_marks, al_year, is_published) values ($1,$2,50,2027,$3) returning id`, [title, date, !draft])))[0].id;
const p1 = await mkPaper("Week 1", "2026-10-04"), p2 = await mkPaper("Week 2", "2026-10-11"), p3 = await mkPaper("Week 3", "2026-10-18"), hidden = await mkPaper("Draft", "2026-10-25", true);
const mark = (p, s, m) => as(ADMIN, () => q(`insert into public.paper_marks (paper_id, student_id, marks) values ($1,$2,$3) on conflict (paper_id, student_id) do update set marks=excluded.marks`, [p, s, m]));
await fails(mark(p1, S1, 51), "marks above the paper total");
await fails(as(S1, () => q(`insert into public.paper_marks (paper_id, student_id, marks) values ($1,$2,50)`, [p1, S1])), "student entering own marks");
await mark(p1, S1, 40); await mark(p1, S2, 45); await mark(p1, S3, 30);
await mark(p2, S1, 48); await mark(p2, S3, 49);
await mark(p3, S1, 35); await mark(p3, S3, 20);
await mark(hidden, S1, 50);
assert.equal((await as(S1, () => q(`select * from public.paper_marks`))).length, 3);
assert.equal((await as(S1, () => q(`select * from public.papers`))).length, 3);
console.log("✓ admin enters marks; students read only their own published marks");

const lbIsland = await as(S1, () => q(`select * from public.get_paper_leaderboard($1)`, [p1]));
assert.deepEqual(lbIsland.map((r) => [Number(r.rank), r.full_name]), [[1, "Nimali Silva"], [2, "Kasun P."], [3, "Amaya Dias"]]);
assert.equal(lbIsland[1].is_me, true); assert.equal(Number(lbIsland[1].pct), 80);
const lbTown = await as(S1, () => q(`select * from public.get_paper_leaderboard($1,'Panadura')`, [p1]));
assert.deepEqual(lbTown.map((r) => Number(r.rank)), [1, 2]); assert.equal(Number(lbTown[0].entrants), 2);
const lbTop1 = await as(S3, () => q(`select * from public.get_paper_leaderboard($1,null,1)`, [p1]));
assert.deepEqual(lbTop1.map((r) => r.is_me), [false, true]);
assert.equal((await as(S1, () => q(`select * from public.get_paper_leaderboard($1)`, [hidden]))).length, 0);
await fails(as(null, () => q(`select * from public.get_paper_leaderboard($1)`, [p1])), "anon reading leaderboards");
console.log("✓ paper leaderboard: all-island, by center (Panadura), own row always included, drafts hidden");

const season = await as(S1, () => q(`select * from public.get_overall_leaderboard(null, 2027)`));
assert.deepEqual(season.map((r) => r.full_name), ["Kasun P.", "Amaya Dias"]);
assert.equal(Number(season[0].points), 80 + 96 + 70); assert.equal(Number(season[0].papers), 3);
const oct = await as(S1, () => q(`select * from public.get_overall_leaderboard(null, null, 'weekly', '2026-10-01', '2026-10-05')`));
assert.equal(oct[0].full_name, "Nimali Silva");
console.log("✓ season leaderboard: points, batch + date filters");

const [{ get_my_paper_stats: st1 }] = await as(S1, () => q(`select public.get_my_paper_stats()`));
assert.equal(st1.papers, 3); assert.equal(st1.streak, 3); assert.equal(st1.best_streak, 3);
assert.deepEqual(st1.streaks, {
  attend: { current: 3, best: 3 }, pass50: { current: 3, best: 3 }, score75: { current: 0, best: 2 },
  top10: { current: 3, best: 3 }, top3: { current: 3, best: 3 }, improve: { current: 0, best: 1 },
});
assert.equal(st1.last.title, "Week 3"); assert.equal(st1.last.rank_island, 1); assert.equal(st1.last.rank_town, 1);
const [{ get_my_paper_stats: st2 }] = await as(S2, () => q(`select public.get_my_paper_stats()`));
assert.equal(st2.papers, 1); assert.equal(st2.streak, 1);
await mark(p3, S3, 0); await as(ADMIN, () => q(`delete from public.paper_marks where paper_id=$1 and student_id=$2`, [p2, S3]));
const [{ get_my_paper_stats: st3 }] = await as(S3, () => q(`select public.get_my_paper_stats()`));
assert.equal(st3.streak, 1); assert.equal(st3.best_streak, 1);
await fails(as(S1, () => q(`select public.get_my_paper_stats($1)`, [S3])), "reading someone else's stats");
console.log("✓ streaks: weekly papers, 50+, 75+, top 10, top 3, improving (a miss resets the run)");

const [{ log_activity: a1 }] = await as(S1, () => q(`select public.log_activity()`));
assert.equal(a1.current, 1); assert.equal(a1.week.length, 7); assert.equal(a1.week[6], true);
await q(`insert into public.student_activity values ($1, (now() at time zone 'Asia/Colombo')::date - 1), ($1, (now() at time zone 'Asia/Colombo')::date - 2), ($1, (now() at time zone 'Asia/Colombo')::date - 5)`, [S1]);
const [{ log_activity: a2 }] = await as(S1, () => q(`select public.log_activity()`));
assert.equal(a2.current, 3); assert.equal(a2.best, 3);
await fails(as(S1, () => q(`insert into public.student_activity values ($1, '2020-01-01')`, [S1])), "faking activity days");
console.log("✓ daily study streak");

await as(ADMIN, () => q(`insert into storage.objects (bucket_id,name) values ('papers',$1),('papers',$2)`, [`${p1}/week1.pdf`, `${hidden}/draft.pdf`]));
await fails(as(S1, () => q(`insert into storage.objects (bucket_id,name) values ('papers',$1)`, [`${p1}/x.pdf`])), "student uploading papers");
assert.deepEqual((await as(S1, () => q(`select name from storage.objects where bucket_id='papers'`))).map((r) => r.name), [`${p1}/week1.pdf`]);
console.log("✓ paper files: admin upload, students download published papers only");

// ---- 0008: exam answers stay hidden until the paper closes; late submissions are not ranked
await as(ADMIN, () => q(`update public.enrollments set status='approved' where id=$1`, [en2.id]));
const [ex2] = await as(ADMIN, () => q(`insert into public.exams (class_id,title,duration_minutes,is_published,closes_at) values ($1,'Unit test 2',30,true, now() + interval '1 day') returning id`, [paid.id]));
const qs2 = await as(ADMIN, () => q(`insert into public.exam_questions (exam_id,question_text,options_json,correct_answer,explanation,sort_order) values ($1,'2+2','["3","4"]',1,'basic',1),($1,'3+3','["6","7"]',0,null,2) returning id`, [ex2.id]));
await as(S1, () => q(`select public.start_exam($1)`, [ex2.id]));
await as(S1, () => q(`select public.submit_mcq($1,$2)`, [ex2.id, JSON.stringify({ [qs2[0].id]: 1, [qs2[1].id]: 1 })]));
let [{ get_exam_review: rv }] = await as(S1, () => q(`select public.get_exam_review($1)`, [ex2.id]));
assert.equal(rv.answers_open, false); assert.equal(Number(rv.score), 1);
assert.ok(rv.questions.every((x) => x.correct_answer === null && x.explanation === null && x.is_correct === null));
assert.equal(rv.questions[0].your_answer, 1);
console.log("✓ review hides the answer key (and per-question right/wrong) while the paper is open");
await as(S2, () => q(`select public.start_exam($1)`, [ex2.id]));
await q(`update public.exam_submissions set started_at = now() - interval '2 hours' where exam_id=$1 and student_id=$2`, [ex2.id, S2]);
const [{ submit_mcq: lateRes }] = await as(S2, () => q(`select public.submit_mcq($1,$2)`, [ex2.id, JSON.stringify({ [qs2[0].id]: 1, [qs2[1].id]: 0 })]));
assert.equal(lateRes.is_late, true);
const lb3 = await as(S1, () => q(`select * from public.get_leaderboard($1)`, [ex2.id]));
assert.equal(lb3.length, 1); assert.equal(lb3[0].is_me, true); assert.ok(lb3[0].student_id);
console.log("✓ late submission not ranked");
await q(`update public.exams set closes_at = now() - interval '1 minute' where id=$1`, [ex2.id]);
[{ get_exam_review: rv }] = await as(S1, () => q(`select public.get_exam_review($1)`, [ex2.id]));
assert.equal(rv.answers_open, true); assert.equal(rv.questions[0].correct_answer, 1); assert.equal(rv.questions[0].explanation, "basic");
assert.deepEqual(rv.questions.map((x) => x.is_correct), [true, false]);
console.log("✓ answer key revealed after the paper closes");

// ---- 0008: leaderboards don't expose other students' Student ID / school
const lbPriv = await as(S1, () => q(`select * from public.get_paper_leaderboard($1)`, [p1]));
for (const r of lbPriv) {
  if (r.is_me) { assert.ok(r.student_code); assert.equal(r.school, "Royal College"); }
  else { assert.equal(r.student_code, null); assert.equal(r.school, null); }
}
const seasonPriv = await as(S1, () => q(`select * from public.get_overall_leaderboard()`));
assert.ok(seasonPriv.filter((r) => !r.is_me).every((r) => r.student_code === null && r.school === null));
const lbAdmin = await as(ADMIN, () => q(`select * from public.get_paper_leaderboard($1)`, [p1]));
assert.ok(lbAdmin.every((r) => r.student_code));
console.log("✓ leaderboards show Student ID + school only for your own row (admins see all)");

// ---- 0009: profile fields, avatars, notifications, events
await as(S1, () => q(`update public.profiles set whatsapp='0779999999', guardian_mobile='0778888888', attempt=3, avatar_path=$2 where id=$1`, [S1, `${S1}/avatar.webp`]));
const [s1x] = await q(`select whatsapp, guardian_mobile, attempt, avatar_path from public.profiles where id=$1`, [S1]);
assert.deepEqual(s1x, { whatsapp: "0779999999", guardian_mobile: "0778888888", attempt: 1, avatar_path: `${S1}/avatar.webp` });
await fails(as(S1, () => q(`update public.profiles set whatsapp='12345' where id=$1`, [S1])), "invalid WhatsApp number");
await fails(as(S1, () => q(`update public.profiles set avatar_path=$2 where id=$1`, [S1, `${S2}/avatar.webp`])), "avatar path in another user's folder");
console.log("✓ student edits WhatsApp / guardian / photo; attempt stays admin-only");
await as(S1, () => q(`insert into storage.objects (bucket_id,name) values ('avatars',$1)`, [`${S1}/avatar.webp`]));
await fails(as(S1, () => q(`insert into storage.objects (bucket_id,name) values ('avatars',$1)`, [`${S2}/avatar.webp`])), "upload into another user's avatar folder");
await fails(as(S1, () => q(`insert into storage.objects (bucket_id,name) values ('avatars',$1)`, [`${S1}/x.svg`])), "svg avatar");
assert.equal((await as(S2, () => q(`select * from storage.objects where bucket_id='avatars'`))).length, 0);
assert.equal((await as(ADMIN, () => q(`select * from storage.objects where bucket_id='avatars'`))).length, 1);
await as(S1, () => q(`delete from storage.objects where bucket_id='avatars' and name=$1`, [`${S1}/avatar.webp`]));
assert.equal((await q(`select * from storage.objects where bucket_id='avatars'`)).length, 0);
console.log("✓ avatars: private, own folder only, owner can replace, admins can view");

await q(`delete from public.notifications`);
const [en3] = await as(S1, () => q(`insert into public.enrollments (student_id,class_id,month,slip_url) values ($1,$2,'2026-11',$3) returning id`, [S1, paid.id, `${S1}/n.jpg`]));
await as(ADMIN, () => q(`update public.enrollments set status='rejected', admin_note='blurry' where id=$1`, [en3.id]));
await as(S1, () => q(`update public.enrollments set slip_url=$2 where id=$1`, [en3.id, `${S1}/n2.jpg`]));
await as(ADMIN, () => q(`update public.enrollments set status='approved' where id=$1`, [en3.id]));
await as(ADMIN, () => q(`update public.orders set status='shipped'`));
let nts = await as(S1, () => q(`select kind, data from public.notifications order by created_at, kind`));
assert.deepEqual(nts.map((n) => n.kind).sort(), ["order_shipped", "payment_approved", "payment_rejected"]);
assert.equal(nts.find((n) => n.kind === "payment_rejected").data.note, "blurry");
assert.equal(nts.find((n) => n.kind === "payment_approved").data.month, "2026-11");
assert.equal((await as(S2, () => q(`select * from public.notifications`))).length, 0);
await fails(as(S1, () => q(`insert into public.notifications (user_id, kind) values ($1,'update')`, [S1])), "student creating notifications");
await as(S1, () => q(`update public.notifications set read_at=now()`));
assert.equal((await q(`select count(1)::int as n from public.notifications where read_at is not null`))[0].n, 0);
const [{ mark_notifications_read: marked }] = await as(S1, () => q(`select public.mark_notifications_read()`));
assert.equal(marked, 3);
await fails(as(S1, () => q(`select public.broadcast_update('x','y')`)), "student broadcasting updates");
const [{ broadcast_update: sent }] = await as(ADMIN, () => q(`select public.broadcast_update('New tutes','Unit 5 tutes uploaded','/dashboard/classes', 2027)`));
assert.equal(sent, 2); // S1 + S3 (2027 batch)
assert.equal((await as(S1, () => q(`select * from public.notifications where read_at is null`))).length, 1);
console.log("✓ notifications: payment approve/reject + tute delivery auto-created, own only, mark read, admin broadcast by batch");

// ---- 0010: bell badge = unread notifications + unseen notices (RLS-filtered)
const unread = async (uid) => (await as(uid, () => q(`select public.unread_notification_count() as n`)))[0].n;
await q(`update public.notices set created_at = now()`);
assert.equal(await unread(S1), 1 + 3); // 1 broadcast + 3 notices S1 can see
assert.equal(await unread(S2), 2);     // "All" + "Paid class" (S2's paid enrollment was approved above)
await as(S1, () => q(`select public.mark_notifications_read()`));
assert.equal(await unread(S1), 0);
assert.ok((await q(`select notices_seen_at from public.profiles where id=$1`, [S1]))[0].notices_seen_at);
assert.equal(await unread(S2), 2);
await as(ADMIN, () => q(`insert into public.notices (title,content,tag) values ('Fresh','x','General')`));
assert.equal(await unread(S1), 1);
console.log("✓ bell: unread count merges notifications + notices, mark-all-read clears both");


await fails(as(S1, () => q(`insert into public.events (title, starts_at) values ('hack', now())`)), "student creating events");
await as(ADMIN, () => q(`insert into public.events (title, starts_at, target_year) values ('Paper day', now() + interval '3 days', 2027), ('2026 seminar', now(), 2026)`));
await as(ADMIN, () => q(`insert into public.events (title, starts_at, is_published) values ('Draft', now(), false)`));
await as(ADMIN, () => q(`insert into public.events (title, starts_at, class_id) values ('Paid class meet', now(), $1)`, [paid.id]));
await fails(as(ADMIN, () => q(`insert into public.events (title, starts_at, ends_at) values ('Bad', now(), now() - interval '1 hour')`)), "event ending before it starts");
assert.deepEqual((await as(S1, () => q(`select title from public.events order by title`))).map((r) => r.title), ["Paid class meet", "Paper day"]);
assert.deepEqual((await as(S3, () => q(`select title from public.events order by title`))).map((r) => r.title), ["Paper day"]);
assert.equal((await as(ADMIN, () => q(`select * from public.events`))).length, 4);
console.log("✓ events: admin-created, students see published ones for their batch / class");

// ---- 0011: a cash grant (admin creates an approved enrollment) notifies the student; student slips don't
await q(`delete from public.notifications where user_id=$1`, [S3]);
await as(ADMIN, () => q(`insert into public.enrollments (student_id,class_id,month,status,admin_note) values ($1,$2,'2026-12','approved','Paid at class (cash)')`, [S3, paid.id]));
const cash = await as(S3, () => q(`select kind, data from public.notifications`));
assert.deepEqual(cash.map((n) => n.kind), ["payment_approved"]); assert.equal(cash[0].data.month, "2026-12");
await as(S3, () => q(`insert into public.enrollments (student_id,class_id,month,slip_url) values ($1,$2,'2027-01',$3)`, [S3, paid.id, `${S3}/c.jpg`]));
assert.equal((await as(S3, () => q(`select * from public.notifications`))).length, 1);
console.log("✓ cash grant notifies the student; a student's own pending slip does not");

// ---- 0012: Premium Verified badge (≥ 3 papers, avg ≥ 75 %, lost below 70 %, back after 3 good papers in a row)
const prem = async (uid) => (await as(uid, () => q(`select public.my_premium_status() as s`)))[0].s;
let ps = await prem(S1); // S1 sat 40/50, 48/50, 35/50 → 80, 96, 70 %
assert.equal(ps.premium, true); assert.equal(ps.papers, 3); assert.equal(Number(ps.avg), 82);
assert.equal((await prem(S2)).premium, false); // one paper only
await fails(as(S2, () => q(`select public.my_premium_status($1)`, [S1])), "reading another student's premium details");
assert.equal((await as(S2, () => q(`select public.is_premium($1) as p`, [S1])))[0].p, true);
await fails(as(S1, () => q(`select public.premium_calc($1)`, [S1])), "calling the internal premium calculation");
const p4 = await mkPaper("Week 4", "2026-11-01"); await mark(p4, S1, 30); // 60 % → badge lost
ps = await prem(S1); assert.equal(ps.premium, false); assert.equal(ps.had_slip, true); assert.equal(ps.since_slip, 0);
const p5 = await mkPaper("Week 5", "2026-11-08"), p6 = await mkPaper("Week 6", "2026-11-15"), p7 = await mkPaper("Week 7", "2026-11-22");
await mark(p5, S1, 45); await mark(p6, S1, 45);
assert.equal((await prem(S1)).premium, false); // only 2 good papers since the slip
await mark(p7, S1, 45);
ps = await prem(S1); assert.equal(ps.premium, true); assert.equal(ps.since_slip, 3);
console.log("✓ premium badge: earned at avg ≥ 75 % (3+ papers), lost below 70 %, back after 3 good papers; details private");

const sb = await as(S2, () => q(`select * from public.season_board(null, 2027)`));
const s1row = sb.find((r) => r.full_name === "Kasun P.");
assert.equal(s1row.premium, true); assert.equal(s1row.attempt, 1); assert.equal(s1row.al_year, 2027); assert.equal(s1row.student_code, null);
await q(`update public.profiles set attempt = 2 where id=$1`, [S3]);
assert.equal((await as(S1, () => q(`select * from public.paper_board($1)`, [p1]))).find((r) => r.full_name === "Amaya Dias").attempt, 2);
await fails(as(null, () => q(`select * from public.season_board()`)), "anon reading the season board");
const ranks = await as(S1, () => q(`select * from public.my_paper_ranks()`));
const r1 = ranks.find((r) => r.paper_id === p1);
assert.deepEqual([r1.rank_island, r1.entrants_island, r1.rank_town, r1.entrants_town].map(Number), [2, 3, 1, 2]);
assert.equal(ranks.some((r) => r.paper_id === hidden), false); // draft paper not listed
console.log("✓ season / paper boards add attempt + batch + premium; my_paper_ranks: island + center rank per paper");

// ---- 0013: recovery_email, password_resets (server-only), attendance (admin writes, student reads own)
await as(S1, () => q(`update public.profiles set recovery_email='kasun@example.com' where id=$1`, [S1]));
assert.equal((await as(S1, () => q(`select recovery_email from public.profiles where id=$1`, [S1])))[0].recovery_email, "kasun@example.com");
await fails(as(S1, () => q(`update public.profiles set recovery_email='not-an-email' where id=$1`, [S1])), "invalid recovery_email format");
await fails(as(S1, () => q(`select * from public.password_resets`)), "student reading password_resets");
await fails(as(ADMIN, () => q(`select * from public.password_resets`)), "admin reading password_resets via PostgREST");
await fails(as(S1, () => q(`insert into public.attendance (student_id) values ($1)`, [S1])), "student marking own attendance");
await as(ADMIN, () => q(`insert into public.attendance (student_id, scanned_by, method) values ($1, $2, 'qr')`, [S1, ADMIN]));
await fails(as(ADMIN, () => q(`insert into public.attendance (student_id, scanned_by, method) values ($1, $2, 'qr')`, [S1, ADMIN])), "duplicate attendance on same day");
assert.equal((await as(S1, () => q(`select * from public.attendance`))).length, 1);
assert.equal((await as(S2, () => q(`select * from public.attendance`))).length, 0);
assert.equal((await as(ADMIN, () => q(`select * from public.attendance`))).length, 1);
console.log("✓ 0013: recovery_email validated, password_resets locked down, attendance once-per-day + RLS");

// ---- 0014: owner role, role-change lock for regular admins, receipt/order audit logs, system_settings locked down
// Regular admin cannot promote a student or edit owner/admin profiles
await as(ADMIN, () => q(`update public.profiles set role='admin' where id=$1`, [S1]));
assert.equal((await q(`select role from public.profiles where id=$1`, [S1]))[0].role, "student");
await fails(as(ADMIN, () => q(`update public.profiles set full_name='Hacked Owner' where id=$1`, [OWNER])), "regular admin editing owner profile");
await fails(as(ADMIN, () => q(`insert into public.admin_emails values ('evil@hmmaths.lk')`)), "regular admin modifying admin_emails");
// Owner CAN promote and demote admins
await as(OWNER, () => q(`update public.profiles set role='admin' where id=$1`, [S2]));
assert.equal((await q(`select role from public.profiles where id=$1`, [S2]))[0].role, "admin");
await as(OWNER, () => q(`update public.profiles set role='student' where id=$1`, [S2]));
assert.equal((await q(`select role from public.profiles where id=$1`, [S2]))[0].role, "student");
// Audit logs: recorded automatically for slip approvals, rejections, cash grants, and orders; readable only by owner
assert.equal((await as(S1, () => q(`select * from public.admin_audit_logs`))).length, 0);
assert.equal((await as(ADMIN, () => q(`select * from public.admin_audit_logs`))).length, 0);
const auditRows = await as(OWNER, () => q(`select category, action, actor_id, student_id, details from public.admin_audit_logs order by created_at`));
assert.ok(auditRows.some((r) => r.category === "receipt" && r.action === "receipt_approved" && r.actor_id === ADMIN && r.student_id === S1));
assert.ok(auditRows.some((r) => r.category === "receipt" && r.action === "receipt_rejected" && r.actor_id === ADMIN));
assert.ok(auditRows.some((r) => r.category === "receipt" && r.action === "cash_grant" && r.actor_id === ADMIN && r.student_id === S3));
assert.ok(auditRows.some((r) => r.category === "order" && r.action === "order_shipped" && r.actor_id === ADMIN && r.student_id === S1));
// system_settings: locked down from PostgREST for everyone (including owner)
await fails(as(S1, () => q(`select * from public.system_settings`)), "student reading system_settings");
await fails(as(ADMIN, () => q(`select * from public.system_settings`)), "admin reading system_settings");
await fails(as(OWNER, () => q(`select * from public.system_settings`)), "owner reading system_settings via PostgREST");
console.log("✓ 0014: owner role hierarchy, admin cannot promote/edit staff, receipt/order audit logs, system_settings server-only");


// ---- 0015: admins cannot manage classes / lessons / products or delete records; the owner can
{
  const [c] = await as(OWNER, () => q(`insert into public.classes (title) values ('Owner class') returning id`));
  const [l] = await as(OWNER, () => q(`insert into public.lessons (class_id, month, title) values ($1,'2026-12','L') returning id`, [c.id]));
  await fails(as(ADMIN, () => q(`insert into public.classes (title) values ('Admin class')`)), "admin creating a class");
  await as(ADMIN, () => q(`update public.classes set title='Hacked' where id=$1`, [c.id]));
  await as(ADMIN, () => q(`delete from public.classes where id=$1`, [c.id]));
  assert.equal((await q(`select title from public.classes where id=$1`, [c.id]))[0].title, "Owner class");
  await fails(as(ADMIN, () => q(`insert into public.lessons (class_id, month, title) values ($1,'2026-12','x')`, [c.id])), "admin creating a lesson");
  await as(ADMIN, () => q(`update public.lessons set title='Hacked' where id=$1`, [l.id]));
  await as(ADMIN, () => q(`delete from public.lessons where id=$1`, [l.id]));
  assert.equal((await q(`select title from public.lessons where id=$1`, [l.id]))[0].title, "L");
  await fails(as(ADMIN, () => q(`select public.generate_class_sessions($1,'2026-12','Theory')`, [c.id])), "admin generating sessions");
  await fails(as(ADMIN, () => q(`insert into public.products (title,price) values ('Admin book',1)`)), "admin creating a product");
  await fails(as(ADMIN, () => q(`insert into storage.objects (bucket_id,name) values ('class-banners','x/banner.png')`)), "admin uploading class banners");
  // admins can still read class data (incl. hidden classes) and live links
  assert.ok((await as(ADMIN, () => q(`select id from public.classes where id=$1`, [c.id]))).length === 1);
  await as(OWNER, () => q(`insert into public.class_live_defaults (class_id, live_url) values ($1,'https://youtube.com/live/abcdefghijk')`, [c.id]));
  assert.equal((await as(ADMIN, () => q(`select * from public.class_live_defaults where class_id=$1`, [c.id]))).length, 1);
  await as(ADMIN, () => q(`delete from public.class_live_defaults where class_id=$1`, [c.id]));
  assert.equal((await q(`select * from public.class_live_defaults where class_id=$1`, [c.id])).length, 1);
  // deletions: admins create/edit exams, papers, events but cannot delete them
  const [ex] = await as(ADMIN, () => q(`insert into public.exams (class_id,title,duration_minutes) values ($1,'Admin exam',30) returning id`, [c.id]));
  await as(ADMIN, () => q(`update public.exams set title='Admin exam v2' where id=$1`, [ex.id]));
  await as(ADMIN, () => q(`delete from public.exams where id=$1`, [ex.id]));
  assert.equal((await q(`select title from public.exams where id=$1`, [ex.id]))[0].title, "Admin exam v2");
  const [pp] = await as(ADMIN, () => q(`insert into public.papers (title, paper_date, total_marks, al_year) values ('Admin paper', current_date, 50, 2027) returning id`));
  await as(ADMIN, () => q(`delete from public.papers where id=$1`, [pp.id]));
  assert.equal((await q(`select 1 from public.papers where id=$1`, [pp.id])).length, 1);
  const [ev] = await as(ADMIN, () => q(`insert into public.events (title, starts_at) values ('Admin event', now()) returning id`));
  await as(ADMIN, () => q(`delete from public.events where id=$1`, [ev.id]));
  assert.equal((await q(`select 1 from public.events where id=$1`, [ev.id])).length, 1);
  await as(OWNER, () => q(`delete from public.events where id=$1`, [ev.id]));
  await as(OWNER, () => q(`delete from public.papers where id=$1`, [pp.id]));
  await as(OWNER, () => q(`delete from public.exams where id=$1`, [ex.id]));
  assert.equal((await q(`select 1 from public.exams where id=$1`, [ex.id])).length, 0);
  await as(OWNER, () => q(`delete from public.classes where id=$1`, [c.id]));
  assert.equal((await q(`select 1 from public.classes where id=$1`, [c.id])).length, 0);
  console.log("✓ 0015: admins cannot create/edit/delete classes, lessons, products or delete exams/papers/events; owner can");
}

// ---- re-running every migration (each deploy) must not re-promote a demoted admin
await q(`update public.profiles set role='student' where id=$1`, [ADMIN]);
for (const m of allMigrations) await db.exec(m);
assert.equal((await q(`select role from public.profiles where id=$1`, [ADMIN]))[0].role, "student");
console.log("✓ deploy re-run keeps a demoted admin demoted");

// ---- 0016: developer role — survives a full deploy re-run, and owners cannot change developer accounts
await q(`update public.profiles set role='developer' where id=$1`, [ADMIN]);
for (const m of allMigrations) await db.exec(m);
assert.equal((await q(`select role from public.profiles where id=$1`, [ADMIN]))[0].role, "developer");
await fails(as(OWNER, () => q(`update public.profiles set role='admin' where id=$1`, [ADMIN])), "owner demoting a developer");
await fails(as(OWNER, () => q(`update public.profiles set role='developer' where id=$1`, [S1])), "owner promoting someone to developer");
await as(ADMIN, () => q(`update public.profiles set full_name='Dev renamed owner' where id=$1`, [OWNER]));
assert.equal((await q(`select full_name from public.profiles where id=$1`, [OWNER]))[0].full_name, "Dev renamed owner");
console.log("✓ 0016: developer role survives deploy re-runs; owners cannot edit developers; developers can edit owners");

// ---- 0017: video_events is private — students cannot read or write it, owners can read
await q(`insert into public.video_events (student_id, kind) values ($1, 'play')`, [S1]);
assert.equal((await as(S1, () => q(`select count(*)::int as n from public.video_events`)))[0].n, 0);
await fails(as(S1, () => q(`insert into public.video_events (student_id, kind) values ($1, 'play')`, [S1])), "student writing video_events");
assert.equal((await as(OWNER, () => q(`select count(*)::int as n from public.video_events`)))[0].n, 1);
console.log("✓ 0017: video_events is private to the server; owners can read");

// ---- 0018: gallery — staff add, everyone sees published albums only
const ALB = "00000000-0000-0000-0000-0000000000a1", ALB2 = "00000000-0000-0000-0000-0000000000a2";
await as(OWNER, () => q(`insert into public.gallery_albums (id, title, category, is_published) values ($1, 'Trip 2026', 'trip', true), ($2, 'Draft', 'group', false)`, [ALB, ALB2]));
await as(OWNER, () => q(`insert into public.gallery_photos (album_id, path) values ($1, $3::text || '/a.jpg'), ($2, $4::text || '/b.jpg')`, [ALB, ALB2, ALB, ALB2]));
assert.equal((await as(S1, () => q(`select count(*)::int as n from public.gallery_albums`)))[0].n, 1);
assert.equal((await as(S1, () => q(`select count(*)::int as n from public.gallery_photos`)))[0].n, 1);
assert.equal((await as(OWNER, () => q(`select count(*)::int as n from public.gallery_albums`)))[0].n, 2);
await fails(as(S1, () => q(`insert into public.gallery_albums (title) values ('Student album')`)), "student adding an album");
await fails(as(S1, () => q(`insert into public.gallery_photos (album_id, path) values ($1, 'x.jpg')`, [ALB])), "student adding a photo");
await as(ADMIN, () => q(`insert into public.gallery_photos (album_id, path) values ($1, 'admin.jpg')`, [ALB]));
await as(OWNER, () => q(`delete from public.gallery_albums where id in ($1, $2)`, [ALB, ALB2]));
assert.equal((await q(`select count(*)::int as n from public.gallery_photos`))[0].n, 0);
console.log("✓ 0018: gallery — staff add, students only read published, album delete removes its photos");

// ---- 0019: a new center name is accepted; an absurd one is not
await q(`update public.profiles set town='Nugegoda' where id=$1`, [S1]);
assert.equal((await q(`select town from public.profiles where id=$1`, [S1]))[0].town, "Nugegoda");
await fails(q(`update public.profiles set town='X' where id=$1`, [S1]), "one-letter town");
console.log("✓ 0019: centers are open-ended (Nugegoda accepted), length-checked");

// ---- 0020: class banner template config is stored as json
await as(OWNER, () => q(`update public.classes set banner_config = '{"template":"attention","headlineMode":"month"}'::jsonb where id = (select id from public.classes limit 1)`));
assert.equal((await q(`select count(*)::int as n from public.classes where banner_config->>'template' = 'attention'`))[0].n, 1);
console.log("✓ 0020: classes.banner_config holds the banner template");

console.log("\nALL SQL TESTS PASSED");
process.exit(0);
