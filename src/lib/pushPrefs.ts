import type { SupabaseClient } from "@supabase/supabase-js";
import { isQuietHour } from "./kstTime";

// Who still gets a push once each recipient's notification preferences are
// applied (migration 0013):
// - 밤 시간 알림 끄기 (`users.quiet_hours`, default on): nothing between
//   22:00 and 07:00 KST — status, group chat and 1:1 chat alike.
// - 그룹별 알림 끄기 (`group_mutes`): no status or group-chat pushes from
//   that group. 1:1 chats aren't tied to a group and are never muted.
// Every push route resolves user ids -> tokens through these, so the rules
// live in one place. Pure appliers plus one loader that fails open.

export interface PushPrefs {
  /** Users who don't want pushes right now (quiet hours on, and it's night). */
  quietUserIds: Set<string>;
  /** user id -> group ids they muted. */
  mutedGroupsByUser: Map<string, Set<string>>;
}

export const NO_PUSH_PREFS: PushPrefs = {
  quietUserIds: new Set(),
  mutedGroupsByUser: new Map(),
};

function isMuted(prefs: PushPrefs, userId: string, groupId: string): boolean {
  return prefs.mutedGroupsByUser.get(userId)?.has(groupId) === true;
}

/**
 * Drops users in quiet hours and, when the push comes from a group
 * (`groupId`), users who muted that group. A 1:1 chat passes `null`.
 * Keeps the input order; duplicates are removed.
 */
export function applyPushPrefs(
  userIds: string[],
  prefs: PushPrefs,
  groupId: string | null
): string[] {
  return Array.from(new Set(userIds)).filter(
    (userId) =>
      !prefs.quietUserIds.has(userId) &&
      (groupId === null || !isMuted(prefs, userId, groupId))
  );
}

/**
 * For a status push (recipient -> the groups they share with the child):
 * drops users in quiet hours, strips muted groups from each list (so the
 * title only names groups they still hear from), and drops a user whose
 * every shared group is muted. A recipient with no groups (the child's own
 * guardians when the child is in no group) isn't affected by mutes.
 */
export function applyStatusPushPrefs(
  groupsByRecipient: Map<string, string[]>,
  prefs: PushPrefs
): Map<string, string[]> {
  const result = new Map<string, string[]>();
  groupsByRecipient.forEach((groupIds, userId) => {
    if (prefs.quietUserIds.has(userId)) return;
    const audible = groupIds.filter((id) => !isMuted(prefs, userId, id));
    if (groupIds.length > 0 && audible.length === 0) return;
    result.set(userId, audible);
  });
  return result;
}

// Before migration 0013 runs, `users.quiet_hours` / `group_mutes` don't
// exist: pushes go out as if nobody set anything, logged once per instance.
const loggedMissing = new Set<string>();
function warnOnce(what: string, message: string) {
  if (loggedMissing.has(what)) return;
  loggedMissing.add(what);
  console.warn(
    `push prefs: ${what} unavailable (migration 0013 not applied?), ignoring:`,
    message
  );
}

/** Test hook: forget which warnings were already logged. */
export function resetPushPrefsWarnings() {
  loggedMissing.clear();
}

/**
 * Loads the preferences of `userIds` that matter at `now`: quiet-hours
 * users only during quiet hours (no query otherwise), and their group
 * mutes when `withMutes`. Any lookup error counts as "no preference" — a
 * missing preference must never stop a push.
 */
export async function loadPushPrefs(
  supabase: SupabaseClient,
  userIds: string[],
  now: Date,
  withMutes: boolean
): Promise<PushPrefs> {
  const ids = Array.from(new Set(userIds));
  if (ids.length === 0) return NO_PUSH_PREFS;

  const [quietResult, muteResult] = await Promise.all([
    isQuietHour(now)
      ? supabase.from("users").select("id, quiet_hours").in("id", ids)
      : Promise.resolve(null),
    withMutes
      ? supabase.from("group_mutes").select("user_id, group_id").in("user_id", ids)
      : Promise.resolve(null),
  ]);

  const quietUserIds = new Set<string>();
  if (quietResult) {
    if (quietResult.error) {
      warnOnce("users.quiet_hours", quietResult.error.message);
    } else {
      for (const row of (quietResult.data ?? []) as {
        id: string;
        quiet_hours: boolean | null;
      }[]) {
        if (row.quiet_hours !== false) quietUserIds.add(row.id);
      }
    }
  }

  const mutedGroupsByUser = new Map<string, Set<string>>();
  if (muteResult) {
    if (muteResult.error) {
      warnOnce("group_mutes", muteResult.error.message);
    } else {
      for (const row of (muteResult.data ?? []) as {
        user_id: string;
        group_id: string;
      }[]) {
        const groups = mutedGroupsByUser.get(row.user_id) ?? new Set<string>();
        groups.add(row.group_id);
        mutedGroupsByUser.set(row.user_id, groups);
      }
    }
  }

  return { quietUserIds, mutedGroupsByUser };
}

/**
 * The recipients of a group push (`groupId`) or a 1:1 push (`null`) who
 * should actually get it at `now`.
 */
export async function filterPushRecipients(
  supabase: SupabaseClient,
  userIds: string[],
  { groupId, now }: { groupId: string | null; now: Date }
): Promise<string[]> {
  const prefs = await loadPushPrefs(supabase, userIds, now, groupId !== null);
  return applyPushPrefs(userIds, prefs, groupId);
}

/** applyStatusPushPrefs with the recipients' preferences loaded. */
export async function filterStatusPushRecipients(
  supabase: SupabaseClient,
  groupsByRecipient: Map<string, string[]>,
  now: Date
): Promise<Map<string, string[]>> {
  const userIds = Array.from(groupsByRecipient.keys());
  const hasGroups = Array.from(groupsByRecipient.values()).some(
    (ids) => ids.length > 0
  );
  const prefs = await loadPushPrefs(supabase, userIds, now, hasGroups);
  return applyStatusPushPrefs(groupsByRecipient, prefs);
}
