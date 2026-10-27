// Tests the app's PostgREST client (src/lib/db/rest.ts) against a REAL database + PostgREST.
// Start a throwaway stack first:  bash scripts/dev-stack.sh up && eval "$(bash scripts/dev-stack.sh env)"
//   ADMIN_DATABASE_URL  superuser connection used only to seed/clean test rows
//   POSTGREST_URL       e.g. http://127.0.0.1:55433
//   JWT_SECRET          the same secret PostgREST was started with
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { loadRestClient, mintToken, requireEnv } from "./_rest.mjs";

// ADMIN_DATABASE_URL: superuser connection used only to seed/clean test rows.
const { ADMIN_DATABASE_URL: DATABASE_URL, POSTGREST_URL, JWT_SECRET } = requireEnv("ADMIN_DATABASE_URL", "POSTGREST_URL", "JWT_SECRET");
const RestClient = await loadRestClient();
const token = (claims) => mintToken(JWT_SECRET, claims);
const clientFor = (uid) => new RestClient(POSTGREST_URL, { headers: uid ? { Authorization: `Bearer ${token({ role: "authenticated", sub: uid })}` } : {} });
const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 2 });
const sql = async (text, params) => (await pool.query(text, params)).rows;

const tag = `rt${Date.now()}`;
const ADMIN = randomUUID(), S1 = randomUUID(), S2 = randomUUID();
const ok = (label) => console.log(`✓ ${label}`);

try {
  // seed (superuser): users → profiles via trigger
  await sql(`insert into public.admin_emails (email) values ($1) on conflict do nothing`, [`${tag}-admin@test.local`]);
  await sql(`insert into auth.users (id, email, encrypted_password, raw_user_meta_data) values ($1,$2,'x',$3),($4,$5,'x',$6),($7,$8,'x',$9)`, [
    ADMIN, `${tag}-admin@test.local`, JSON.stringify({ full_name: "Rest Admin" }),
    S1, `${tag}-1@students.test`, JSON.stringify({ full_name: `Rest One ${tag}`, mobile: `07${String(Date.now()).slice(-8)}`, nic: `N${tag}1`, al_year: "2027", town: "Panadura" }),
    S2, `${tag}-2@students.test`, JSON.stringify({ full_name: `Rest Two ${tag}`, mobile: `07${String(Date.now() + 1).slice(-8)}`, nic: `N${tag}2`, al_year: "2027", town: "Horana" }),
  ]);
  assert.equal((await sql(`select role from public.profiles where id=$1`, [ADMIN]))[0].role, "admin");
  // classes / lessons / live links are owner-only writes (0015): this staff account is promoted so the suite can seed them
  await sql(`update public.profiles set role='owner' where id=$1`, [ADMIN]);

  const admin = clientFor(ADMIN), s1 = clientFor(S1), s2 = clientFor(S2), anon = clientFor(null);

  // ── insert / select / single ────────────────────────────────────────────────
  let r = await admin.from("classes").insert({ title: `${tag} Theory`, class_type: "Theory", target_year: 2027, fee: 3000, town: "Panadura" }).select("id, title").single();
  assert.equal(r.error, null); assert.equal(r.data.title, `${tag} Theory`); assert.match(r.data.id, /^[0-9a-f-]{36}$/);
  const classA = r.data.id;
  r = await admin.from("classes").insert({ title: `${tag} Free`, class_type: "Free Seminar", fee: 0, is_free: true }).select("id").single();
  const classB = r.data.id;
  r = await admin.from("classes").insert({ title: `${tag} Hidden`, is_active: false }).select("id").single();
  const classC = r.data.id;
  r = await admin.from("classes").insert({ title: `${tag} NoReturn` });
  assert.equal(r.error, null); assert.equal(r.data, null);
  ok("insert (+ select + single, and insert without return)");

  // bulk insert where rows have different keys (needs the explicit columns list)
  r = await admin.from("lessons").insert([{ class_id: classA, month: "2026-09", title: "bulk 1" }, { class_id: classA, month: "2026-09", title: "bulk 2", week_number: 3, description: "d" }]).select("title, week_number, description");
  assert.equal(r.error, null); assert.deepEqual(r.data.map((x) => [x.title, x.week_number, x.description]), [["bulk 1", 1, null], ["bulk 2", 3, "d"]]);
  await sql(`delete from public.lessons where class_id=$1`, [classA]);
  ok("bulk insert with different keys per row");

  // ── filters, order, limit ──────────────────────────────────────────────────
  r = await admin.from("classes").select("id, title").like("title", `${tag}%`).order("title");
  assert.deepEqual(r.data.map((x) => x.title), [`${tag} Free`, `${tag} Hidden`, `${tag} NoReturn`, `${tag} Theory`]);
  r = await admin.from("classes").select("title").like("title", `${tag}%`).order("title", { ascending: false }).limit(2);
  assert.deepEqual(r.data.map((x) => x.title), [`${tag} Theory`, `${tag} NoReturn`]);
  r = await admin.from("classes").select("id").in("id", [classA, classB]).eq("is_free", false);
  assert.deepEqual(r.data.map((x) => x.id), [classA]);
  r = await admin.from("classes").select("id").like("title", `${tag}%`).neq("is_active", true).match({ id: classC });
  assert.equal(r.data.length, 1);
  r = await admin.from("classes").select("id").like("title", `${tag}%`).gte("fee", 1000).lt("fee", 5000);
  assert.deepEqual(r.data.map((x) => x.id), [classA]);
  r = await admin.from("classes").select("id").like("title", `${tag}%`).not("target_year", "is", null);
  assert.deepEqual(r.data.map((x) => x.id), [classA]);
  r = await admin.from("classes").select("title").like("title", `${tag}%`).or(`is_free.eq.true,target_year.eq.2027`).order("title");
  assert.deepEqual(r.data.map((x) => x.title), [`${tag} Free`, `${tag} Theory`]);
  r = await admin.from("classes").select("title").ilike("title", `%${tag.toUpperCase()} theory%`);
  assert.equal(r.data.length, 1);
  ok("eq / neq / in / match / gte / lt / not.is / or / ilike / order / limit");

  // order with several keys + nulls placement
  r = await admin.from("classes").select("title, target_year").like("title", `${tag}%`).order("target_year", { ascending: true, nullsFirst: false }).order("title");
  assert.equal(r.data[0].title, `${tag} Theory`);
  ok("multi-column order with nullsFirst:false");

  // ── values that need quoting ───────────────────────────────────────────────
  r = await admin.from("classes").insert({ title: `${tag} a,b (c)` }).select("id").single();
  const odd = r.data.id;
  r = await admin.from("classes").select("id").in("title", [`${tag} a,b (c)`, "nothing"]);
  assert.deepEqual(r.data.map((x) => x.id), [odd]);
  ok("in() values containing commas / parentheses");

  // ── embedded tables + counts ───────────────────────────────────────────────
  await sql(`insert into public.lessons (class_id, month, title) values ($1,'2026-10','L1'),($1,'2026-10','L2')`, [classA]);
  const enr = await sql(`insert into public.enrollments (student_id, class_id, month, status, slip_url, amount) values ($1,$2,'2026-10','approved',$3,3000) returning id`, [S1, classA, `${S1}/s.jpg`]);
  r = await admin.from("enrollments").select("id, status, profiles:profiles!enrollments_student_id_fkey(full_name, town), classes(title, fee)").eq("id", enr[0].id).single();
  assert.equal(r.error, null); assert.equal(r.data.profiles.full_name, `Rest One ${tag}`); assert.equal(r.data.classes.title, `${tag} Theory`);
  r = await admin.from("classes").select("id, lessons(count)").eq("id", classA).single();
  assert.equal(r.data.lessons[0].count, 2);
  r = await admin.from("lesson_live_links").select("lesson_id, lessons!inner(class_id)").eq("lessons.class_id", classA);
  assert.deepEqual(r.data, []);
  ok("embedded tables (aliased fk, count, !inner)");

  r = await admin.from("lessons").select("id", { count: "exact", head: true }).eq("class_id", classA);
  assert.equal(r.error, null); assert.equal(r.data, null); assert.equal(r.count, 2);
  r = await admin.from("lessons").select("*", { count: "exact" }).eq("class_id", classA).limit(1);
  assert.equal(r.data.length, 1); assert.equal(r.count, 2);
  ok("count (head only, and with rows)");

  // ── student access through RLS ─────────────────────────────────────────────
  r = await s1.from("lessons").select("title").eq("class_id", classA).order("title");
  assert.deepEqual(r.data.map((x) => x.title), ["L1", "L2"]);
  r = await s2.from("lessons").select("title").eq("class_id", classA);
  assert.deepEqual(r.data, []);
  r = await anon.from("classes").select("id").eq("id", classA);
  assert.equal(r.data.length, 1);
  r = await anon.from("lessons").select("id").eq("class_id", classA);
  assert.ok(r.error, "anon must not read lessons"); assert.equal(r.status, 401);
  ok("row-level security shapes (approved student sees lessons, other student none, anon blocked)");

  // ── maybeSingle / single ───────────────────────────────────────────────────
  r = await admin.from("classes").select("id").eq("id", randomUUID()).maybeSingle();
  assert.equal(r.error, null); assert.equal(r.data, null);
  r = await admin.from("classes").select("id, title").eq("id", classA).maybeSingle();
  assert.equal(r.data.title, `${tag} Theory`);
  r = await admin.from("classes").select("id").like("title", `${tag}%`).maybeSingle();
  assert.equal(r.error.code, "PGRST116"); assert.equal(r.data, null);
  r = await admin.from("classes").select("id").eq("id", randomUUID()).single();
  assert.equal(r.error.code, "PGRST116");
  ok("maybeSingle (0 / 1 / many rows) and single (0 rows)");

  // ── update / upsert / delete ───────────────────────────────────────────────
  r = await admin.from("classes").update({ fee: 3500 }).eq("id", classA).select("fee").single();
  assert.equal(Number(r.data.fee), 3500);
  r = await admin.from("classes").update({ fee: 1 }).eq("id", randomUUID());
  assert.equal(r.error, null);
  r = await admin.from("class_live_defaults").upsert({ class_id: classA, live_url: "https://zoom.us/j/1" });
  assert.equal(r.error, null);
  r = await admin.from("class_live_defaults").upsert({ class_id: classA, live_url: "https://zoom.us/j/2" });
  assert.equal(r.error, null);
  r = await admin.from("class_live_defaults").select("live_url").eq("class_id", classA).single();
  assert.equal(r.data.live_url, "https://zoom.us/j/2");
  r = await admin.from("enrollments").upsert({ student_id: S2, class_id: classA, month: "2026-11", status: "approved", amount: 3500 }, { onConflict: "student_id,class_id,month" }).select("id").single();
  assert.equal(r.error, null);
  r = await admin.from("enrollments").upsert({ student_id: S2, class_id: classA, month: "2026-11", status: "rejected" }, { onConflict: "student_id,class_id,month" }).select("status").single();
  assert.equal(r.data.status, "rejected");
  r = await admin.from("class_live_defaults").delete().eq("class_id", classA).select("class_id");
  assert.equal(r.data.length, 1);
  r = await admin.from("class_live_defaults").delete().eq("class_id", classA);
  assert.equal(r.error, null);
  ok("update / upsert (plain + onConflict) / delete (with and without returning rows)");

  // ── errors ─────────────────────────────────────────────────────────────────
  r = await s1.from("classes").insert({ title: "hack" });
  assert.ok(r.error); assert.equal(r.error.code, "42501"); assert.equal(r.status, 403);
  r = await admin.from("classes").insert({ title: `${tag} bad`, fee: -5 });
  assert.equal(r.error.code, "23514");
  r = await admin.from("does_not_exist").select("*");
  assert.ok(r.error);
  ok("errors carry PostgREST code + message (RLS 42501, check 23514, unknown table)");

  // ── rpc ────────────────────────────────────────────────────────────────────
  r = await s1.rpc("get_my_paper_stats");
  assert.equal(r.error, null); assert.equal(r.data.papers, 0); assert.ok("streaks" in r.data);
  r = await admin.rpc("generate_class_sessions", { p_class: classA, p_month: "2026-10", p_title: null });
  assert.ok(r.error); assert.match(r.error.message, /class days and start time/i);
  r = await s1.rpc("start_exam", { p_exam: randomUUID() });
  assert.match(r.error.message, /Exam not found/);
  r = await anon.rpc("start_exam", { p_exam: randomUUID() });
  assert.ok(r.error);
  ok("rpc (no args, with args, raised exceptions, anon denied)");

  // ── network failure never throws ───────────────────────────────────────────
  r = await new RestClient("http://127.0.0.1:1").from("classes").select("*");
  assert.equal(r.data, null); assert.ok(r.error.message); assert.equal(r.status, 0);
  ok("network failure comes back as { error }, not an exception");

  console.log("\nALL REST CLIENT TESTS PASSED");
} finally {
  await sql(`delete from public.classes where title like $1`, [`${tag}%`]).catch(() => {});
  await sql(`delete from auth.users where email like $1`, [`${tag}-%`]).catch(() => {});
  await sql(`delete from public.admin_emails where email like $1`, [`${tag}-%`]).catch(() => {});
  await pool.end();
}
