-- Group ownership + per-creator unique names, persisted active child,
-- and Supabase Realtime on current_statuses. Run once in the SQL Editor.
-- Safe to re-run.

alter table public.groups add column if not exists created_by uuid references public.users(id);

-- Backfill existing rows to their earliest member so uniqueness can apply.
update public.groups g set created_by = (
  select gm.user_id from public.group_members gm
  where gm.group_id = g.id order by gm.joined_at asc limit 1
) where g.created_by is null;

-- Existing data may already hold same-name groups from the same creator
-- (e.g. two "테스트그룹"): keep the oldest as-is, suffix the rest " (2)", " (3)"…
with ranked as (
  select id, row_number() over (partition by created_by, name order by created_at, id) as rn
  from public.groups
  where created_by is not null
)
update public.groups g
set name = g.name || ' (' || r.rn || ')'
from ranked r
where g.id = r.id and r.rn > 1;

create unique index if not exists groups_created_by_name_key
  on public.groups (created_by, name);

alter table public.users
  add column if not exists active_child_id uuid references public.children(id) on delete set null;

-- Realtime: stream current_statuses changes to subscribed group members
-- (delivery respects the existing members-only SELECT RLS policy).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'current_statuses'
  ) then
    alter publication supabase_realtime add table public.current_statuses;
  end if;
end $$;
