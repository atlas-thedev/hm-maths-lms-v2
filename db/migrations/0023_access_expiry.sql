-- Migration 0023: paid class access lasts 40 days from approval.
-- Safe to re-run.
--
-- enrollments.access_until: when this paid month stops opening. Set to approval + 40 days automatically;
-- staff can pick another date when granting access by hand (cash / old months). Rows approved before this
-- migration keep NULL = no expiry, so nobody loses access on deploy. Keep 40 in sync with ACCESS_DAYS
-- in src/lib/constants.ts.

alter table public.enrollments add column if not exists access_until timestamptz;

create or replace function public.guard_enrollment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null and not public.is_admin() then
      new.status := 'pending'; new.reviewed_by := null; new.reviewed_at := null; new.admin_note := null;
      new.access_until := null;
      select fee into new.amount from public.classes where id = new.class_id;
    elsif new.status in ('approved', 'rejected') then
      new.reviewed_at := coalesce(new.reviewed_at, now());
      new.reviewed_by := coalesce(auth.uid(), new.reviewed_by);
      if new.status = 'approved' then
        new.access_until := coalesce(new.access_until, now() + interval '40 days');
      end if;
    end if;
    return new;
  end if;
  -- UPDATE
  if auth.uid() is not null and not public.is_admin() then
    -- A student re-submitting a slip (rejected, or an approved month whose access ran out).
    new.student_id := old.student_id; new.class_id := old.class_id; new.month := old.month;
    new.amount := old.amount; new.status := 'pending';
    new.reviewed_by := null; new.reviewed_at := null; new.admin_note := null;
    new.access_until := null;
    new.created_at := now();
  elsif new.status is distinct from old.status then
    new.reviewed_at := now();
    new.reviewed_by := coalesce(auth.uid(), new.reviewed_by, old.reviewed_by);
    -- (Re-)approved: a fresh 40 days, unless staff set the date in this same update.
    if new.status = 'approved' and new.access_until is not distinct from old.access_until then
      new.access_until := now() + interval '40 days';
    end if;
  end if;
  return new;
end;
$$;

-- Access check used by lessons, live links, tutes, exams and notices: an approved month opens until access_until.
create or replace function public.has_class_access(p_class uuid, p_month text default null)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    public.is_admin()
    or exists (select 1 from public.classes c where c.id = p_class and c.is_free and c.is_active)
    or exists (
      select 1 from public.enrollments e
      where e.student_id = auth.uid() and e.class_id = p_class and e.status = 'approved'
        and (p_month is null or e.month = p_month)
        and (e.access_until is null or e.access_until > now())
    )
    or exists (
      select 1 from public.enrollments e
      join public.combo_items ci on ci.combo_id = e.class_id
      where e.student_id = auth.uid() and ci.class_id = p_class and e.status = 'approved'
        and (p_month is null or e.month = p_month)
        and (e.access_until is null or e.access_until > now())
    )
  );
$$;

-- Students may re-submit a slip for a rejected month, or for an approved month whose access has expired.
drop policy if exists "enrollments student resubmit" on public.enrollments;
create policy "enrollments student resubmit" on public.enrollments for update to authenticated
  using (public.is_admin() or (student_id = auth.uid() and (
    status in ('pending', 'rejected')
    or (status = 'approved' and access_until is not null and access_until <= now())
  )))
  with check (public.is_admin() or (student_id = auth.uid() and slip_url like auth.uid()::text || '/%'));
