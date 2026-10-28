-- Hotfix: migration 0002 dropped+recreated current_statuses, which silently
-- removed its Row Level Security (DROP TABLE removes RLS along with the
-- table; a fresh CREATE TABLE has RLS disabled by default). Run this now.

alter table public.current_statuses enable row level security;

create policy "current_statuses select for members" on public.current_statuses
  for select using (
    exists (select 1 from public.group_members gm
            where gm.group_id = public.current_statuses.group_id
              and gm.user_id = auth.uid())
  );
