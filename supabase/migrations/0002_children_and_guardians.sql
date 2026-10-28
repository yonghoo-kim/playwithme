-- Child/guardian separation: run once in the Supabase SQL Editor.
-- Dev data only — no backward-compatible migration of existing rows needed.

create table public.children (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.child_guardians (
  child_id uuid not null references public.children(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (child_id, user_id)
);

drop table if exists public.current_statuses;
create table public.current_statuses (
  child_id uuid primary key references public.children(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  place_id uuid references public.places(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.users drop column if exists child_name;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email) values (new.id, new.email);
  return new;
end;
$$;

alter table public.children enable row level security;
alter table public.child_guardians enable row level security;

create policy "children select for group members" on public.children
  for select using (
    exists (select 1 from public.group_members gm
            where gm.group_id = public.children.group_id and gm.user_id = auth.uid())
  );

create policy "child_guardians select for group members" on public.child_guardians
  for select using (
    exists (select 1 from public.children c
            join public.group_members gm on gm.group_id = c.group_id
            where c.id = public.child_guardians.child_id and gm.user_id = auth.uid())
  );
