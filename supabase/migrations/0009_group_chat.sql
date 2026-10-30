-- Group chat: one message stream per group. Members are the guardians of
-- the children in the group (my_group_ids()). The app inserts through the
-- server (service role, after checking membership); signed-in members read
-- and subscribe via Realtime under RLS. Safe to re-run.

create table if not exists public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  -- Which of the sender's children it is said as ("지훈이네").
  child_id uuid references public.children(id) on delete set null,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists group_messages_group_created_idx
  on public.group_messages (group_id, created_at desc);

alter table public.group_messages enable row level security;

drop policy if exists "group_messages select for members" on public.group_messages;
create policy "group_messages select for members" on public.group_messages
  for select using (group_id in (select public.my_group_ids()));

drop policy if exists "group_messages insert own in my groups" on public.group_messages;
create policy "group_messages insert own in my groups" on public.group_messages
  for insert with check (
    user_id = auth.uid() and group_id in (select public.my_group_ids())
  );

-- Live delivery to open chat screens.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'group_messages'
  ) then
    alter publication supabase_realtime add table public.group_messages;
  end if;
end $$;
