-- ════════════════════════════════════════════════════════════════════════════
-- HM Maths LMS · 0006 — Security hardening (self-hosted). Safe to re-run.
--  1. One-time captcha tokens (used_captchas) so a solved captcha cannot be replayed.
--  2. Students can only order active products.
--  3. Anonymous visitors cannot call the security-definer helpers / exam RPCs at all.
--  4. storage.objects: student uploads must use a safe file name + allowed extension
--     (blocks .svg/.html "bank slips" that could run script when an admin opens them).
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.used_captchas (
  nonce      text primary key,
  expires_at timestamptz not null
);
alter table public.used_captchas enable row level security;
revoke all on public.used_captchas from anon, authenticated;

drop policy if exists "orders student insert" on public.orders;
create policy "orders student insert" on public.orders for insert to authenticated
  with check (public.is_admin() or (
    student_id = auth.uid()
    and slip_url like auth.uid()::text || '/%'
    and exists (select 1 from public.products p where p.id = product_id and p.is_active)
  ));

do $$
declare f text;
begin
  foreach f in array array[
    'public.can_read_class_file(text)', 'public.can_read_paper_file(text)', 'public.get_exam_review(uuid)',
    'public.get_leaderboard(uuid)', 'public.has_class_access(uuid, text)', 'public.live_window_open(uuid)',
    'public.my_al_year()', 'public.start_exam(uuid)', 'public.submit_mcq(uuid, jsonb)',
    'public.submit_structured(uuid, text[])', 'public.generate_class_sessions(uuid, text, text)']
  loop
    if to_regprocedure(f) is not null then
      execute format('revoke execute on function %s from public, anon', f);
      execute format('grant execute on function %s to authenticated', f);
    end if;
  end loop;
end $$;

-- Student uploads: "<uid>/<safe-name>.(jpg|jpeg|png|webp|pdf)" only.
drop policy if exists "own uploads insert" on storage.objects;
create policy "own uploads insert" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('bank-slips','answer-sheets')
    and split_part(name, '/', 1) = auth.uid()::text
    and name ~ '^[0-9a-f-]{36}/([A-Za-z0-9_-]+/)?[A-Za-z0-9_.-]{1,100}\.(jpg|jpeg|png|webp|pdf)$'
  );
