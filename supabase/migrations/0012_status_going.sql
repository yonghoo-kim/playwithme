-- "가는 중" (on the way): a guardian can say the child is heading to a place
-- (or home, place_id null) rather than already there. Friends see
-- "놀이터로 가는 중 🚶" instead of "놀이터에 있어요". Realtime already streams
-- every column of current_statuses (migration 0004), so nothing else changes.
-- There is no status history table to mirror. Safe to re-run.

alter table public.current_statuses
  add column if not exists going boolean not null default false;
