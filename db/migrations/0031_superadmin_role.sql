-- ════════════════════════════════════════════════════════════════════════════
-- HM Maths LMS · 0031 — Superadmin role above developer. Safe to re-run.
--  'student' < 'admin' < 'owner' < 'developer' < 'superadmin'
--  • A superadmin can do everything a developer can (is_admin / is_owner / is_developer are true).
--  • Only a superadmin can modify or delete superadmin accounts, or promote/demote superadmins.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add  constraint profiles_role_check
  check (role in ('student', 'admin', 'owner', 'developer', 'superadmin'));

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'owner', 'developer', 'superadmin'));
$$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('owner', 'developer', 'superadmin'));
$$;

create or replace function public.is_developer()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('developer', 'superadmin'));
$$;

create or replace function public.is_superadmin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'superadmin');
$$;
grant execute on function public.is_superadmin() to anon, authenticated;

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
    if old.role in ('admin', 'owner', 'developer', 'superadmin') and old.id is distinct from auth.uid() then
      raise exception 'Only the owner can modify admin or owner accounts';
    end if;
    new.role := old.role;
    new.id   := old.id;
  elsif auth.uid() is not null and not public.is_developer() then
    -- Owners manage admins and owners, but developer & superadmin accounts are off-limits.
    if (old.role in ('developer', 'superadmin') or new.role in ('developer', 'superadmin')) and old.id is distinct from auth.uid() then
      raise exception 'Only a developer or superadmin can modify developer accounts';
    end if;
    if old.role in ('developer', 'superadmin') then new.role := old.role; end if;
  elsif auth.uid() is not null and not public.is_superadmin() then
    -- Developers manage developers and below, but superadmin accounts (and the superadmin role) are off-limits.
    if (old.role = 'superadmin' or new.role = 'superadmin') and old.id is distinct from auth.uid() then
      raise exception 'Only a superadmin can modify superadmin accounts';
    end if;
    if old.role = 'superadmin' then new.role := old.role; end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop policy if exists "profiles admin delete" on public.profiles;
create policy "profiles admin delete" on public.profiles for delete to authenticated
  using (
    public.is_superadmin()
    or (public.is_developer() and role <> 'superadmin')
    or (public.is_owner() and role not in ('developer', 'superadmin'))
    or (public.is_admin() and role = 'student')
  );
