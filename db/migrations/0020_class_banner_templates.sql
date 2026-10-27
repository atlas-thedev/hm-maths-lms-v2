-- ════════════════════════════════════════════════════════════════════════════
-- HM Maths LMS · 0020 — class banner templates. Safe to re-run.
--  classes.banner_config = { template, headlineMode, headline, badge, subtitle, tagline } when the banner is
--  made from a template (the month is filled in automatically when the banner is shown); null = uploaded picture.
-- ════════════════════════════════════════════════════════════════════════════
alter table public.classes add column if not exists banner_config jsonb;
