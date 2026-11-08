-- Support conversations are accessed only through the server's authenticated/secret-scoped API.
-- Neither guests nor logged-in users can query or mutate the tables through PostgREST.
create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  guest_token_hash text unique,
  visitor_name text not null check (char_length(visitor_name) between 1 and 100),
  contact text not null default '' check (char_length(contact) <= 100),
  category text not null check (category in ('slip', 'bug', 'other')),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_visitor_at timestamptz,
  staff_read_at timestamptz,
  check ((user_id is not null and guest_token_hash is null) or (user_id is null and guest_token_hash is not null))
);
create unique index if not exists support_one_per_user on public.support_conversations(user_id) where user_id is not null;
create index if not exists support_inbox_order on public.support_conversations(updated_at desc);
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  sender text not null check (sender in ('visitor', 'staff')),
  staff_id uuid references public.profiles(id) on delete set null,
  sender_name text not null check (char_length(sender_name) between 1 and 120),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  check (sender = 'staff' or staff_id is null)
);
create index if not exists support_messages_conversation on public.support_messages(conversation_id, created_at, id);
create table if not exists public.support_agents (
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  staff_id uuid not null references public.profiles(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  primary key (conversation_id, staff_id)
);
alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;
alter table public.support_agents enable row level security;
revoke all on public.support_conversations, public.support_messages, public.support_agents from public, anon, authenticated;
grant all on public.support_conversations, public.support_messages, public.support_agents to service_role;
