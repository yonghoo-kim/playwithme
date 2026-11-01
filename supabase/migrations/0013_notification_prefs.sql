-- Notification preferences (설정 > 알림, 설정 > 그룹). Safe to re-run.
--
-- 밤 시간 알림 끄기: `users.quiet_hours` (default on) — no pushes from
-- 22:00 to 07:00 KST. Written by the server (/api/users/notification-prefs,
-- service role), so no new users policy is needed.
--
-- 그룹별 알림 끄기: one `group_mutes` row per (user, group) the user muted —
-- no status or group-chat pushes from that group. 1:1 chats aren't
-- affected. The app writes through /api/groups/mute (service role); the RLS
-- policies let a signed-in user manage only their own rows, and only mute
-- groups they're in.
--
-- The push code treats a missing column/table as "no preference", so the
-- app keeps sending pushes if this hasn't been applied yet.

alter table public.users
  add column if not exists quiet_hours boolean not null default true;

create table if not exists public.group_mutes (
  user_id uuid not null references public.users(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, group_id)
);

alter table public.group_mutes enable row level security;

drop policy if exists "group_mutes select own" on public.group_mutes;
create policy "group_mutes select own" on public.group_mutes
  for select using (user_id = auth.uid());

drop policy if exists "group_mutes insert own in my groups" on public.group_mutes;
create policy "group_mutes insert own in my groups" on public.group_mutes
  for insert with check (
    user_id = auth.uid() and group_id in (select public.my_group_ids())
  );

drop policy if exists "group_mutes delete own" on public.group_mutes;
create policy "group_mutes delete own" on public.group_mutes
  for delete using (user_id = auth.uid());
