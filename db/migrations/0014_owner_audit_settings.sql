-- ════════════════════════════════════════════════════════════════════════════
-- HM Maths LMS · 0014 — Owner role, receipt & action audit logs, system settings (PLAN.md Parts 11 & 12). Safe to re-run.
--  1. Adds 'owner' role above 'admin' ('student' < 'admin' < 'owner').
--     Promotes existing admin(s) to 'owner' once when this migration first runs.
--  2. Tightens profile & allow-list guards so only owners can promote/demote admins or edit other admin accounts.
--  3. Adds reviewed_by on orders and ensures both enrollments (including cash grants) and orders stamp reviewer + timestamp.
--  4. Creates admin_audit_logs (owner-readable via RLS) + automatic triggers for receipt approvals/rejections,
--     cash grants, store order reviews, and role changes.
--  5. Creates system_settings (server-only table for verification providers, encrypted API keys, and landing stats).
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Owner role & helper functions ───────────────────────────────────────
alter table public.profiles drop constraint if exists profiles_role_check;
-- 'developer' (added in 0016) is listed here too: every deploy re-runs all migrations in order, and this
-- must not reject developer accounts that already exist.
alter table public.profiles add  constraint profiles_role_check
  check (role in ('student', 'admin', 'owner', 'developer'));

-- Promote existing admin account(s) to 'owner' only on first application of 0014
-- (before admin_audit_logs exists), so re-running migrations on deploy never re-promotes a demoted account.
do $$
begin
  if to_regclass('public.admin_audit_logs') is null then
    update public.profiles
       set role = 'owner'
     where role = 'admin'
       and not exists (select 1 from public.profiles where role = 'owner');
  end if;
end $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'owner'));
$$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'owner');
$$;
grant execute on function public.is_owner() to anon, authenticated;

-- Update handle_new_user() so optional recovery_email from sign-up metadata is saved on profile creation.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta      jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_admin   boolean := exists (select 1 from public.admin_emails a where lower(a.email) = lower(new.email));
  v_year    int := nullif(meta->>'al_year', '')::int;
  v_attempt int := case when meta->>'attempt' in ('1','2','3') then (meta->>'attempt')::int else 1 end;
  v_rec     text := lower(trim(coalesce(meta->>'recovery_email', '')));
begin
  insert into public.profiles (id, full_name, mobile, nic, al_year, attempt, whatsapp, guardian_mobile, recovery_email,
                               town, school, district, address, city, postal_code, role, student_id)
  values (
    new.id,
    coalesce(nullif(meta->>'full_name', ''), split_part(new.email, '@', 1)),
    nullif(meta->>'mobile', ''),
    nullif(upper(meta->>'nic'), ''),
    v_year,
    v_attempt,
    case when meta->>'whatsapp' ~ '^07\d{8}$' then meta->>'whatsapp' end,
    case when meta->>'guardian_mobile' ~ '^07\d{8}$' then meta->>'guardian_mobile' end,
    case when v_rec ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(v_rec) <= 254 then v_rec end,
    coalesce(nullif(meta->>'town', ''), 'Online'),
    nullif(meta->>'school', ''),
    nullif(meta->>'district', ''),
    nullif(left(meta->>'address', 300), ''),
    nullif(left(meta->>'city', 80), ''),
    nullif(left(meta->>'postal_code', 12), ''),
    case when v_admin then 'admin' else 'student' end,
    case when v_admin then null else public.generate_student_id(v_year) end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ─── 2. Role & profile protection (only owner can change roles or edit staff) ─
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role       := old.role;
    new.student_id := old.student_id;
    new.mobile     := old.mobile;
    new.nic        := old.nic;
    new.al_year    := old.al_year;
    new.attempt    := old.attempt;
    new.id         := old.id;
  elsif auth.uid() is not null and not public.is_owner() then
    if old.role in ('admin', 'owner') and old.id is distinct from auth.uid() then
      raise exception 'Only the owner can modify admin or owner accounts';
    end if;
    new.role := old.role;
    new.id   := old.id;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop policy if exists "admin_emails admin" on public.admin_emails;
drop policy if exists "admin_emails read" on public.admin_emails;
drop policy if exists "admin_emails owner write" on public.admin_emails;
create policy "admin_emails read" on public.admin_emails for select to authenticated
  using (public.is_admin());
create policy "admin_emails owner write" on public.admin_emails for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

drop policy if exists "profiles admin delete" on public.profiles;
create policy "profiles admin delete" on public.profiles for delete to authenticated
  using (public.is_owner() or (public.is_admin() and role = 'student'));

-- ─── 3. Reviewer tracking on enrollments & orders ───────────────────────────
alter table public.orders add column if not exists reviewed_by uuid references public.profiles (id) on delete set null;

create or replace function public.guard_enrollment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null and not public.is_admin() then
      new.status := 'pending'; new.reviewed_by := null; new.reviewed_at := null; new.admin_note := null;
      select fee into new.amount from public.classes where id = new.class_id;
    elsif new.status in ('approved', 'rejected') then
      new.reviewed_at := coalesce(new.reviewed_at, now());
      new.reviewed_by := coalesce(auth.uid(), new.reviewed_by);
    end if;
    return new;
  end if;
  -- UPDATE
  if auth.uid() is not null and not public.is_admin() then
    new.student_id := old.student_id; new.class_id := old.class_id; new.month := old.month;
    new.amount := old.amount; new.status := 'pending';
    new.reviewed_by := null; new.reviewed_at := null; new.admin_note := null;
    new.created_at := now();
  elsif new.status is distinct from old.status then
    new.reviewed_at := now();
    new.reviewed_by := coalesce(auth.uid(), new.reviewed_by, old.reviewed_by);
  end if;
  return new;
end;
$$;

create or replace function public.guard_order()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'UPDATE' then
      raise exception 'Orders can only be changed by an admin';
    end if;
    new.status := 'pending'; new.admin_note := null; new.reviewed_at := null; new.reviewed_by := null;
    select numeric_mul(price, new.quantity::numeric) into new.amount from public.products where id = new.product_id;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    new.reviewed_at := now();
    new.reviewed_by := coalesce(auth.uid(), new.reviewed_by, old.reviewed_by);
  end if;
  return new;
end;
$$;

-- ─── 4. Admin & Receipt Audit Logs ──────────────────────────────────────────
create table if not exists public.admin_audit_logs (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references public.profiles (id) on delete set null,
  actor_name   text,
  actor_role   text,
  category     text not null check (category in ('receipt', 'order', 'staff', 'student', 'settings', 'attendance')),
  action       text not null,
  target_id    text,
  student_id   uuid references public.profiles (id) on delete set null,
  student_name text,
  student_code text,
  summary      text not null,
  details      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists admin_audit_logs_created_idx  on public.admin_audit_logs (created_at desc);
create index if not exists admin_audit_logs_actor_idx    on public.admin_audit_logs (actor_id, created_at desc);
create index if not exists admin_audit_logs_category_idx on public.admin_audit_logs (category, created_at desc);
alter table public.admin_audit_logs enable row level security;

drop policy if exists "audit_logs owner read" on public.admin_audit_logs;
create policy "audit_logs owner read" on public.admin_audit_logs for select to authenticated
  using (public.is_owner());
grant select on public.admin_audit_logs to authenticated;

create or replace function public.audit_enrollment_review()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor_id     uuid := coalesce(new.reviewed_by, auth.uid());
  v_actor_name   text;
  v_actor_role   text;
  v_student_name text;
  v_student_code text;
  v_student_mob  text;
  v_class_title  text;
  v_class_fee    numeric(10,2);
  v_action       text;
begin
  if new.status in ('approved', 'rejected')
     and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    if v_actor_id is not null then
      select full_name, role into v_actor_name, v_actor_role from public.profiles where id = v_actor_id;
    end if;
    select full_name, student_id, mobile into v_student_name, v_student_code, v_student_mob
      from public.profiles where id = new.student_id;
    select title, fee into v_class_title, v_class_fee
      from public.classes where id = new.class_id;

    if tg_op = 'INSERT' and new.status = 'approved' and new.slip_url is null then
      v_action := 'cash_grant';
    elsif new.status = 'approved' then
      v_action := 'receipt_approved';
    else
      v_action := 'receipt_rejected';
    end if;

    insert into public.admin_audit_logs (
      actor_id, actor_name, actor_role, category, action, target_id,
      student_id, student_name, student_code, summary, details
    ) values (
      v_actor_id,
      coalesce(v_actor_name, 'System / Admin'),
      coalesce(v_actor_role, 'admin'),
      'receipt',
      v_action,
      new.id::text,
      new.student_id,
      v_student_name,
      v_student_code,
      coalesce(v_class_title, 'Class') || ' · ' || new.month,
      jsonb_build_object(
        'enrollment_id', new.id,
        'class_id', new.class_id,
        'class_title', v_class_title,
        'month', new.month,
        'amount', coalesce(new.amount, v_class_fee),
        'bank_ref', new.bank_ref,
        'slip_url', new.slip_url,
        'admin_note', new.admin_note,
        'prev_status', case when tg_op = 'UPDATE' then old.status else null end,
        'new_status', new.status,
        'student_mobile', v_student_mob
      )
    );
  end if;
  return null;
end;
$$;

drop trigger if exists enrollments_audit on public.enrollments;
create trigger enrollments_audit after insert or update on public.enrollments
  for each row execute function public.audit_enrollment_review();

create or replace function public.audit_order_review()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor_id     uuid := coalesce(new.reviewed_by, auth.uid());
  v_actor_name   text;
  v_actor_role   text;
  v_student_name text;
  v_student_code text;
  v_student_mob  text;
  v_prod_title   text;
begin
  if new.status in ('approved', 'rejected', 'shipped')
     and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    if v_actor_id is not null then
      select full_name, role into v_actor_name, v_actor_role from public.profiles where id = v_actor_id;
    end if;
    select full_name, student_id, mobile into v_student_name, v_student_code, v_student_mob
      from public.profiles where id = new.student_id;
    select title into v_prod_title
      from public.products where id = new.product_id;

    insert into public.admin_audit_logs (
      actor_id, actor_name, actor_role, category, action, target_id,
      student_id, student_name, student_code, summary, details
    ) values (
      v_actor_id,
      coalesce(v_actor_name, 'System / Admin'),
      coalesce(v_actor_role, 'admin'),
      'order',
      'order_' || new.status,
      new.id::text,
      new.student_id,
      v_student_name,
      v_student_code,
      coalesce(v_prod_title, 'Order') || ' × ' || new.quantity::text,
      jsonb_build_object(
        'order_id', new.id,
        'product_id', new.product_id,
        'product_title', v_prod_title,
        'quantity', new.quantity,
        'amount', new.amount,
        'delivery_address', new.delivery_address,
        'slip_url', new.slip_url,
        'admin_note', new.admin_note,
        'prev_status', case when tg_op = 'UPDATE' then old.status else null end,
        'new_status', new.status,
        'student_mobile', v_student_mob
      )
    );
  end if;
  return null;
end;
$$;

drop trigger if exists orders_audit on public.orders;
create trigger orders_audit after insert or update on public.orders
  for each row execute function public.audit_order_review();

revoke all on function public.audit_enrollment_review(), public.audit_order_review() from public, anon, authenticated;

-- ─── 5. System Settings (server-only) ───────────────────────────────────────
create table if not exists public.system_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.system_settings enable row level security;
revoke all on public.system_settings from anon, authenticated;
