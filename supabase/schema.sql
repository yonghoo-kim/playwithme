-- 나랑 놀자 (Play With Me) — core schema, RLS, and new-user trigger.
-- Run this once in the Supabase SQL Editor for this project.

create extension if not exists "pgcrypto";

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  child_name text not null,
  created_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.places (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null,
  icon_name text not null,
  created_at timestamptz not null default now()
);

create table public.fcm_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now()
);

create table public.current_statuses (
  user_id uuid primary key references public.users(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  place_id uuid references public.places(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- New-user trigger: mirrors auth.users into public.users, pulling child_name
-- out of the signUp() call's `options.data.child_name` metadata.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, child_name)
  values (new.id, new.email, new.raw_user_meta_data->>'child_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Row Level Security: read-only for members of the same group.
-- All writes go through Next.js API routes using the service-role client,
-- which bypasses RLS entirely, so no INSERT/UPDATE/DELETE policies exist here.
alter table public.users enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.places enable row level security;
alter table public.fcm_tokens enable row level security;
alter table public.current_statuses enable row level security;

create policy "users select self or groupmates" on public.users
  for select using (
    id = auth.uid()
    or exists (
      select 1 from public.group_members gm1
      join public.group_members gm2 on gm1.group_id = gm2.group_id
      where gm1.user_id = auth.uid() and gm2.user_id = public.users.id
    )
  );

create policy "groups select for members" on public.groups
  for select using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = public.groups.id and gm.user_id = auth.uid()
    )
  );

create policy "group_members select for members" on public.group_members
  for select using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = public.group_members.group_id and gm.user_id = auth.uid()
    )
  );

create policy "places select for members" on public.places
  for select using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = public.places.group_id and gm.user_id = auth.uid()
    )
  );

create policy "fcm_tokens select for members" on public.fcm_tokens
  for select using (
    exists (
      select 1 from public.group_members gm1
      join public.group_members gm2 on gm1.group_id = gm2.group_id
      where gm1.user_id = auth.uid() and gm2.user_id = public.fcm_tokens.user_id
    )
  );

create policy "current_statuses select for members" on public.current_statuses
  for select using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = public.current_statuses.group_id and gm.user_id = auth.uid()
    )
  );
