-- ============================================================
-- LChat: Initial schema
-- Run this in the Supabase SQL editor (or via the CLI).
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- PROFILES ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 20),
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_url text,
  bio text default '' check (char_length(bio) <= 160),
  status text not null default 'offline' check (status in ('online', 'offline', 'away')),
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- FRIEND REQUESTS ----------
create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sender_id, recipient_id)
);

-- ---------- FRIENDS ----------
create table public.friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, friend_id),
  check (user_id <> friend_id)
);

-- ---------- BLOCKED USERS ----------
create table public.blocked_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, blocked_id),
  check (user_id <> blocked_id)
);

-- ---------- CONVERSATIONS ----------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('direct', 'group')),
  name text check (name is null or char_length(name) between 1 and 60),
  avatar_url text,
  description text default '' check (char_length(description) <= 300),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- CONVERSATION MEMBERS ----------
create table public.conversation_members (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  last_read_at timestamptz not null default now(),
  muted boolean not null default false,
  created_at timestamptz not null default now(),
  unique (conversation_id, user_id)
);

-- ---------- MESSAGES ----------
create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  parent_id bigint references public.messages (id) on delete set null,
  content text not null default '',
  type text not null default 'text' check (type in ('text', 'image', 'video', 'audio', 'file')),
  file_url text,
  file_name text,
  file_size bigint,
  duration numeric,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- MESSAGE READS ----------
create table public.message_reads (
  message_id bigint not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

-- ---------- MESSAGE REACTIONS ----------
create table public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id bigint not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

-- ---------- INDEXES ----------
create index idx_profiles_username on public.profiles (lower(username));
create index idx_friend_requests_recipient on public.friend_requests (recipient_id, status);
create index idx_friend_requests_sender on public.friend_requests (sender_id, status);
create index idx_friends_user on public.friends (user_id);
create index idx_friends_friend on public.friends (friend_id);
create index idx_blocked_user on public.blocked_users (user_id);
create index idx_blocked_blocked on public.blocked_users (blocked_id);
create index idx_conversations_updated on public.conversations (updated_at desc);
create index idx_members_conversation on public.conversation_members (conversation_id);
create index idx_members_user on public.conversation_members (user_id);
create index idx_messages_conversation on public.messages (conversation_id, id);
create index idx_messages_conversation_created on public.messages (conversation_id, created_at);
create index idx_messages_parent on public.messages (parent_id);
create index idx_message_reads_user on public.message_reads (user_id, message_id);

-- ---------- UPDATED_AT TRIGGER ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_friend_requests_updated_at
  before update on public.friend_requests
  for each row execute function public.set_updated_at();

create trigger set_conversations_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

-- Bump conversation.updated_at whenever a message is inserted (drives sidebar ordering).
create or replace function public.touch_conversation()
returns trigger
language plpgsql
as $$
begin
  update public.conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$;

create trigger touch_conversation_on_message
  after insert on public.messages
  for each row execute function public.touch_conversation();

-- ---------- RPC: find or create a direct conversation ----------
create or replace function public.get_or_create_direct_conversation(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_conv uuid;
begin
  if v_me is null then
    raise exception 'not authenticated';
  end if;

  select cm.conversation_id into v_conv
  from public.conversation_members cm
  join public.conversation_members cm2
    on cm2.conversation_id = cm.conversation_id
  join public.conversations c
    on c.id = cm.conversation_id
  where cm.user_id = v_me
    and cm2.user_id = p_other
    and c.type = 'direct'
  limit 1;

  if v_conv is not null then
    return v_conv;
  end if;

  insert into public.conversations (type, created_by)
  values ('direct', v_me)
  returning id into v_conv;

  insert into public.conversation_members (conversation_id, user_id, role)
  values (v_conv, v_me, 'owner'), (v_conv, p_other, 'member');

  return v_conv;
end;
$$;

-- ---------- RPC: accept a friend request (inserts symmetric friendship) ----------
create or replace function public.accept_friend_request(p_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender uuid;
  v_recipient uuid;
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'not authenticated';
  end if;

  select sender_id, recipient_id into v_sender, v_recipient
  from public.friend_requests
  where id = p_request_id and status = 'pending' and recipient_id = v_me;

  if v_sender is null then
    return false;
  end if;

  update public.friend_requests
  set status = 'accepted', updated_at = now()
  where id = p_request_id;

  insert into public.friends (user_id, friend_id)
  values (v_me, v_sender), (v_sender, v_me)
  on conflict do nothing;

  return true;
end;
$$;

-- ---------- ROW LEVEL SECURITY ----------
alter table public.profiles enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friends enable row level security;
alter table public.blocked_users enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_reads enable row level security;
alter table public.message_reactions enable row level security;

-- profiles: anyone authenticated can read (for search), only owner can write
create policy "profiles_read" on public.profiles
  for select using (auth.role() = 'authenticated');
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Membership check helper (SECURITY DEFINER so it bypasses RLS and avoids
-- infinite recursion in policies that need to test "is the caller a member?").
create or replace function public.is_conversation_member(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = target and cm.user_id = auth.uid()
  );
$$;

-- Creator check helper (SECURITY DEFINER). Used by member-insert policies so the
-- creator can seed members without hitting RLS on conversations first.
create or replace function public.is_conversation_creator(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = target and c.created_by = auth.uid()
  );
$$;

-- friend_requests
create policy "friend_requests_select_involved" on public.friend_requests
  for select using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "friend_requests_insert_own" on public.friend_requests
  for insert with check (auth.uid() = sender_id);
create policy "friend_requests_update_involved" on public.friend_requests
  for update using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "friend_requests_delete_own" on public.friend_requests
  for delete using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- friends
create policy "friends_select_own" on public.friends
  for select using (auth.uid() = user_id);
create policy "friends_insert_own" on public.friends
  for insert with check (auth.uid() = user_id);
create policy "friends_delete_own" on public.friends
  for delete using (auth.uid() = user_id);

-- blocked_users
create policy "blocked_select_own" on public.blocked_users
  for select using (auth.uid() = user_id);
create policy "blocked_insert_own" on public.blocked_users
  for insert with check (auth.uid() = user_id);
create policy "blocked_delete_own" on public.blocked_users
  for delete using (auth.uid() = user_id);

-- conversations
create policy "conversations_select_member" on public.conversations
  for select using (public.is_conversation_member(id));
create policy "conversations_insert_own" on public.conversations
  for insert with check (auth.uid() = created_by);
create policy "conversations_update_member" on public.conversations
  for update using (public.is_conversation_member(id));

-- conversation_members
create policy "members_select_own_convs" on public.conversation_members
  for select using (public.is_conversation_member(conversation_id));
create policy "members_insert_creator" on public.conversation_members
  for insert with check (public.is_conversation_creator(conversation_id));
create policy "members_update_own" on public.conversation_members
  for update using (auth.uid() = user_id);

-- messages
create policy "messages_select_member" on public.messages
  for select using (
    exists (select 1 from public.conversation_members cm
            where cm.conversation_id = messages.conversation_id and cm.user_id = auth.uid())
  );
create policy "messages_insert_member" on public.messages
  for insert with check (
    auth.uid() = sender_id
    and exists (select 1 from public.conversation_members cm
                where cm.conversation_id = messages.conversation_id and cm.user_id = auth.uid())
  );
create policy "messages_update_own" on public.messages
  for update using (auth.uid() = sender_id);
create policy "messages_delete_own" on public.messages
  for delete using (auth.uid() = sender_id);

-- message_reads
create policy "reads_select_member" on public.message_reads
  for select using (
    exists (select 1 from public.messages m
            join public.conversation_members cm on cm.conversation_id = m.conversation_id
            where m.id = message_reads.message_id and cm.user_id = auth.uid())
  );
create policy "reads_insert_own" on public.message_reads
  for insert with check (auth.uid() = user_id);

-- message_reactions
create policy "reactions_select_member" on public.message_reactions
  for select using (
    exists (select 1 from public.messages m
            join public.conversation_members cm on cm.conversation_id = m.conversation_id
            where m.id = message_reactions.message_id and cm.user_id = auth.uid())
  );
create policy "reactions_insert_own" on public.message_reactions
  for insert with check (auth.uid() = user_id);
create policy "reactions_delete_own" on public.message_reactions
  for delete using (auth.uid() = user_id);

-- ---------- VIEWS ----------
-- Last non-deleted message per conversation (drives the sidebar preview).
create or replace view public.conversation_last_message
with (security_invoker = true) as
select distinct on (conversation_id)
  conversation_id, id, sender_id, content, type, file_url, file_name,
  file_size, duration, parent_id, edited_at, deleted_at, created_at
from public.messages
where deleted_at is null
order by conversation_id, id desc;

-- Unread count per conversation per user.
create or replace view public.conversation_unread
with (security_invoker = true) as
select cm.conversation_id, cm.user_id, count(m.id) as unread_count
from public.conversation_members cm
left join public.messages m
  on m.conversation_id = cm.conversation_id
 and m.sender_id <> cm.user_id
 and m.deleted_at is null
 and m.created_at > cm.last_read_at
group by cm.conversation_id, cm.user_id;

-- ---------- REALTIME ----------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.conversation_members;
alter publication supabase_realtime add table public.message_reads;
alter publication supabase_realtime add table public.message_reactions;

-- ---------- STORAGE ----------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('attachments', 'attachments', true)
on conflict (id) do nothing;

create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "attachments public read" on storage.objects
  for select using (bucket_id = 'attachments');
create policy "avatars auth upload" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "attachments auth upload" on storage.objects
  for insert with check (bucket_id = 'attachments' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "attachments auth update" on storage.objects
  for update using (bucket_id = 'attachments' and auth.uid()::text = (storage.foldername(name))[1]);
