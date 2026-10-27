-- ════════════════════════════════════════════════════════════════════════════
-- HM Maths LMS · 0016 — Developer role. Safe to re-run.
--  'student' < 'admin' < 'owner' < 'developer'
--  • A developer can do everything an owner can (is_admin / is_owner are true) and also opens the
--    Developer panel (/dev): theme, maintenance mode, announcements, system health, tools.
--  • Only a developer can change a developer account; owners cannot demote or edit developers.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add  constraint profiles_role_check
  check (role in ('student', 'admin', 'owner', 'developer'));

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'owner', 'developer'));
$$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('owner', 'developer'));
$$;

create or replace function public.is_developer()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'developer');
$$;
grant execute on function public.is_developer() to anon, authenticated;

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
    if old.role in ('admin', 'owner', 'developer') and old.id is distinct from auth.uid() then
      raise exception 'Only the owner can modify admin or owner accounts';
    end if;
    new.role := old.role;
    new.id   := old.id;
  elsif auth.uid() is not null and not public.is_developer() then
    -- Owners manage admins and owners, but developer accounts (and the developer role) are off-limits.
    if (old.role = 'developer' or new.role = 'developer') and old.id is distinct from auth.uid() then
      raise exception 'Only a developer can modify developer accounts';
    end if;
    if old.role = 'developer' then new.role := old.role; end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop policy if exists "profiles admin delete" on public.profiles;
create policy "profiles admin delete" on public.profiles for delete to authenticated
  using (public.is_developer() or (public.is_owner() and role <> 'developer') or (public.is_admin() and role = 'student'));
