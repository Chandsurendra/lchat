-- Fix: RLS infinite recursion on conversation_members
--
-- The old members_select_own_convs policy was self-referential (a SELECT policy
-- on conversation_members that itself SELECTs from conversation_members), which
-- caused Postgres to recurse forever -> PostgREST returned HTTP 500 for
-- /rest/v1/conversation_members.
--
-- Paste this in the Supabase Dashboard -> SQL Editor and run it.

-- 1) Membership helper. SECURITY DEFINER runs as the owner (bypasses RLS),
--    so checking membership no longer re-enters the same policy.
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

-- Creator helper (SECURITY DEFINER). Lets a conversation creator seed the first
-- members without hitting RLS on conversations first (chicken-and-egg).
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

-- 2) Drop the recursive policies.
drop policy if exists "conversations_select_member" on public.conversations;
drop policy if exists "conversations_update_member" on public.conversations;
drop policy if exists "members_select_own_convs" on public.conversation_members;
drop policy if exists "members_insert_creator" on public.conversation_members;

-- 3) Recreate them using the helpers.
create policy "conversations_select_member" on public.conversations
  for select using (public.is_conversation_member(id));
create policy "conversations_update_member" on public.conversations
  for update using (public.is_conversation_member(id));
create policy "members_select_own_convs" on public.conversation_members
  for select using (public.is_conversation_member(conversation_id));
create policy "members_insert_creator" on public.conversation_members
  for insert with check (public.is_conversation_creator(conversation_id));

-- 4) Sanity check: any user that is a member of a conversation can now read it.
-- select public.is_conversation_member('<your-conversation-id>');
