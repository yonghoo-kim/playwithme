-- Child-first model, step 2 of 2: drop the pre-child-first columns/tables.
-- Run ONLY after the child-first app code is deployed (it no longer reads
-- or writes any of these). Safe to re-run.

-- Membership is derived from child_groups only now.
create or replace function public.my_group_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select cg.group_id
  from public.child_groups cg
  join public.child_guardians g on g.child_id = cg.child_id
  where g.user_id = auth.uid()
$$;

-- Places: family-owned only.
drop policy if exists "places select for members" on public.places;
create policy "places select for members" on public.places
  for select using (
    created_by in (select g.user_id from public.child_guardians g
                   where g.child_id in (select public.my_visible_child_ids()))
  );

-- fcm_tokens / users policies referenced group_members; rebuild on child_groups.
drop policy if exists "fcm_tokens select for members" on public.fcm_tokens;
create policy "fcm_tokens select for members" on public.fcm_tokens
  for select using (
    user_id in (select g.user_id from public.child_guardians g
                where g.child_id in (select public.my_visible_child_ids()))
  );

drop policy if exists "users select self or groupmates" on public.users;
create policy "users select self or groupmates" on public.users
  for select using (
    id = auth.uid()
    or id in (select g.user_id from public.child_guardians g
              where g.child_id in (select public.my_visible_child_ids()))
  );

alter table public.places drop column if exists group_id;
alter table public.current_statuses drop column if exists group_id;
alter table public.children drop column if exists group_id;
drop table if exists public.group_members cascade;
