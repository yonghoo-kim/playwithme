-- Unread chat indicators: when each user last read each conversation, and
-- a per-user unread count for the dashboard badges.
--
-- A conversation is keyed as text:
--   'g:<group id>'                 group chat (group_messages)
--   'd:<child_low>:<child_high>'   1:1 chat (direct_messages, ordered pair)
--
-- The chat screen upserts its own row when it is open and visible; the
-- trigger stamps last_read_at with the server clock (never the phone's).
-- Safe to re-run.

create table if not exists public.chat_reads (
  user_id uuid not null references public.users(id) on delete cascade,
  conversation text not null,
  last_read_at timestamptz not null default now(),
  primary key (user_id, conversation),
  constraint chat_reads_conversation_format check (
    conversation ~ '^(g:[0-9a-f-]{36}|d:[0-9a-f-]{36}:[0-9a-f-]{36})$'
  )
);

create or replace function public.chat_reads_stamp()
returns trigger
language plpgsql
as $$
begin
  new.last_read_at := now();
  return new;
end;
$$;

drop trigger if exists chat_reads_stamp on public.chat_reads;
create trigger chat_reads_stamp
  before insert or update on public.chat_reads
  for each row execute function public.chat_reads_stamp();

alter table public.chat_reads enable row level security;

drop policy if exists "chat_reads select own" on public.chat_reads;
create policy "chat_reads select own" on public.chat_reads
  for select using (user_id = auth.uid());

drop policy if exists "chat_reads insert own" on public.chat_reads;
create policy "chat_reads insert own" on public.chat_reads
  for insert with check (user_id = auth.uid());

drop policy if exists "chat_reads update own" on public.chat_reads;
create policy "chat_reads update own" on public.chat_reads
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Unread messages per conversation for the caller: messages from others
-- after the caller's last read, only in conversations the caller can see
-- (groups in my_group_ids(), pairs with a child in my_guarded_child_ids()).
-- A conversation never opened counts only the last 7 days, so old history
-- doesn't light up every badge the first time. Conversations with nothing
-- unread are left out.
create or replace function public.unread_counts()
returns table (conversation text, unread integer)
language sql
stable
security definer
set search_path = public
as $$
  select 'g:' || m.group_id::text, count(*)::integer
  from public.group_messages m
  left join public.chat_reads r
    on r.user_id = auth.uid()
   and r.conversation = 'g:' || m.group_id::text
  where m.group_id in (select public.my_group_ids())
    and m.user_id <> auth.uid()
    and m.created_at > coalesce(r.last_read_at, now() - interval '7 days')
  group by m.group_id

  union all

  select 'd:' || m.child_low::text || ':' || m.child_high::text, count(*)::integer
  from public.direct_messages m
  left join public.chat_reads r
    on r.user_id = auth.uid()
   and r.conversation = 'd:' || m.child_low::text || ':' || m.child_high::text
  where (
      m.child_low in (select public.my_guarded_child_ids())
      or m.child_high in (select public.my_guarded_child_ids())
    )
    and m.user_id <> auth.uid()
    and m.created_at > coalesce(r.last_read_at, now() - interval '7 days')
  group by m.child_low, m.child_high
$$;

revoke all on function public.unread_counts() from public;
grant execute on function public.unread_counts() to authenticated;
