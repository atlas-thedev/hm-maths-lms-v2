# HM Maths LMS — database reference

Everything the app stores lives in one PostgreSQL database (`hm_maths`). This file is the map:
what gets created, in what order, what each table/RPC is for, who is allowed to touch it, and
which rules are enforced by triggers rather than by the app.

Verified against `deploy/00_bootstrap.sql` + `db/migrations/0001…0025` + `deploy/99_grants.sql`:

| | |
| --- | --- |
| Tables in `public` | 30 (all with RLS enabled) |
| Columns | 267 |
| RLS policies (`public` / `storage`) | 61 / 19 |
| Functions in `public` | 48 (43 `SECURITY DEFINER`) |
| Triggers | 17 |
| Indexes / foreign keys | 59 / 43 |
| Storage buckets | 7 |

---

## 1. How the schema is built

Deploys run `deploy/update.sh`, which applies, **in this order, on every deploy**:

```
deploy/00_bootstrap.sql   ← roles + auth.* and storage.* schemas
db/migrations/*.sql       ← 0001 … 0025, in filename order
deploy/99_grants.sql      ← makes sure service_role can reach everything
```

Two things follow from that:

1. **Every file must be safe to re-run.** No `drop table`, no `delete`, no `insert` without a
   guard. Later files deliberately re-create functions from earlier files (that is how they
   override them) and re-drop/re-create policies that earlier files put back.
2. **Nothing depends on the previous deploy's state.** Migrations patch older definitions by
   replacing the whole function/policy rather than `alter`ing it.

### Roles

| Role | Used by | Notes |
| --- | --- | --- |
| `authenticator` | PostgREST + the Next.js server | Login role, `noinherit`; switches to one of the three below per request |
| `anon` | signed-out visitors | Only storefront reads |
| `authenticated` | signed-in students and staff | All user-level access; RLS decides what they see |
| `service_role` | server code only | `bypassrls`; registration, password hashing, file serving, settings |

The app never connects as a superuser. `src/lib/db/pg.ts` opens a transaction, does
`set local role <role>` and sets `request.jwt.claim.sub` / `request.jwt.claims`, which is exactly
what PostgREST does — so the same RLS applies on both paths.

### `auth` and `storage` (written by bootstrap, not by migrations)

- `auth.users` — email, bcrypt `encrypted_password` (pgcrypto lives in the `extensions` schema),
  `raw_user_meta_data`, `password_changed_at`, `last_sign_in_at`.
- `auth.sessions` — one row per login. The session cookie carries its `id` (`sid`), so signing out
  or changing a password revokes the row instead of waiting 30 days.
- `auth.uid()` / `auth.role()` — read the JWT claims set by PostgREST or by `pg.ts`.
- `storage.buckets` / `storage.objects` — file metadata. Bytes live on disk (`STORAGE_DIR`).

Kept intentionally similar to Supabase so the client code reads familiarly, but this is plain
Postgres — there is no Supabase anywhere in the stack.

---

## 2. Migration log (what each file adds)

| File | Adds |
| --- | --- |
| `0001_init` | `admin_emails`, `profiles`, `classes`, `lessons`, `enrollments`, `notices`, `exams`, `exam_questions`, `exam_submissions`, `products`, `orders`; helpers (`is_admin`, `has_class_access`, `can_read_class_file`), signup trigger, exam RPCs, buckets |
| `0002_class_schedule` | `classes.schedule_days/start_time/duration_minutes`, session fields on `lessons`, `class_live_defaults`, `lesson_live_links` + `live_window_open()`; drops `lessons.live_url` so links can't be read early; `generate_class_sessions()` |
| `0003_papers_leaderboards` | `papers`, `paper_marks`, `student_activity`; `get_paper_leaderboard`, `get_overall_leaderboard`, `get_my_paper_stats`, `log_activity`, `can_read_paper_file`; `papers` bucket |
| `0004_performance_streaks` | Rewrites `get_my_paper_stats()` with six performance streaks |
| `0005_enrollment_withdraw` | Students may delete their own **pending** slip; one pending slip per class |
| `0006_security_hardening` | `used_captchas`; students may only order active products; `anon` loses all RPC access; upload file-name whitelist |
| `0007_google_identities` | `oauth_identities` (Google `sub` → user), server-only |
| `0008_exam_integrity_privacy` | Answer key hidden until `closes_at`; late MCQ submissions unranked; Student ID + school only on your own leaderboard row |
| `0009_data_foundations` | Student ID becomes 8 digits (`YYYY`+4); `attempt`, `whatsapp`, `guardian_mobile`, `avatar_path`; `avatars` bucket; `notifications`; `events` |
| `0010_notifications_bell` | `profiles.notices_seen_at`, `unread_notification_count()` (notices + notifications) |
| `0011_notify_cash_grants` | An enrollment inserted as `approved` (cash grant) also notifies |
| `0012_premium_ranks` | `premium_calc` / `is_premium` / `my_premium_status`, `season_board`, `paper_board`, `my_paper_ranks` |
| `0013_profile_reset_attendance` | `recovery_email`, `password_resets` (server-only), `attendance` |
| `0014_owner_audit_settings` | `owner` role, `is_owner()`, staff-edit protection, `reviewed_by` on orders, `admin_audit_logs` + audit triggers, `system_settings` (server-only) |
| `0015_owner_only_structure` | Owner-only: classes, lessons, live links, class files, products, deletions |
| `0016_developer_role` | `developer` role above owner; `is_developer()`; owners can't touch developers |
| `0017_video_events` | `video_events` (plays, tamper/devtools/limit flags), server-written |
| `0018_gallery` | `gallery` bucket + `gallery_albums` / `gallery_photos` |
| `0019_open_centers` | Drops the five fixed center names; centers now live in `system_settings` |
| `0020_class_banner_templates` | `classes.banner_config` |
| `0021_attendance_class_and_classes` | Attendance becomes per (student, day, class); seeds the 8 master classes **without deleting** |
| `0022_combo_classes` | `'Combo'` class type, `combo_items`, combo-aware `has_class_access` |
| `0023_access_expiry` | `enrollments.access_until` (approval + 40 days), expiry-aware `has_class_access`, re-purchase after expiry |
| `0024_tute_deliveries` | `deliveries`, `tute_skips`, `classes.posts_tutes`; auto-queue on approval; `tute_posted` notification |
| `0025_portal_pulse` | `portal_pulse()` / `admin_pulse()` — one poll instead of two |

---

## 3. Tables

`id` is `uuid` (except `video_events.id`, a `bigint` identity) unless stated. Every table has RLS
enabled; "write" below means which role a policy actually lets through, not just the grant.

### People

**`profiles`** (21 cols) — one row per `auth.users` row, created by the signup trigger.
`full_name`, `mobile` (unique — this is the login id), `nic` (unique), `al_year`, `attempt` (1–3),
`town` (center), `school`, `district`, `address`, `city`, `postal_code`, `whatsapp`,
`guardian_mobile`, `recovery_email`, `avatar_path`, `student_id` (unique 8-digit),
`role`, `notices_seen_at`.
Read: own row or admin. Update: own row — but `protect_profile_fields` pins `role`,
`student_id`, `mobile`, `nic`, `al_year`, `attempt`. Delete: admin (students), owner (staff),
developer (anyone).

**`admin_emails`** — allow-list; an address here makes the next signup an `admin`.
Read: staff. Write: owner/developer only. Deliberately **not** re-applied on deploy (that used to
silently re-promote demoted admins), so use `deploy/seed-admin.sql`.

**`oauth_identities`** — `(provider, subject)` → `user_id` for Google sign-in. Server-only.

### Teaching

**`classes`** (18) — `title`, `description`, `class_type` (`Theory` / `Revision` / `Paper Class` /
`Combo` / `Extra Class` / `Free Seminar`), `target_year`, `town`, `fee`, `schedule`,
`schedule_days smallint[]` (0=Sun…6=Sat), `start_time`, `duration_minutes`, `banner_url`,
`banner_config jsonb` (template banner), `is_active`, `is_free`, `posts_tutes`.
The schedule fields drive `generate_class_sessions()`, which walks the month and creates one
`lessons` row per teaching day at `start_time` **Asia/Colombo (UTC+05:30, no DST)**.
Read: anyone while `is_active`. Write: **owner/developer only**.

**`lessons`** (14) — one session (or one recording) of a class: `class_id`, `month` (`YYYY-MM`),
`week_number`, `title`, `youtube_url`, `tute_pdf_url`, `live_start_time`, `session_type`
(`regular` / `extra`), `duration_minutes`, `is_cancelled`, `sort_order`.
Read: `has_class_access(class_id, month)`. Write: owner/developer.

**`lesson_live_links`** / **`class_live_defaults`** — the meeting URL. `lessons.live_url` was
removed in 0002 and moved here, so a student cannot read a link before the window opens.
`lesson_live_links` is readable only while `live_window_open(lesson_id)`: not cancelled, has a
start time, from **20 min before** until **duration + 30 min after**, and the month is paid.

**`combo_items`** — `(combo_id, class_id)`: which classes a Combo pack unlocks.

### Money & access

**`enrollments`** (13) — one row per (student, class, month): `status`
(`pending` / `approved` / `rejected`), `slip_url` (must start with the student's own uid),
`amount`, `bank_ref`, `admin_note`, `reviewed_by`, `reviewed_at`, `access_until`.
The `guard_enrollment` trigger is the whole workflow: a student insert is forced to `pending`
with the class fee; a student update re-opens it as `pending` and keeps the money fields; an admin
approval stamps reviewer + `access_until = now() + 40 days`.

**`orders`** — tute-book orders: `product_id`, `quantity`, `amount`, `delivery_address`,
`status` (`pending` / `approved` / `rejected` / `shipped`), `slip_url`, `admin_note`,
`reviewed_by`, `reviewed_at`. Students may only insert (against an active product, own slip
folder) — the `guard_order` trigger computes `amount` and blocks student updates.

**`products`** — store catalog. Read: anyone while active. Write: owner/developer.

**`deliveries`** (18) — the packing desk: one parcel per approved (student, class, month) or per
approved order. `status` `to_pack → packed → posted → delivered` (or `returned` / `skipped`),
`method` `post` / `class`, plus `address`, `phone`, `courier`, `tracking_no`, `posted_at`,
`delivered_at`. A posted class tute notifies the student (`tute_posted`); a posted order flips the
order to `shipped`.

**`tute_skips`** — `(class_id, month)` with no printed tute; inserting skips that month's waiting
parcels, deleting brings them back and picks up students approved in the meantime.

### Assessment

**`exams`** — `class_id`, `title`, `exam_type` (`mcq` / `structured`), `duration_minutes`,
`total_questions` (kept in sync by trigger), `paper_pdf_url`, `opens_at`, `closes_at`,
`is_published`. Read: published + class access. Insert/update: staff; delete: owner.

**`exam_questions`** — `question_text`, `options_json` (2–6 options), `correct_answer`,
`marks`, `explanation`, `sort_order`. **Staff only** — students never select from this table;
`start_exam()` hands them questions without the key and `get_exam_review()` withholds the key
until `closes_at`.

**`exam_submissions`** — `score`, `total_marks`, `answers_json`, `answer_sheet_urls`, `status`
(`in_progress` / `submitted` / `graded`), `is_late`, `feedback`, timestamps. Written only through
RPCs; students read their own row.

**`papers`** / **`paper_marks`** — weekly/monthly/model papers with `paper_path`,
`answers_path`, `total_marks`, `paper_date`, `al_year`, `is_published`; marks are one row per
(paper, student) and can never exceed the paper total (`check_paper_marks` trigger).

**`student_activity`** — `(student_id, day)`; written only by `log_activity()`.

### Communication

**`notices`** — staff announcements: `title`, `content`, `tag` (`General` / `Urgent` /
`Exam Notice`), `is_pinned`, optional `class_id` and `target_year`. Read policy applies the same
class-access and batch filter.

**`notifications`** — the bell: `user_id`, `kind` (`payment_approved`, `payment_rejected`,
`order_approved`, `order_rejected`, `order_shipped`, `tute_posted`, `update`), `title`, `body`,
`link`, `data jsonb`, `read_at`. Created by triggers; students mark their own read.

**`events`** — seminars, paper days, parents' meetings: `starts_at`, `ends_at`, `venue`,
`online_url`, `poster_url`, optional `class_id` / `target_year`, `is_published`.

**`gallery_albums` / `gallery_photos`** — public photo gallery; albums are read by anyone when
published, written by staff. Photos point at paths in the public `gallery` bucket.

### Ops & audit

**`attendance`** — `student_id`, `day`, `scanned_at`, `scanned_by`, `class_id`, `method`
(`qr` / `manual`). Unique on `(student_id, day, coalesce(class_id, …))`, so a student can check in
to several classes in one day but not twice to the same one. Written by staff; students see their
own.

**`admin_audit_logs`** — receipts, cash grants, order reviews and role changes: `actor_*`,
`category` (`receipt` / `order` / `staff` / `student` / `settings` / `attendance`), `action`,
`student_*`, `summary`, `details jsonb`. Read: owner/developer via RLS.

**`video_events`** — `kind` `play` / `tamper` / `devtools` / `limit`, with IP and user agent.
Written by the server only; owners may read.

**Server-only tables** (RLS on, **no** policy and no grant for `anon`/`authenticated`):
`used_captchas`, `password_resets`, `system_settings`, `oauth_identities`, `video_events` (read
only via owner policy). These are reachable only through `asService()` in `src/lib/db/pg.ts`.

**`system_settings`** — `key` → `value jsonb`: centres, access/registration settings,
verification providers, landing-page stats, `hero_slides` (the rotating teacher photos) and
`top_results` (the `/results` page). Read/written through `src/lib/settings.ts`.

---

## 4. Functions (RPCs)

All are callable only by the roles listed; `SECURITY DEFINER` runs with the owner's rights and
must therefore check `auth.uid()` / `is_admin()` itself.

| Group | Function | Caller | Purpose |
| --- | --- | --- | --- |
| Access | `is_admin()` / `is_owner()` / `is_developer()` | all | Role checks (`student < admin < owner < developer`) |
| | `has_class_access(class, month?)` | authenticated | Free+active, or an approved non-expired month, or a paid Combo parent |
| | `my_al_year()` | authenticated | Batch of the caller |
| | `live_window_open(lesson)` | authenticated | Is a join link readable right now |
| | `can_read_class_file(name)` / `can_read_paper_file(name)` | authenticated | Storage path rules |
| Exams | `start_exam(exam)` | authenticated | Creates/returns the submission, questions **without** answers, deadline |
| | `submit_mcq(exam, answers)` | authenticated | Server-side marking + `is_late` (2 min grace) |
| | `submit_structured(exam, paths)` | authenticated | Uploads answer-sheet paths |
| | `get_exam_review(exam)` | authenticated | Own result; key + explanations only after `closes_at` |
| | `get_leaderboard(exam)` | authenticated | Ranked exam scores (late entries excluded) |
| Papers | `season_board(...)` / `paper_board(...)` | authenticated | Leaderboards + attempt, batch, premium badge |
| | `get_paper_leaderboard` / `get_overall_leaderboard` | authenticated | Earlier versions, kept for compatibility |
| | `my_paper_ranks()` / `get_my_paper_stats(student?)` | authenticated | Own ranks per paper; summary + 6 streaks |
| | `premium_calc(student)` | service only | Internal badge maths |
| | `is_premium(student)` / `my_premium_status(student?)` | authenticated | Badge for a row / full details for self |
| Bell | `unread_notification_count()` / `portal_pulse()` | authenticated | Bell badge / one 30 s poll (unread + enrollment fingerprint) |
| | `admin_pulse()` | authenticated | Pending slips + newest audit id for staff screens |
| | `mark_notifications_read(ids?)` | authenticated | Marks own read; marks notices seen when `ids` is null |
| | `broadcast_update(title, body, link?, year?)` | staff | Site update to every student (or one batch) |
| | `log_activity()` | authenticated | Records today's visit, returns streak |
| Content | `generate_class_sessions(class, month, title?)` | owner/developer | Creates a month of sessions from the timetable |
| Delivery | `queue_class_tute(student, class, month, note)` / `profile_post_address(student)` | service only | Queue a parcel / resolve the posting address |

Triggers are **not** callable by the app; 13 more functions are trigger bodies
(`handle_new_user`, `protect_profile_fields`, `guard_enrollment`, `guard_order`,
`guard_delivery`, `notify_*`, `audit_*`, `queue_*`, `tute_skip_sync`, …) and are revoked from
every client role.

---

## 5. Triggers — the rules that don't live in application code

| Table | Trigger | Effect |
| --- | --- | --- |
| `auth.users` | `on_auth_user_created` | Creates the profile, Student ID, and the admin role from `admin_emails` |
| `profiles` | `profiles_protect` | Students can't change role/ID/mobile/NIC/year/attempt; admins can't edit staff; owners can't edit developers |
| `enrollments` | `enrollments_guard` | Forces student rows to `pending`, stamps reviewer + 40-day `access_until` on approval |
| | `enrollments_notify` | Payment approved/rejected notification |
| | `enrollments_audit` | Receipt / cash-grant row in `admin_audit_logs` |
| | `enrollments_queue_tute` | Approved month → parcel on the deliveries board |
| `orders` | `orders_guard` | Computes amount; blocks student updates |
| | `orders_notify` / `orders_audit` | Order notifications / audit rows |
| | `orders_sync_delivery` | approved → parcel; shipped → parcel posted |
| `deliveries` | `deliveries_guard` | Stamps `posted_at` / `delivered_at`, `updated_by` |
| | `deliveries_notify` | `tute_posted` notification; posts order → `shipped` |
| `tute_skips` | `tute_skips_sync` | Skip / un-skip a month's parcels |
| `paper_marks` | `paper_marks_check` | Marks ≤ paper total |
| `exam_questions` | `exam_questions_count` | Keeps `exams.total_questions` correct |
| `classes`, `papers`, `events` | `*_updated_at` | `updated_at` |

---

## 6. Storage buckets

| Bucket | Public | Limit | Path | Who writes |
| --- | --- | --- | --- | --- |
| `bank-slips` | no | 5 MB | `<uid>/<file>` | The student (own folder) |
| `answer-sheets` | no | 10 MB | `<uid>/<file>` | The student |
| `avatars` | no | 2 MB | `<uid>/<file>` | The student (own folder) |
| `tute-pdfs` | no | 50 MB | `<class_id>/<YYYY-MM>/<file>` | Owner/developer |
| `papers` | no | 25 MB | `<paper_id>/<file>` | Staff (read if the paper is published and you have access) |
| `class-banners` | **yes** | 3 MB | `<class_id>/…`, `events/…` | Owner/developer |
| `gallery` | **yes** | 8 MB | `<album_id>/…` | Staff |

Uploads are checked three ways: the `storage.objects` insert policy, the bucket's MIME list and
size limit, and a file-name regex (0006) that only allows `jpg|jpeg|png|webp|pdf` — so an `.svg`
or `.html` can never be uploaded as a "bank slip".

---

## 7. Things worth knowing

1. **One student = one mobile = one internal e-mail.** Login is the mobile number, mapped to
   `…@students.hmmaths.lk`; that domain is never accepted from Google sign-in.
2. **`has_class_access` is the single source of truth** for what a student may open. It is used by
   lessons, live links, tutes, exams, notices and the leaderboards. It understands free classes,
   approved months, combos and the 40-day expiry.
3. **Paid access expires.** `enrollments.access_until` is set at approval; `NULL` means "never"
   (rows approved before 0023) — keep `ACCESS_DAYS = 40` in `src/lib/constants.ts` in sync.
4. **Dates are Sri Lankan.** Months are `YYYY-MM` text, "today" is `(now() at time zone
   'Asia/Colombo')::date`, and session times are converted from UTC+05:30.
5. **Sequences of truth:** `student_id` is `YYYY` + 4 random digits (max 9 000 per batch);
   `admin_audit_logs` and `video_events` are append-only by convention.
6. **`combo_items` has only a `SELECT` policy.** Its `FOR ALL` staff policy would also cover
   `INSERT`/`UPDATE`/`DELETE`, so it needs explicit table grants for staff — see §8.
7. **Testing:** `npm run test:sql` applies every migration **twice** in PGlite and exercises the
   RLS/workflow/exam/leaderboard rules. Any new migration must be added there as well as to
   `db/migrations/`.

---

## 8. Known issues found while verifying

### 8.1 `combo_items` has no table privileges — Combo packs cannot be edited

`0022_combo_classes.sql` creates the table, enables RLS and adds two policies, but never grants
`INSERT`/`UPDATE`/`DELETE`/`SELECT` on it to `authenticated`. The `combo_items_all_admin` policy is
useless without the underlying grant, so PostgREST answers **42501 `permission denied for table
combo_items`** for every role except `service_role`.

Effect, reproduced on a clean database:

- an owner saving a Combo class (`/admin/classes`) fails at the `delete`/`insert` of its items;
- the class page and the store page log a permission error and fall back to "no child classes";
- granting a cash month on a Combo writes the parent enrollment only — the memberships still work
  through `has_class_access`, but the admin screens can't show or repair the pack.

It is masked on any database that has been deployed **twice**, because `0001_init`'s blanket
`grant … on all tables in schema public to authenticated` re-runs before `0022`. A first deploy on
a fresh database (new server, restored dump, local `dev-stack`) has the bug.

**Fix** — add to the end of `0022_combo_classes.sql`:

```sql
grant select on public.combo_items to authenticated;
grant insert, update, delete on public.combo_items to authenticated;  -- RLS still limits this to staff
```

(Keep `FOR ALL` → RLS already restricts writes to `is_admin()`.)

### 8.2 The blanket grant in `0001_init` re-widens later tables

`0001_init` ends with `grant select, insert, update, delete on all tables in schema public to
authenticated`. Because `0001` runs first on every deploy, every table created by a later
migration silently receives all four privileges on the next deploy. Tables that meant to be
closed (`system_settings`, `password_resets`, `used_captchas`, `oauth_identities`) survive only
because they carry `enable row level security` with **no policy**; a table that ends up with any
permissive policy would be reachable by every signed-in user. `video_events` and
`admin_audit_logs` are readable in principle but return zero rows thanks to their owner-only
policies.

Worth making explicit per migration, or moving to an allow-list style grant.
