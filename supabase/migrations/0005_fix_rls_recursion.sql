-- Fix "infinite recursion detected in policy for relation group_members"
-- (42P17). The original group_members SELECT policy queried group_members
-- itself, so every RLS-evaluated read that touched it failed for signed-in
-- users — invisible to the app's server code (service role bypasses RLS)
-- but fatal for Supabase Realtime, which checks RLS as the subscriber.
--
-- Pattern: one SECURITY DEFINER helper returns the caller's group ids
-- without going through RLS; every membership policy uses it.
-- Safe to re-run.

create or replace function public.my_group_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select group_id from public.group_members where user_id = auth.uid()
$$;

revoke all on function public.my_group_ids() from public;
grant execute on function public.my_group_ids() to authenticated;

drop policy if exists "group_members select for members" on public.group_members;
create policy "group_members select for members" on public.group_members
  for select using (group_id in (select public.my_group_ids()));

drop policy if exists "groups select for members" on public.groups;
create policy "groups select for members" on public.groups
  for select using (id in (select public.my_group_ids()));

drop policy if exists "places select for members" on public.places;
create policy "places select for members" on public.places
  for select using (group_id in (select public.my_group_ids()));

drop policy if exists "current_statuses select for members" on public.current_statuses;
create policy "current_statuses select for members" on public.current_statuses
  for select using (group_id in (select public.my_group_ids()));

drop policy if exists "children select for group members" on public.children;
create policy "children select for group members" on public.children
  for select using (group_id in (select public.my_group_ids()));

drop policy if exists "child_guardians select for group members" on public.child_guardians;
create policy "child_guardians select for group members" on public.child_guardians
  for select using (
    exists (select 1 from public.children c
            where c.id = public.child_guardians.child_id
              and c.group_id in (select public.my_group_ids()))
  );

drop policy if exists "users select self or groupmates" on public.users;
create policy "users select self or groupmates" on public.users
  for select using (
    id = auth.uid()
    or id in (select gm.user_id from public.group_members gm
              where gm.group_id in (select public.my_group_ids()))
  );

drop policy if exists "fcm_tokens select for members" on public.fcm_tokens;
create policy "fcm_tokens select for members" on public.fcm_tokens
  for select using (
    user_id in (select gm.user_id from public.group_members gm
                where gm.group_id in (select public.my_group_ids()))
  );
