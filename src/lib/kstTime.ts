// Korea Standard Time helpers. Korea has no daylight saving, so KST is
// always UTC+9: everything here works from the epoch milliseconds plus a
// fixed offset and never reads the server's (or browser's) own time zone.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 밤 시간 알림 끄기: no pushes from 22:00 up to (not including) 07:00 KST. */
export const QUIET_START_HOUR = 22;
export const QUIET_END_HOUR = 7;

function toMs(date: Date | number): number {
  return typeof date === "number" ? date : date.getTime();
}

/** The hour of day (0–23) in KST. */
export function kstHour(date: Date | number): number {
  return new Date(toMs(date) + KST_OFFSET_MS).getUTCHours();
}

/** True between 22:00 and 07:00 KST (22:00 inclusive, 07:00 exclusive). */
export function isQuietHour(date: Date | number): boolean {
  const hour = kstHour(date);
  return hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR;
}

/**
 * Epoch ms of the most recent 00:00 KST at or before `date` — when the daily
 * reset (/api/cron/reset-statuses) last sent every child home.
 */
export function startOfKstDay(date: Date | number): number {
  const shifted = toMs(date) + KST_OFFSET_MS;
  return shifted - (((shifted % DAY_MS) + DAY_MS) % DAY_MS) - KST_OFFSET_MS;
}
