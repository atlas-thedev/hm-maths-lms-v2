# HM Maths LMS — Hasitha Madusanka · A/L Combined Mathematics

Tuition LMS (English + සිංහල, Sinhala by default), self-hosted on one Ubuntu server:
Next.js 15 (App Router, Server Actions, TypeScript) · Tailwind + shadcn-style UI · Framer Motion ·
PostgreSQL with row-level security · PostgREST (local only) · files on disk · Nginx behind Cloudflare.
Recorded lessons are unlisted YouTube videos.

Server setup, updates, admin accounts, logs and backups: **[deploy/README.md](deploy/README.md)**.
Planned work: **[PLAN.md](PLAN.md)**.

## 1. Architecture

| Piece | Where | Notes |
| --- | --- | --- |
| Website | `src/app` (Next.js on 127.0.0.1:3000) | Pages, server actions, API routes |
| Database client | `src/lib/db/*` | Our own small client: `rest.ts` (PostgREST query builder over `fetch`), `core.ts`/`server.ts` (login, sessions, `from` / `rpc` / `storage` / `auth`), `pg.ts` (direct connection for login and files). No third-party database SDK. |
| Database | `deploy/00_bootstrap.sql` → `db/migrations/0001…0010` → `deploy/99_grants.sql` | Re-applied on every deploy — every file must stay safe to re-run |
| Login | `src/lib/db/core.ts`, `server.ts`, `jwt.ts` | bcrypt passwords in `auth.users`; 30-day signed cookie `hm_session` tied to a row in `auth.sessions` (logout revokes it; a password change revokes all) |
| Browser → DB | `/api/rest/*` | Same-origin proxy to PostgREST; adds the session token only for a live session |
| Files | `STORAGE_DIR/<bucket>/…`, `/api/storage/*` | Upload checks real file type + `storage.objects` RLS; downloads via short-lived signed links |
| Security headers | `src/lib/db/middleware.ts`, `next.config.ts` | Per-request CSP with a script nonce, HSTS, frame/permission policies |

## 2. Run locally

Needs PostgreSQL + PostgREST (see `deploy/README.md` for the same setup the server uses).

```bash
npm ci
cp .env.example .env.local   # fill in DATABASE_URL, JWT_SECRET, STORAGE_DIR, …
npm run dev                  # http://localhost:3000
```

## 3. Things to customise (no coding needed)

**All text on the site lives in JSON** — edit, save, redeploy:

| What | Where |
| --- | --- |
| Every label, heading, button, error message (English) | `src/i18n/messages/en/*.json` |
| Same in Sinhala | `src/i18n/messages/si/*.json` (missing keys fall back to English) |
| Home page: hero text, announcements ticker, story milestones, testimonials, FAQ, placeholder classes | `src/i18n/messages/<lang>/landing.json` |
| Dashboard banner slides | `portal.json` → `dashboard.banners` |
| Phone, WhatsApp, e-mail, address, social links, bank accounts, WhatsApp channels, testimonial YouTube video ID | `src/content/site.json` |
| Tutor photo on the hero / photo on login & register | drop `public/images/tutor.png` (transparent PNG) and `public/images/auth-bg.jpg` — shown automatically when present |
| Brand colours (every colour on the site, light + dark) | `src/theme/theme.css` — see "Design system" below |
| Name, logo, browser colour | `src/config/brand.ts` (custom logo file goes in `public/brand/`) |
| Pre-join window (20 min) / live length | `src/lib/constants.ts` → `LIVE_UNLOCK_MINUTES`, `LIVE_DURATION_MINUTES` |

Files: `common.json` (shared words, statuses, months), `landing.json` (home page), `auth.json` (login/register), `portal.json` (student area), `admin.json` (admin panel), `errors.json` (all validation/server messages). Keep `{placeholders}` like `{name}` unchanged. Run `npm run test:i18n` after editing.

## 4. Design system (UI library)

Everything visual comes from three places — pages never hard-code colours:

| What | Where | Notes |
| --- | --- | --- |
| **Colours** | `src/theme/theme.css` | One `--brand-50…950` scale (HM orange) drives buttons, links, badges, charts, gradients and the logo. Status colours (`success`, `warning`, `destructive`, `info`, `highlight`), medal colours, class-poster gradients and dark-mode values live in the same file. Values are HSL numbers (`22 95% 48%`). |
| **Brand** | `src/config/brand.ts` | Site name, owner, description, logo (`logo.image: "/brand/logo.svg"` to use your own file, `null` for the built-in "hm" mark that follows the brand colours) and phone status-bar colours. |
| **Components** | `src/components/ui` (import from `@/components/ui`) | `Button`/`ButtonLink`, `Card` (+ `CardHeader` with title/icon/action, `CardAction`, `CardSubheading`), `HeroCard`/`HeroPanel`/`HeroChip`, `StatCard`, `ActionCard`, `MetricTile`, `ListRow`, `IconTile`, `Badge`, `CountBadge`, `ChipLink`/`ChipButton`/`ChipGroup`, `Alert`, `ProgressBar`, `Avatar`, `EmptyState`, `PageHeader`, `Table`, form fields. Colour props take a **tone**: `brand · success · warning · danger · info · highlight · neutral · dark`. |

**See it live:** sign in as staff and open **`/admin/ui`** (account menu → *UI kit*) — every component in every tone, plus the brand scale. Change `theme.css`, rebuild, and check that page.

Rules for new screens: build with the library components; use theme classes (`bg-primary`, `text-muted-foreground`, `bg-success-soft`, `bg-gradient-brand`, `brand-*`) — no hex colours and no Tailwind palette colours like `emerald-500`.

## 5. How it works

- **Students** register (name, mobile, NIC, A/L year, center, school, district, address, captcha) and log in with their **mobile number** (mapped to an internal `…@students.hmmaths.lk` e-mail; that domain is never accepted from Google sign-in). A database trigger creates the profile and Student ID.
- **Google sign-in** (optional, OIDC + PKCE) — enabled when `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are set.
- **Free Zone** – classes marked *Free* are open to every registered student.
- **Paid classes** – the student picks a month, uploads a bank slip → `pending`; the admin approves → that month unlocks (recordings, tutes, live link). Cash payments: "Grant access manually".
- **Classroom** – live link readable from the database only from 20 min before start until 30 min after the end, and only for paid months. Recordings play in a locked player with a phone + NIC watermark.
- **Exams** – MCQ timing and marking happen inside Postgres (`start_exam` / `submit_mcq`); the answer key is shown in the review only after the paper closes; late submissions are not ranked. Structured papers: upload answer-sheet photos, the admin grades.
- **Papers & marks** – admin enters marks; paper / center / all-island leaderboards (other students' Student ID and school are not shown), streaks and badges.
- **Notifications (bell)** – payment approved / rejected, tute order updates, admin site updates and Notices (General / Urgent / Exam Notice, optionally targeted to a class and/or batch) in one page with an unread count; the portal checks for new ones every 30 s.

## 6. Tests

- `npm run typecheck` – TypeScript.
- `npm run test:sql` – applies every migration twice in an in-memory Postgres (PGlite) and checks the RLS / workflow / exam / leaderboard rules offline.
- `npm run test:i18n` – translation key/placeholder parity + every `t("…")` key used in code exists.
- `npm run test:rest` – the PostgREST client against a real database (filters, embedded tables, counts, upsert, rpc, RLS errors).
- `npm run test:ui` – Playwright journey: register → login → enroll with a slip → admin approves → classroom → MCQ → leaderboard, English + Sinhala, phone + desktop.

`test:rest` and `test:ui` need a database. `bash scripts/dev-stack.sh up` starts a throwaway PostgreSQL (:55442) and PostgREST (:55443) under `.dev-stack/` (never the production one); `eval "$(bash scripts/dev-stack.sh env)"` exports the variables. Run `npm run dev:db` to start it.
