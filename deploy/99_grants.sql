-- Run AFTER the migrations: make sure the server role can reach everything (bypasses RLS by design).
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
grant all on all tables in schema auth, storage to service_role;
notify pgrst, 'reload schema';
