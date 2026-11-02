-- Migration 0024: tute delivery tracking.
-- Safe to re-run.
--
-- deliveries: one row per parcel to send — a class's monthly tute (one per student + class + month) or an
-- approved tute-book order. Rows are created automatically when a slip / order is approved.
--   status:  to_pack → packed → posted → delivered   (or returned; skipped = no tute that month)
--   method:  post (courier / post) | class (handed over at a physical class)
-- tute_skips: a class + month with no printed tute. Marking one skips that month's waiting parcels; removing
-- it puts them back (and adds any students approved meanwhile).
-- classes.posts_tutes = false: a class that never posts a printed tute.

alter table public.classes add column if not exists posts_tutes boolean not null default true;

create table if not exists public.tute_skips (
  class_id   uuid not null references public.classes (id) on delete cascade,
  month      text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  note       text check (char_length(coalesce(note, '')) <= 200),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (class_id, month)
);

create table if not exists public.deliveries (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.profiles (id) on delete cascade,
  kind         text not null check (kind in ('class_tute', 'order')),
  class_id     uuid references public.classes (id) on delete cascade,
  month        text check (month is null or month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  order_id     uuid unique references public.orders (id) on delete cascade,
  status       text not null default 'to_pack' check (status in ('to_pack', 'packed', 'posted', 'delivered', 'returned', 'skipped')),
  method       text not null default 'post' check (method in ('post', 'class')),
  address      text check (char_length(coalesce(address, '')) <= 600),
  phone        text check (char_length(coalesce(phone, '')) <= 30),
  courier      text check (char_length(coalesce(courier, '')) <= 60),
  tracking_no  text check (char_length(coalesce(tracking_no, '')) <= 80),
  note         text check (char_length(coalesce(note, '')) <= 300),
  posted_at    timestamptz,
  delivered_at timestamptz,
  updated_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint deliveries_kind_fields check (
    (kind = 'class_tute' and class_id is not null and month is not null) or (kind = 'order' and order_id is not null))
);
create unique index if not exists deliveries_class_tute_uniq on public.deliveries (student_id, class_id, month) where kind = 'class_tute';
create index if not exists deliveries_status_idx on public.deliveries (status, created_at);
create index if not exists deliveries_student_idx on public.deliveries (student_id, created_at desc);

alter table public.deliveries enable row level security;
alter table public.tute_skips enable row level security;
drop policy if exists "deliveries read own or admin" on public.deliveries;
create policy "deliveries read own or admin" on public.deliveries for select to authenticated
  using (student_id = auth.uid() or public.is_admin());
drop policy if exists "deliveries admin write" on public.deliveries;
create policy "deliveries admin write" on public.deliveries for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "tute_skips read" on public.tute_skips;
create policy "tute_skips read" on public.tute_skips for select to authenticated using (true);
drop policy if exists "tute_skips admin write" on public.tute_skips;
create policy "tute_skips admin write" on public.tute_skips for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.deliveries, public.tute_skips to authenticated;

-- Where to post: the student's profile address (snapshot, staff can edit it on the parcel) and phone.
create or replace function public.profile_post_address(p_student uuid)
returns table (address text, phone text) language sql stable security definer set search_path = public as $$
  select nullif(concat_ws(E'\n', nullif(p.address, ''), nullif(concat_ws(' ', nullif(p.city, ''), nullif(p.postal_code, '')), ''), nullif(p.district, '')), ''),
         coalesce(nullif(p.mobile, ''), nullif(p.whatsapp, ''))
    from public.profiles p where p.id = p_student;
$$;

-- Queue a class tute for an approved month, unless the class doesn't post tutes or that month has none.
-- Students who chose a physical center (or paid cash at class) get it handed over at class.
create or replace function public.queue_class_tute(p_student uuid, p_class uuid, p_month text, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.classes c where c.id = p_class and c.posts_tutes and not c.is_free and c.class_type <> 'Combo') then return; end if;
  if exists (select 1 from public.tute_skips s where s.class_id = p_class and s.month = p_month) then return; end if;
  insert into public.deliveries (student_id, kind, class_id, month, method, address, phone, note)
  select p_student, 'class_tute', p_class, p_month,
         case when p_note ilike '[භෞතිකව%' or p_note = 'Paid at class (cash)' then 'class' else 'post' end,
         a.address, a.phone,
         case when p_note ilike '[භෞතිකව%' then substring(p_note from '^\[([^\]]+)\]') end
    from public.profile_post_address(p_student) a
  on conflict (student_id, class_id, month) where kind = 'class_tute' do nothing;
end;
$$;

create or replace function public.enrollment_queue_tute()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    perform public.queue_class_tute(new.student_id, new.class_id, new.month, new.admin_note);
  end if;
  return null;
end;
$$;
drop trigger if exists enrollments_queue_tute on public.enrollments;
create trigger enrollments_queue_tute after insert or update of status on public.enrollments
  for each row execute function public.enrollment_queue_tute();

-- Tute-book orders: approved → a parcel to pack; shipped from the Store page → that parcel is posted;
-- rejected → nothing to send.
create or replace function public.order_sync_delivery()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is not distinct from old.status then return null; end if;
  if new.status in ('approved', 'shipped') then
    insert into public.deliveries (student_id, kind, order_id, address, phone, status, tracking_no, posted_at)
    select new.student_id, 'order', new.id, left(new.delivery_address, 600), a.phone,
           case when new.status = 'shipped' then 'posted' else 'to_pack' end,
           case when new.status = 'shipped' then left(new.admin_note, 80) end,
           case when new.status = 'shipped' then now() end
      from public.profile_post_address(new.student_id) a
    on conflict (order_id) do nothing;
    if new.status = 'shipped' then
      update public.deliveries set status = 'posted', posted_at = coalesce(posted_at, now()), tracking_no = coalesce(tracking_no, left(new.admin_note, 80))
       where order_id = new.id and status in ('to_pack', 'packed');
    end if;
  elsif new.status = 'rejected' then
    update public.deliveries set status = 'skipped' where order_id = new.id and status in ('to_pack', 'packed');
  end if;
  return null;
end;
$$;
drop trigger if exists orders_sync_delivery on public.orders;
create trigger orders_sync_delivery after update of status on public.orders
  for each row execute function public.order_sync_delivery();

-- Stamps on every change; posting a parcel tells the student (orders: through the order's "shipped" notice).
create or replace function public.guard_delivery()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  if new.status is distinct from old.status then
    if new.status = 'posted' then new.posted_at := coalesce(new.posted_at, now()); end if;
    if new.status = 'delivered' then new.delivered_at := coalesce(new.delivered_at, now()); end if;
    if new.status in ('to_pack', 'packed') then new.posted_at := null; new.delivered_at := null; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists deliveries_guard on public.deliveries;
create trigger deliveries_guard before update on public.deliveries
  for each row execute function public.guard_delivery();

create or replace function public.delivery_notify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'posted' and old.status is distinct from 'posted' then
    if new.kind = 'order' then
      update public.orders set status = 'shipped', admin_note = coalesce(new.tracking_no, admin_note)
       where id = new.order_id and status <> 'shipped';
    else
      insert into public.notifications (user_id, kind, link, data)
      select new.student_id, 'tute_posted', '/dashboard',
             jsonb_build_object('class', c.title, 'month', new.month, 'courier', new.courier, 'tracking', new.tracking_no)
        from public.classes c where c.id = new.class_id;
    end if;
  end if;
  return null;
end;
$$;
drop trigger if exists deliveries_notify on public.deliveries;
create trigger deliveries_notify after update of status on public.deliveries
  for each row execute function public.delivery_notify();

-- "No tute this month": skip that month's waiting parcels; undoing it brings them back.
create or replace function public.tute_skip_sync()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if tg_op = 'INSERT' then
    update public.deliveries set status = 'skipped'
     where kind = 'class_tute' and class_id = new.class_id and month = new.month and status in ('to_pack', 'packed');
  else
    update public.deliveries set status = 'to_pack'
     where kind = 'class_tute' and class_id = old.class_id and month = old.month and status = 'skipped';
    for r in select e.student_id, e.admin_note from public.enrollments e
              where e.class_id = old.class_id and e.month = old.month and e.status = 'approved' loop
      perform public.queue_class_tute(r.student_id, old.class_id, old.month, r.admin_note);
    end loop;
  end if;
  return null;
end;
$$;
drop trigger if exists tute_skips_sync on public.tute_skips;
create trigger tute_skips_sync after insert or delete on public.tute_skips
  for each row execute function public.tute_skip_sync();

-- New notification kind for a posted class tute.
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('payment_approved', 'payment_rejected', 'order_approved', 'order_rejected', 'order_shipped', 'tute_posted', 'update'));

-- Backfill (re-runs are no-ops): this month's and later approved months, and approved-but-unshipped orders.
do $$
declare r record;
begin
  for r in select e.student_id, e.class_id, e.month, e.admin_note from public.enrollments e
            where e.status = 'approved' and e.month >= to_char(now() at time zone 'Asia/Colombo', 'YYYY-MM') loop
    perform public.queue_class_tute(r.student_id, r.class_id, r.month, r.admin_note);
  end loop;
end $$;
insert into public.deliveries (student_id, kind, order_id, address, phone)
select o.student_id, 'order', o.id, left(o.delivery_address, 600), a.phone
  from public.orders o cross join lateral public.profile_post_address(o.student_id) a
 where o.status = 'approved'
on conflict (order_id) do nothing;

grant execute on function public.profile_post_address(uuid), public.queue_class_tute(uuid, uuid, text, text) to service_role;
revoke execute on function public.profile_post_address(uuid), public.queue_class_tute(uuid, uuid, text, text) from public, anon, authenticated;
