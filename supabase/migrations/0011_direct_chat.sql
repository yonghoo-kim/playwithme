-- 1:1 chat between two families: the guardians of one child talk with the
-- guardians of a friend child (two children who share a group). A
-- conversation is the normalized child pair (child_low < child_high), so
-- both families read the same stream. The app inserts through the server
-- (service role, after checking guardianship and a shared group); signed-in
-- guardians of either child read and subscribe via Realtime under RLS.
-- Safe to re-run.

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  child_low uuid not null references public.children(id) on delete cascade,
  child_high uuid not null references public.children(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  -- Which of the sender's children it is said as ("지훈이네"); one of the pair.
  child_id uuid references public.children(id) on delete set null,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  constraint direct_messages_pair_ordered check (child_low < child_high)
);

create index if not exists direct_messages_pair_created_idx
  on public.direct_messages (child_low, child_high, created_at desc);

-- The caller's own children, without going through child_guardians' RLS
-- (same SECURITY DEFINER pattern as my_group_ids(), see 0005).
create or replace function public.my_guarded_child_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select child_id from public.child_guardians where user_id = auth.uid()
$$;

revoke all on function public.my_guarded_child_ids() from public;
grant execute on function public.my_guarded_child_ids() to authenticated;

alter table public.direct_messages enable row level security;

drop policy if exists "direct_messages select for guardians of either child" on public.direct_messages;
create policy "direct_messages select for guardians of either child" on public.direct_messages
  for select using (
    child_low in (select public.my_guarded_child_ids())
    or child_high in (select public.my_guarded_child_ids())
  );

-- No insert/update/delete policies: only the server (service role) writes,
-- after checking that the two children share a group.

-- Live delivery to open chat screens.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'direct_messages'
  ) then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
end $$;
