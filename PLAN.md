# HM Maths LMS — Work Plan

Your change list, sorted into parts so we can build and ship **one part at a time**.
Each part lists what changes, my reading of anything ambiguous, and the **decisions needed from you**
before that part starts. Recommended answers are marked ⭐ — say "go with ⭐" to accept them.

Order matters: Part 1 fixed the navigation bug first; Part 2 adds the database foundations
(Student ID, attempt, phone numbers, photo, notifications) that later parts need; theme/colour changing
is moved to Part 13 (to the end) so all functional screens are completed first.

| # | Part | Depends on | Status |
|---|------|-----------|--------|
| 0 | Security fixes | — | ✅ Done |
| 1 | Icon bar / navigation bug | — | ✅ Done |
| 2 | Data foundations (Student ID, attempt, phone numbers, photo, notifications) | — | ✅ Done |
| 3 | Sign up & login | 2 | ✅ Done |
| 4 | Navigation layout: sidebar, icon bar, top bar | 1 | ✅ Done |
| 5 | Notifications (bell) | 2, 4 | ✅ Done |
| 6 | Dashboard | 2, 4, 5 | ✅ Done |
| 7 | My Classes | 4 | ✅ Done |
| 8 | Store, Events & Payments | 2, 4 | ✅ Done |
| 9 | Papers & Marks, Leaderboard, Premium badge | 2 | ✅ Done |
| 10 | My Profile + QR code + admin QR scanner | 2, 9 | ✅ Done |
| 11 | Landing page (A/B results count) | — | ✅ Done |
| 12 | Admin panel changes + owner access | 2, 10 | ✅ Done |
| 13 | Look & feel: colours, icons, calmer motion (Theme change) | — | ⏳ Next |
| 14 | Testing on phone / tab / laptop / PC + browsers | all | |

### Where each part of your message went

| Your message section | Goes to |
|---|---|
| 🔴 LOG වෙන්න කලින් තියෙන Previous Page එකේ (A/B results count) | Part 11 |
| 🔴 Sign Up & Login | Part 3 (+ fields in Part 2) |
| 🔴 Dashboard — SID size / remove HM-MATHS | Part 2 (ID format) + Part 6 (display) |
| 🔴 Dashboard — remove Free Seminar from the bar, Support Center to the side bar | Part 4 |
| 🔴 Dashboard — remove Streaks / Latest Paper / My Classes, add Payment & Delivery, Free seminar under Upcoming | Part 6 |
| 🔴 Dashboard — notify icon next to the profile pic | Part 5 |
| 🔴 My Classes | Part 7 |
| 🔴 Paper & Marks (leaderboard inside, Premium verify badge, rank vs others) | Part 9 |
| 🔴 Leaderboard (Top 3 stage, 2025 → 2027 note) | Part 9 |
| 🔴 Icon bar — can't switch pages / icons disappear bug | Part 1 |
| 🔴 Icon bar — Store icon, 3-line menu "Event" | Part 4 + Part 8 |
| 🔴 Icon bar — Store filters, "Pay class fees" → Store | Part 8 |
| 🔴 My Profile (photo, ID, attempt, remove Google/password/My student id, guardian number, QR, admin scanner) | Part 10 (+ fields in Part 2) |
| 🔴 icon bar animation, premium icons / orange colour → premium colours / logo | Part 13 (Theme change) |
| 🔴 admin panel / owner panel | Part 12 |
| 🔴 Bugs බලන්න / Pc, lap, phone, tab වලට test කරන්න | Part 14 |

---

## Part 0 — Security fixes ✅ (done)

1. **Google sign-in account takeover closed.** Student logins use internal `…@students.hmmaths.lk`
   addresses; a Google account on that domain was auto-linked to the matching student. That domain is now
   rejected for Google sign-in and never matched by e-mail.
2. **Demoted admins stay demoted.** Deploys re-run every migration; `0001` no longer re-seeds the admin
   address or re-promotes everyone in `admin_emails`.
3. **Real student IPs behind Cloudflare.** `deploy/nginx.conf` now includes the Cloudflare real-IP
   snippet (`deploy/cloudflare-realip.conf`). Without it, all students share Cloudflare IPs and the
   login/sign-up rate limits can lock people out. **Live server needs a one-time step** (see Deploy below).
4. **Exam integrity.** The MCQ review hides the answer key, explanations and per-question right/wrong
   until the paper's close time; late submissions (after timer + 2 min) are not ranked
   (`0008_exam_integrity_privacy.sql`).
5. **Logout really logs out.** Every login is a row in `auth.sessions`; logout revokes it, a password
   change revokes all of the user's sessions, and the `/api/rest` proxy now checks the session (before,
   it accepted any signed token, even after a password change). Old cookies from before this deploy keep
   working until they expire (≤ 30 days) — nobody is logged out by the deploy.
   **Content-Security-Policy** now uses a per-request script nonce instead of `'unsafe-inline'`.
6. **Leaderboard privacy.** Other students' Student ID and school are no longer sent to students
   (own row + admins still see them). Names and centers stay visible.
7. **Docs/scripts cleaned.** README rewritten for the self-hosted setup; removed Netlify config and
   the old Supabase-only scripts (`reset-full.sql`, `upgrade-0002-0003.sql`, `verify-e2e`, `create-admin`).
8. **Fully self-hosted — nothing from Supabase is left.**
   - The `@supabase/postgrest-js` package is replaced by our own client, `src/lib/db/rest.ts`.
   - The migrations folder moved to `db/migrations/`; `deploy/update.sh` reads it from there.
   - The `supabase` variable is now `db` everywhere in the code; error messages and SQL comments no longer
     mention Supabase.
   - New `scripts/dev-stack.sh` starts a throwaway database for tests (never the production one);
     `npm run test:rest` tests the client against a real PostgREST; `npm run test:ui` was ported to the
     self-hosted backend.

Tests: `npm run typecheck` ✅ · `npm run test:sql` ✅ (new checks for 2, 4, 6) · `npm run test:i18n` ✅ ·
production build ✅ · pages load in Chromium with the new CSP and no violations ✅.

**Deploy:** commit + push, then on the server
```bash
sudo bash /srv/hm-maths/app/deploy/update.sh
sudo cp /srv/hm-maths/app/deploy/cloudflare-realip.conf /etc/nginx/snippets/cloudflare-realip.conf
# add `include /etc/nginx/snippets/cloudflare-realip.conf;` inside the server { } block of
# /etc/nginx/sites-available/hm-maths, then:
sudo nginx -t && sudo systemctl reload nginx
```

---

## Part 1 — Icon bar / navigation bug ✅ (done)

> **Your message — 🔴 Icon bar:** “icon bar එකේ සහ site එකේ එකකින් එකකට මාරුවෙන්න බැරි සහ icon පේන්නෙ නැතුව යන ලොකු bug එකක් තියෙනවා ඒක හදන්න.”

- Fix the bug where you **can't switch between pages** and **icons disappear** in the icon bar (and
  elsewhere on the site).
- Solution implemented:
  - Replaced inline component definitions (`Nav` and `StreakCard`) in `src/components/dashboard-shell.tsx`
    with render functions to stop React from destroying/remounting the navigation bar on route changes.
  - Added `setLive(false)` to effect cleanup in `src/components/sticker.tsx` so sticker images never get
    stuck at 0 opacity when switching tabs.
  - Added automated test in `scripts/e2e-ui.mjs` verifying every tab in desktop sidebar and mobile bar
    switches properly with all icons visible.

---

## Part 2 — Data foundations (database) ✅ (done)

> **Your message:** 🔴 Dashboard — “SID එක ඉලක්කම් 8ක් … HM - MATHS ඒවා අයින් කරන්න” · 🔴 Sign Up — “Exam Year එක ලගින් Attempt එක”, “Mobile Numbers 2ක් (whatsapp & Normal)” · 🔴 My Profile — “pic”, “Guardian number” · 🔴 Dashboard — notifications · 🔴 Icon bar — “event”

Behind-the-scenes changes later parts depend on. One migration, safe for existing students.

- **Student ID → 8 digits, no "HM-MATHS".** `HM-MATHS-2027-1234` becomes `20271234` everywhere it shows
  (dashboard, profile, ID card, admin, leaderboards, WhatsApp texts). Existing IDs converted; admin search
  accepts old and new forms.
- **Attempt** (1st / 2nd / 3rd attempt) stored next to **exam year**.
- **Phone numbers:** login mobile + **WhatsApp number** + **guardian number**.
- **Profile photo** (stored privately, resized, shown in the top bar).
- **Notifications** table (per student; read/unread) — used by Part 5.
- **Events** table — used by Part 8.

**Decisions (⭐ accepted):** normal phone number stays the login; ID = `YYYY` + the student's current 4
digits; attempt = 1st / 2nd / 3rd.

**What was built** — `db/migrations/0009_data_foundations.sql`:
- `generate_student_id` now makes `20271234`; existing `HM-MATHS-YYYY-NNNN` IDs converted in place
  (unique before → unique after). Admin search (students, marks entry, "grant access") accepts both
  `20271234` and the old `HM-MATHS-2027-1234`.
- `profiles.attempt` (1–3, default 1st for existing students; admin-only like exam year),
  `profiles.whatsapp`, `profiles.guardian_mobile` (`07XXXXXXXX`, student-editable),
  `profiles.avatar_path`. The sign-up trigger already stores `attempt` / `whatsapp` / `guardian_mobile`
  when the form sends them (Part 3).
- Private `avatars` bucket (2 MB, JPG/PNG/WEBP, `<uid>/<file>`; owner + admins).
- `notifications` table (own rows only, read/unread). Created automatically when the admin approves /
  rejects a class payment (with the note) or approves / rejects / ships a tute order.
  RPCs: `mark_notifications_read(ids?)`, `broadcast_update(title, body, link?, year?)` (admin).
- `events` table (title, start/end, venue, online link, poster, optional class / batch, published);
  students see published events for their batch / paid class. Posters go in `class-banners/events/…`.
- Types in `src/lib/types.ts`; `npm run test:sql` covers all of the above.

---

## Part 3 — Sign up & login ✅ (done)

> **Your message — 🔴 Sign Up & Login:** “Capcha එක අයින් කරන්න” · “Mobile Numbers 2ක් දාන්න ඕනෙ (whatsapp & Normal Phone number)” · “Exam Year එක ලගින් Attempt එක” · “District එකයි City/Town එක එක ලඟ (District එකට යටින් City/town)”

**Decisions (⭐ accepted):**
- Replaced captcha with invisible bot check (`src/lib/form-guard.ts`): signed one-time form ticket, hidden honeypot field, 4s minimum completion timer, replay prevention in `used_captchas`.
- WhatsApp number has a "Same as my mobile number" toggle.

**What was built:**
- Removed visible maths captcha and deleted `src/lib/captcha.ts`.
- Added `ATTEMPTS` [1, 2, 3] and attempt select next to Exam Year with `items-end` alignment.
- Added WhatsApp number input alongside login mobile with "Same as my mobile number" checkbox.
- Re-ordered location fields so District and City/Town sit directly together.
- Server action `registerAction` validates ticket, honeypot, saves WhatsApp and attempt to `user_metadata` and `profiles`.
- Localized in English and Sinhala (`auth.json`, `errors.json`, `common.json`).
- Updated E2E test in `scripts/e2e-ui.mjs` verifying honeypot rejection and WhatsApp/attempt profile storage.

---

## Part 4 — Navigation layout: sidebar, icon bar, top bar ✅ (done)

> **Your message:** 🔴 Dashboard — “ඒ bar එකේ Free seminar bar එක අයින් කරන්න” · “Support Center … පැත්තෙන් තියෙන bar එකට දාන්න (Channels වෙනම, contact us වෙනම, අන්තිමට FAQ)” · 🔴 Paper & Marks — “icon bar එකෙන් [leaderboard] icon එක අයින් වෙන්න ඕනෙ” · 🔴 Icon bar — “Store කියලා icon එකක් දාන්න” · “ඉරිකෑලි 3 එබුවම … event කියලා එකක්”

**Decisions (⭐ accepted):** final icon-bar order: Home · My Classes · Papers & Marks · Store.

**What was built:**
- **Icon bar (mobile bottom tabs):** Removed Free Zone and Leaderboard icons; added Store (`/dashboard/store`).
- **Sidebar (☰ menu):**
  - Added **Events** (`/dashboard/events`) under the Learn group.
  - Added **Support** group at bottom: **Channels** (`/dashboard/channels`), **Contact us** (`/dashboard/contact`), **FAQ** (`/dashboard/faq`).
- **Top bar & desktop sidebar:**
  - Added student profile photo support via signed URL from private `avatars` bucket, with initials fallback.
- **New pages created:**
  - `/dashboard/events`: upcoming & recent events with date tiles, venues, timings, posters, and online join links.
  - `/dashboard/channels`: Telegram & WhatsApp batch channels, highlighted for student's A/L batch.
  - `/dashboard/contact`: WhatsApp, call, Facebook, YouTube links, and Panadura center address.
  - `/dashboard/faq`: Clean student FAQ page with embedded FAQ component.
- Localized in English and Sinhala with stickers & route breadcrumbs.

---

## Part 5 — Notifications (bell) ✅ (done)

> **Your message — 🔴 Dashboard:** “උඩම bar එකේ Profile pic එක වැටෙන ලඟ notify icon එකේන්: 1) Student payment approve කලාම notification 2) Tute delivery on උනා නම් 3) normally site updates … එබුවම වෙනම page එකකට යනවනෙ, back වෙන button එකක් නැත්තන් කරදරයි.”

- The bell next to the profile photo shows:
  1. **Payment approved** (and rejected, with the admin's note),
  2. **Tute delivery** — when the admin marks a tute-book order as shipped,
  3. **Site updates** (announcements from the admin).
- Unread count on the bell; tapping opens the notifications page, which gets a clear **Back** button.

**Decisions (⭐ accepted):** Notices (General / Urgent / Exam) merged into the bell page; in-site only
(no phone push / WhatsApp for now).

**What was built:**
- `db/migrations/0010_notifications_bell.sql`: `profiles.notices_seen_at`; `mark_notifications_read()`
  (no ids) now also marks notices seen; new `unread_notification_count()` (runs as the student, so RLS
  limits notices to their classes / batch; a never-opened bell counts notices from the last 7 days).
- **Bell** (top bar) + sidebar item **Notifications** show the unread count. `useBellCount`
  (`src/components/notices-realtime.tsx`) polls every 30 s while the tab is visible; a new item shows a
  toast and refreshes the page.
- **New page `/dashboard/notifications`**: clear **Back** button (`src/components/back-button.tsx`,
  falls back to the dashboard when opened directly), filters **All / Payments / Tute delivery / Updates**
  with unread counts, pinned notices on top, "New" highlight, admin's note on rejections, "View" link.
  Payment approved / rejected, tute order approved / rejected / shipped and admin site updates
  (`broadcast_update`) + every notice appear here. Opening the page marks everything read and clears the bell.
- `/dashboard/notices` now redirects to `/dashboard/notifications?filter=updates`; the dashboard's
  "Latest Notices" card links there. Admins keep publishing from **Admin → Notices** (they appear in the bell).
- English + Sinhala text; `npm run test:sql` covers the unread count / mark-all-read; `test:ui` paths updated.

---

### Review fixes for Parts 1–5 ✅
- **Sign-up retry:** a student who got "mobile / NIC already registered" can now fix it and press Sign up
  again on the same page (the one-time form ticket is only used up once the account is created).
- **Bot trap field** renamed (`hm_trap_7f`) and marked "ignore" for password managers, so autofill can't
  block a real student.
- **Cash payments:** "Grant access manually" now sends the student a "payment approved" notification
  (`0011_notify_cash_grants.sql`).
- Admin "grant access" placeholder shows the new ID format (`20271234`).
- Tests: the browser journey now checks the sign-up retry and runs the icon-bar check with real animations.

---

## Part 6 — Dashboard ✅ (done)

> **Your message — 🔴 Dashboard:** “SID එක ලං කරන්න සහ ලොකුවට” · “Free seminar … Dashboard එකේ up coming class යටතේ” · “Your Streaks අයින්” · “Latest Paper results අයින්” · “My Classes අයින්” · “Payment & Delivery Your streaks වෙනුවට” · “Support Center අයින්”

- **Student ID:** 8 digits, grouped tightly and a bit bigger; "HM-MATHS" removed (from Part 2).
- **Remove:** Your Streaks, Latest Paper Result, the My Classes card, the Support Center card (moves
  to the sidebar, Part 4).
- **Add:** **Payment & Delivery** card where Your Streaks was.
- **Free seminars:** shown on the dashboard **under Upcoming Classes** (they leave the icon bar).

**Decisions needed:** none (my reading: "My Classes ඒකෙන් අයින් කරන්න" = remove the My Classes card from
the dashboard; My Classes stays in the icon bar). Correct me if wrong.

**What changed:**
- Hero: the Student ID is a bigger, tightly set 8-digit number with a copy button.
- Removed: Your Streaks (still on Papers & Marks), Latest Paper Result, the "My classes · month" card, Support Center.
- New **Payment & Delivery** card (where the streaks were): latest class-fee slips with status (and the admin's note
  when rejected), latest tute-book orders with delivery status, **Pay class fees** → Store, **All payments**.
- **Free seminars** listed under Upcoming Classes (timetable / video count, "All free seminars" → Free Zone).
- Latest Notices moved to the left column so both columns stay balanced; English + Sinhala text.
- `npm run test:ui` checks the 8-digit ID, the pending → approved slip on the card, the Store link, the free
  seminar and that the removed cards are gone.

---

## Part 7 — My Classes ✅ (done)

> **Your message — 🔴 My Classes:** “Lesson hub, My class ඒවා අයින්” · “upcoming live session අයින්” · “my classes open කලාම ගෙවපු මාසෙ අදාල card එක … touch කලාම Recordings” · “තාරා පැටියා ඇනිමේෂන් එක අයින් කරන්නෙපා” · “Pay fees අයින් (payment කොටසෙ තියෙනවනෙ)”

- **Remove:** "Lesson hub" / "My class" tabs, the Upcoming Live Session block, and **Pay fees** (it's
  in Payments).
- **New flow:** My Classes shows **one card per paid month** → tap the card → that month's
  **recordings** (and tutes).
- **Keep the duck animation.**

**Decisions needed:** where does a student join a **live** class now? ⭐ The month card shows a
"Live now — Join" button during the join window, and the Dashboard's Upcoming Classes links to it.

**What changed:**
- My Classes shows **one card per paid month**, grouped by month (newest first): class banner, month,
  recording / tute counts, next live class date. Tapping a card opens that month's classroom.
- During a live class's join window the card shows a red **Live now · Join** button (→ the live section).
- Removed: the Learning Hub / My Class / Upcoming live sessions / Free Zone tabs and **Pay Fees**.
  Pending or rejected slips show as a one-line note with a link to Payments.
- The duck (binders) animation is in the page header (and the empty state).
- Classroom: **Back → My Classes** link; recordings first, then tutes; the live block is at the top only
  while a class is live, at the bottom for upcoming sessions, and hidden when there are none.
- Page title is "My Classes" (was "My Class"); English + Sinhala.
- `npm run test:ui` checks the month card, counts, Live now · Join, removed tabs, the duck, card → classroom,
  Back, and Join → live section.

---

## Part 8 — Store, Events & Payments ✅ (done)

> **Your message — 🔴 Icon bar:** “Store … exam year එකට අදාලව හැම ක්ලාස් එකක්ම” · “filter: exam year, Online ද physical ද” · “ඒ ඒ අදාල ඒවා ඒ ඒ යටතෙ වැටෙන්නෙ” · “ඉරිකෑලි 3 … event” · “payment එක ඇතුකට ගියාම pay class fees එබුවම කෙලින්ම store එකට”

- **Store** (new icon-bar item): every class for the student's exam year, with filters:
  **exam year** and **Online / Physical** (physical = Panadura, Horana, Mathugama, Kalutara).
  Classes sorted into their matching sections.
- **Events** (new sidebar item): a list of events.
- **Payments:** "Pay class fees" button goes **straight to the Store**.

**Decisions needed:**
- What is an "Event"? ⭐ Admin-created items (title, date/time, place or online link, poster, optional
  class/batch) — seminars, paper days, exam dates, parent meetings — shown upcoming-first.
- Tute books: ⭐ stay in the Store under their own tab.

**What changed:**
- **Store** has **Classes** and **Tute books** tabs. Classes are filtered by **exam year** (opens on the
  student's own batch, "All years" one tap away) and **All / Online / Physical**, and grouped into
  **Online classes** and one section per center (Panadura, Horana, Mathugama, Kalutara). Filters live in the
  URL (`?tab=&year=&mode=`), so they can be shared; the public `/store` page has the same filters.
- **Events:** new **Admin → Events** page to add events (title, date, start / end time, place, online link,
  details, class / batch, poster) and show / hide / delete them; students see published events for their
  class and batch on **Events**.
- **Payments:** "Pay class fees" already goes straight to the Store.
- `npm run test:ui` checks the default year, center sections, Online / Physical / other-year filters, the
  Tute books tab, Payments → Store, the public store, and admin event create → student sees → hide.

---

## Part 9 — Papers & Marks, Leaderboard, Premium badge ✅ (done)

> **Your message:** 🔴 Paper & Marks — “leader board එහෙම්ම තියන්න” · “paper marks average 75 හෝ 80 පැන්නම … Auto premium verify badge … 70ට වඩා එක පේපරේකට හරි අඩු උනොත් නැතිවෙනවා … Achievements … leaderboard එකේ හැම අවුරුද්දකම … තමන්ගෙ අවුරුද්ද filter” · “rank එක බලාගන්න (center & All island)” · 🔴 Leaderboard — “exam year එකට අදාලව Top 3 stage කරලා අනික් 7 normal list” · “2025 අයත් … 2027 A/L badge එකටමයි … වරහන් ඇතුලෙ පොඩි notice එකක්”

- **Leaderboard stays inside Papers & Marks** (icon removed from the icon bar, Part 4).
- **Own rank vs others** on each paper: **center rank** and **all-island rank**.
- **Leaderboard layout:** for the student's exam year — **Top 3 on a podium**, then **places 4–10 as a
  normal list**; year filter to view other years.
- **Repeat students:** students re-sitting (they sat 2025/2026, now doing 2027) appear under **2027
  A/L**, with a small note in brackets, e.g. "(2nd attempt)".
- **Premium Verified badge ✓ (new):**
  - Earned automatically when the student's paper average reaches the threshold.
  - **Lost** if any single paper drops below **70%**.
  - Added to **Achievements** as a goal with progress.
  - Visible next to names on the leaderboard for **every year**.

**Decisions needed:**
- Threshold: **75% or 80%**? ⭐ 75%.
- Average over which papers? ⭐ All published papers of the current A/L year, minimum 3 papers.
- After losing it (a paper < 70%), can it come back? ⭐ Yes — it returns after the next 3 papers in a
  row are all ≥ 70% and the average is back above the threshold.

**What changed** (built with the ⭐ answers — say if you want 80% instead of 75%; it is one number in
`db/migrations/0012_premium_ranks.sql`):
- **Premium Verified ✓** is automatic: ≥ 3 papers of the student's batch, average ≥ 75 %; lost when a paper is
  below 70 %; back after 3 papers in a row at ≥ 70 % (and the average ≥ 75 %). Everyone sees who has it; only the
  student and admins see the details.
- Shown next to names on the **leaderboard** (every year / batch filter) and on each paper's leaderboard, on the
  dashboard and profile, as a **Premium Verified** card on Papers & Marks (status + what's still needed), and as
  the first **Achievement**.
- **Leaderboard:** top 3 on the podium, places 4–10 as a list, and "Your position" when you are further down.
  Repeat students show "(2nd attempt)" / "(3rd attempt)" under the batch they are sitting now, with a small note.
- **Papers & Marks:** every paper you sat shows your **all-island** and **center** rank.
- New database functions (`0012`): `season_board`, `paper_board` (+ attempt, batch, premium), `my_paper_ranks`,
  `is_premium`, `my_premium_status`; covered by `npm run test:sql` and `npm run test:ui`.

---

## Part 10 — My Profile + QR code + admin QR scanner ✅ (done)

> **Your message — 🔴 My Profile:** “කැමති pic එකක් … උඩ bar එකේ auto” · “Id එක කිව්ව විදිහට” · “attempt එක … නමට යටින් exam year” · “Google connect අයින්” · “My student id අයින්” · “Guardian number” · “whatsapp සහ අලුත් number වෙනස් කරගන්න” · “password change අයින් (logout වෙලා reset කලාම)” · “my qr code … යටින් name, attempt, exam year” · “Qr scan කරන්න admin panel එකේ වෙනම කොටසක්” · “scan කලාම … details, ගිය සතිවල paper marks, attend කලාද, exam year, attempt, center, institute”

**Profile (`src/app/dashboard/profile/`):**
- **Upload / change / remove a profile photo** (auto-resized in the browser, stored in the private `avatars` bucket); it automatically appears in the top bar.
- Student ID in the 8-digit format, with **Attempt** shown under the name alongside the exam-year chip.
- **Removed:** Google sign-in & Google connect (completely across login, register and profile), the "My Student ID" card, and "Change password" inside My Profile.
- **Forgot Password on `/login` (`/forgot-password`):** two-step 6-digit OTP reset via SMS (Notify.lk / Text.lk) and/or optional recovery e-mail (`SMTP_*`), with WhatsApp support fallback when no gateway is configured. Login and reset accept **mobile number or 8-digit Student ID**.
- **Guardian number**, **WhatsApp number**, and optional **recovery e-mail** editable by the student at any time (`0013_profile_reset_attendance.sql`).

**My QR code (`src/lib/qr.ts`):**
- Unique per student, with **name, 8-digit Student ID, attempt, exam year** printed under it.
- Holds only an HMAC-signed opaque token (`HM1.<id>.<sig>`) — no personal data inside.

**Attendance & QR Scanner (`/admin/attendance`):**
- Dedicated main menu tab **"Attendance & QR Scanner"** in the Admin sidebar + a quick-access **QR Scanner** shortcut button on the Admin top bar (`/admin/attendance?scan=1`).
- Camera scanner (`jsQR`) + manual 8-digit Student ID / mobile fallback. Shows: photo, name, Student ID, exam year & attempt, center, school/institute, city & district, mobile / WhatsApp / guardian numbers, **recent weeks' paper marks** (score + % or **Not attended**), and recent attendance days.
- Admin-only; `Permissions-Policy` opens `camera=(self)` only on `/admin/attendance`.

---

## Part 11 — Landing page (before login) ✅ (done)

> **Your message — 🔴 LOG වෙන්න කලින් තියෙන Previous Page එකේ:** “Youtube Subs දාලා තියෙන කොටුවට ලඟින් … සර්ගෙ ක්ලාස් ආව ලමයින්ගෙ මෙතෙක් A/B රිසාල්ට්ස් ගාන දාන්න දල වශයෙන්. + දාන්න ගාන ඉස්සරහින්.”

**What was built:**
- Added approximate **A/B Results** counter with a leading `+` (`+500` by default in `src/content/site.json`, and live-editable from the Owner Console in `/admin/owner`).
- Displayed right next to the **YouTube Subscribers** box in both the landing page Hero stat cards (`[data-testid="hero-ab-results"]`) and the Community & Social Proof strip (`[data-testid="community-ab-results"]`) in `src/components/landing/home-sections.tsx` and `src/app/page.tsx`.
- Localized in both English and Sinhala (`landing.json`).

---

## Part 12 — Admin panel & Owner Console (`/admin/owner`) ✅ (done)

> **Your message:** “do part 11 and 12. then in owner dash make a way tht i can abjust verification system like resend, text.lk, and others. also in there i can set api keys. and also only owners could be add admins, make admin accounts like things. and when an admin accept any recipt owner should have logs who accepted it and all details. and more things. make best.”

**What was built (`db/migrations/0014_owner_audit_settings.sql`, `src/lib/settings.ts`, `src/app/admin/owner/`):**
- **Dedicated `owner` Role Hierarchy (`student` < `admin` < `owner`):**
  - Added `'owner'` role to `profiles_role_check`, `public.is_owner()`, and tightened `public.protect_profile_fields()`, `admin_emails` RLS, and `profiles` delete RLS.
  - **Only Owners** can create admin/owner accounts, promote/demote staff, reset staff passwords, or delete staff accounts. Regular admins (`role = 'admin'`) cannot change anyone's role or edit/delete admin/owner profiles (`Admin → Students` hides role promotion for non-owners).
- **Receipt & Admin Action Audit Logs (`public.admin_audit_logs`):**
  - Database triggers (`audit_enrollment_review` & `audit_order_review`) and server action loggers automatically record every class-fee receipt approval, rejection, cash grant, store order review, staff account creation/role change, and system settings update.
  - Every receipt log stores the **reviewing admin/owner** (name + role badge), **student details** (name, 8-digit Student ID, mobile), **class / product**, **month**, **LKR amount**, **bank reference**, **slip preview link**, **admin note**, and **exact timestamp**.
  - Reviewed cards on `/admin/payments` (`[data-testid="receipt-reviewed-by"]`) and `/admin/store` now display `Reviewed by <Admin Name> · <Date/Time>`.
  - Owners get a filterable Audit Log table (`All / Receipts / Orders / Staff / Settings` + search) and **1-click CSV export** on `/admin/owner`.
- **Verification System, Encrypted API Keys & Landing Counters (`/admin/owner`):**
  - Stored in server-only `public.system_settings` with **AES-256-GCM encryption** (`src/lib/settings.ts`) for all API keys, secrets, and passwords (never returned in plaintext to the browser; shown masked).
  - Configurable **E-mail OTP gateway** (**Resend HTTP API** with API key + sender address/name, **Custom SMTP**, or disabled) and **SMS OTP gateway** (**Text.lk**, **Notify.lk**, **Custom SMS Webhook**, or disabled), plus **WhatsApp support fallback** and **Student Sign-up Recovery E-mail policy** (`optional` / `required` / `off`).
  - Live **"Send Test OTP"** tool in `/admin/owner` to test Email or SMS delivery immediately.
  - Live **Landing Page Highlights** editor (`+500` A/B Results, YouTube Subscribers, Free Video Lessons) on `/admin/owner`.

---

## Part 13 — Look & feel: colours, icons, calmer motion (Theme change) 🎨

> **Your message — 🔴 Bugs බලන්න:** “icon bar එකේ animation ගතිය වැඩි සහ site එකේම. (මම ලස්සනයි කිව්ව එක හැර) … පොඩ්ඩක් smooth premium icons දාන්න” · “site එකෙ orange colour එක පුලුවන් නම් අයින් කරලා premium Colours” · “logo එක පස්සෙ මම හොඳ එකක් දෙන්නම් දැනට ඕක තියන්න” · (duck: 🔴 My Classes — “තාරා පැටියා ඇනිමේෂන් එක ලස්සනයි අයින් කරන්නෙපා”)

*(Moved to the end per your request so all functional screens and data are finished first.)*

- **Replace the orange** with a premium palette across the site (buttons, gradients, charts, badges).
- **Calmer animation** in the icon bar and across the site: shorter, subtler transitions; respect
  "reduce motion". **Keep the duck animation in My Classes** (you like it).
- **Premium, consistent icons** (one icon style everywhere instead of the mix).
- **Logo stays as-is** for now — swapped when you send the new one.

**Decisions needed:**
- Palette. ⭐ I prepare 3 options on one preview page (e.g. *deep navy + teal + soft gold*,
  *midnight indigo + emerald*, *charcoal + royal blue*) and you pick one.
- Keep the animated Telegram stickers? ⭐ Keep them on the landing page and empty states; use plain
  icons in menus and buttons.

---

## Part 14 — Testing on all devices & browsers

> **Your message — 🔴 Bugs බලන්න:** “Pc, lap, phone, tab වලට සහ browser එකට test කරන්න site එක, bugs සමහරවිට අහුවෙයි.”

- Automated browser runs (Chromium, Firefox, WebKit/Safari) at phone, tablet, laptop and desktop sizes,
  for student and admin journeys; screenshots of every page in both languages.
- Keep `npm run test:ui` (already ported to the self-hosted backend) in step with each part's changes.
- Fix every bug found; report the list.

---

## Working rules

- One part per branch / pull request; each ships after its tests pass.
- All new text in both English and Sinhala (`npm run test:i18n` must pass).
- Every database change is a new `db/migrations/00NN_*.sql` file that is safe to re-run.
