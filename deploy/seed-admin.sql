-- Creates (or resets) the admin account. Usage:
--   psql -d hm_maths -v admin_email='admin@example.com' -v admin_pw='secret' -f deploy/seed-admin.sql
insert into public.admin_emails (email) values (lower(:'admin_email')) on conflict do nothing;
insert into auth.users (email, encrypted_password, raw_user_meta_data)
values (lower(:'admin_email'), extensions.crypt(:'admin_pw', extensions.gen_salt('bf')), '{"full_name":"Hasitha Madusanka"}')
on conflict ((lower(email))) do update
  set encrypted_password = excluded.encrypted_password, password_changed_at = now(), updated_at = now();
update public.profiles p set role = 'admin', student_id = null
  from auth.users u where u.id = p.id and lower(u.email) = lower(:'admin_email');
select u.email, p.role from auth.users u join public.profiles p on p.id = u.id where lower(u.email) = lower(:'admin_email');
