-- Per-place notifications: a family can make everyday places (e.g. the
-- daycare) "quiet" — friends still see the status, but no push is sent.
-- Safe to re-run.

alter table public.places
  add column if not exists notify boolean not null default true;
