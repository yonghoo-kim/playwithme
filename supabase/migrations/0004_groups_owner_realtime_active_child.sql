-- Group ownership + per-creator unique names, persisted active child,
-- and Supabase Realtime on current_statuses. Run once in the SQL Editor.

alter table public.groups add column if not exists created_by uuid references public.users(id);

-- Backfill existing rows to their earliest member so uniqueness can apply.
update public.groups g set created_by = (
  select gm.user_id from public.group_members gm
  where gm.group_id = g.id order by gm.joined_at asc limit 1
) where g.created_by is null;

create unique index if not exists groups_created_by_name_key
  on public.groups (created_by, name);

alter table public.users
  add column if not exists active_child_id uuid references public.children(id) on delete set null;

-- Realtime: stream current_statuses changes to subscribed group members
-- (delivery respects the existing members-only SELECT RLS policy).
alter publication supabase_realtime add table public.current_statuses;
