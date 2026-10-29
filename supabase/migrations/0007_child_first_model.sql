-- Child-first model, step 1 of 2 (ADDITIVE ONLY — the currently deployed
-- app keeps working after this runs; 0008 drops the old columns once the
-- new code is live).
--
--   * A child exists on its own (created at signup) and can belong to MANY
--     groups: new child_groups (child_id, group_id).
--   * A child's status is one row per child, shared with every group the
--     child is in: current_statuses.group_id becomes optional (unused).
--   * Places belong to the family, not a group: places.created_by.
--   * Membership/visibility derives from "groups my children are in".
-- Safe to re-run.

create table if not exists public.child_groups (
  child_id uuid not null references public.children(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (child_id, group_id)
);
create index if not exists child_groups_group_idx on public.child_groups (group_id);

-- Backfill from the old one-group-per-child column.
insert into public.child_groups (child_id, group_id)
select id, group_id from public.children where group_id is not null
on conflict do nothing;

-- New code creates children with no group and statuses with no group.
alter table public.children alter column group_id drop not null;
alter table public.current_statuses alter column group_id drop not null;

-- Places: owned by the family member who created them.
alter table public.places add column if not exists created_by uuid references public.users(id) on delete cascade;
update public.places p set created_by = g.created_by
from public.groups g
where p.group_id = g.id and p.created_by is null;
alter table public.places alter column group_id drop not null;

-- "My groups" = groups any child I guard is in (plus legacy membership rows
-- until 0008 removes group_members).
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
  union
  select group_id from public.group_members where user_id = auth.uid()
$$;

-- Children visible to me: my own, or any child in one of my groups.
create or replace function public.my_visible_child_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select child_id from public.child_guardians where user_id = auth.uid()
  union
  select cg.child_id from public.child_groups cg
  where cg.group_id in (select public.my_group_ids())
$$;

revoke all on function public.my_visible_child_ids() from public;
grant execute on function public.my_visible_child_ids() to authenticated;

alter table public.child_groups enable row level security;
drop policy if exists "child_groups select for members" on public.child_groups;
create policy "child_groups select for members" on public.child_groups
  for select using (group_id in (select public.my_group_ids()));

drop policy if exists "children select for group members" on public.children;
create policy "children select for group members" on public.children
  for select using (id in (select public.my_visible_child_ids()));

drop policy if exists "child_guardians select for group members" on public.child_guardians;
create policy "child_guardians select for group members" on public.child_guardians
  for select using (child_id in (select public.my_visible_child_ids()));

-- Realtime evaluates this per subscriber: a child's status is visible to
-- everyone sharing any group with that child.
drop policy if exists "current_statuses select for members" on public.current_statuses;
create policy "current_statuses select for members" on public.current_statuses
  for select using (child_id in (select public.my_visible_child_ids()));

drop policy if exists "places select for members" on public.places;
create policy "places select for members" on public.places
  for select using (
    created_by in (select g.user_id from public.child_guardians g
                   where g.child_id in (select public.my_visible_child_ids()))
    or group_id in (select public.my_group_ids())
  );

-- Signup creates the user's children from signUp() metadata
-- (options.data.child_names: string[]), each guarded by the new user, and
-- makes the first one active.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  child_name text;
  new_child_id uuid;
  first_child_id uuid;
begin
  insert into public.users (id, email) values (new.id, new.email);

  if jsonb_typeof(new.raw_user_meta_data -> 'child_names') = 'array' then
    for child_name in
      select trim(value) from jsonb_array_elements_text(new.raw_user_meta_data -> 'child_names')
    loop
      if child_name <> '' then
        insert into public.children (name) values (child_name) returning id into new_child_id;
        insert into public.child_guardians (child_id, user_id) values (new_child_id, new.id);
        if first_child_id is null then
          first_child_id := new_child_id;
        end if;
      end if;
    end loop;
  end if;

  if first_child_id is not null then
    update public.users set active_child_id = first_child_id where id = new.id;
  end if;

  return new;
end;
$$;
