-- Google sign-in: links a Google account (OIDC `sub`) to an app user. Only the server (service role) touches it.
create table if not exists public.oauth_identities (
  provider   text not null,
  subject    text not null,
  user_id    uuid not null references auth.users(id) on delete cascade,
  email      text,
  created_at timestamptz not null default now(),
  primary key (provider, subject),
  unique (provider, user_id)
);
alter table public.oauth_identities enable row level security;
revoke all on public.oauth_identities from anon, authenticated;
