-- Guardian invites: an existing guardian of a child issues a single-use,
-- expiring code; only the person holding it can become that child's
-- additional guardian. Replaces the old self-service "join any child in
-- my group" flow. Safe to re-run.

create table if not exists public.child_guardian_invites (
  code text primary key,
  child_id uuid not null references public.children(id) on delete cascade,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  used_by uuid references public.users(id) on delete set null
);

create index if not exists child_guardian_invites_child_idx
  on public.child_guardian_invites (child_id);

-- Server-only table: RLS on with no policies, so only the service role
-- (Next.js API routes / server actions) can read or write it.
alter table public.child_guardian_invites enable row level security;
