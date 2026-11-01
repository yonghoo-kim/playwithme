import { statusRecipientGroupIds } from "@/lib/childAccess";

// Which of a child's groups hear about a status change ("알림 보낼 그룹").
// Only the push is filtered — the status itself stays visible to every group
// the child is in. Pure helpers (selection + recipients) plus the small
// localStorage wrappers the place dialog uses to remember the last choice.

/** Most group ids a status update may name (a child is in a handful). */
export const MAX_NOTIFY_GROUP_IDS = 50;

/**
 * Validates the request's optional `notifyGroupIds`. `undefined` → `null`
 * (notify every group — the old behaviour); an array of at most
 * MAX_NOTIFY_GROUP_IDS strings → those ids, deduped; anything else →
 * `"invalid"`.
 */
export function parseNotifyGroupIds(raw: unknown): string[] | null | "invalid" {
  if (raw === undefined) return null;
  if (!Array.isArray(raw) || raw.length > MAX_NOTIFY_GROUP_IDS) return "invalid";
  if (!raw.every((id) => typeof id === "string")) return "invalid";
  return Array.from(new Set(raw as string[]));
}

/**
 * The groups to notify, in the child's group order: every group of the child
 * when `requested` is `null`, otherwise only the requested ids the child is
 * actually in (others — deleted groups, someone else's — are dropped).
 */
export function selectNotifyGroupIds(
  childGroupIds: string[],
  requested: string[] | null
): string[] {
  const own = Array.from(new Set(childGroupIds));
  if (requested === null) return own;
  const wanted = new Set(requested);
  return own.filter((id) => wanted.has(id));
}

/**
 * statusRecipientGroupIds limited to `notifyGroupIds` (already narrowed to
 * the child's groups by selectNotifyGroupIds): guardians of the other
 * children in those groups, plus the child's own guardians, each mapped to
 * the selected groups they share. Nobody when `notifyGroupIds` is empty and
 * the child is in at least one group (the guardian chose "알림 없이"). A
 * child in no group keeps the old behaviour (its own guardians only).
 */
export function notifyRecipientGroupIds(
  childId: string,
  childGroupRows: { child_id: string; group_id: string }[],
  guardianRows: { child_id: string; user_id: string }[],
  notifyGroupIds: string[]
): Map<string, string[]> {
  const childInAnyGroup = childGroupRows.some((row) => row.child_id === childId);
  if (childInAnyGroup && notifyGroupIds.length === 0) return new Map();
  const selected = new Set(notifyGroupIds);
  return statusRecipientGroupIds(
    childId,
    childGroupRows.filter((row) => selected.has(row.group_id)),
    guardianRows
  );
}

// --- Remembered selection (client) ---------------------------------------
// Stored as the groups the guardian turned OFF, so a group the child joins
// later starts selected and a group that no longer exists is just ignored.

const STORAGE_PREFIX = "playwithme_notify_off:";

/**
 * The initial selection: every group except the stored "off" ones. A
 * missing or malformed stored value selects everything.
 */
export function initialNotifySelection(
  groupIds: string[],
  storedOff: unknown
): string[] {
  const off = new Set(
    Array.isArray(storedOff)
      ? storedOff.filter((id): id is string => typeof id === "string")
      : []
  );
  return groupIds.filter((id) => !off.has(id));
}

/** The groups in `groupIds` that are not selected (what gets stored). */
export function deselectedGroupIds(
  groupIds: string[],
  selected: string[]
): string[] {
  const on = new Set(selected);
  return groupIds.filter((id) => !on.has(id));
}

/**
 * What to send as `notifyGroupIds`: `undefined` (all groups — also covers a
 * group joined since the page loaded) when every group is selected or the
 * child has at most one group; otherwise the selected ids (possibly none).
 */
export function notifyGroupIdsToSend(
  groupIds: string[],
  selected: string[]
): string[] | undefined {
  if (groupIds.length <= 1) return undefined;
  const picked = groupIds.filter((id) => selected.includes(id));
  return picked.length === groupIds.length ? undefined : picked;
}

export function readNotifyOff(childId: string): unknown {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + childId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveNotifyOff(childId: string, offGroupIds: string[]): void {
  try {
    window.localStorage.setItem(
      STORAGE_PREFIX + childId,
      JSON.stringify(offGroupIds)
    );
  } catch {
    // Storage blocked: the choice just isn't remembered next time.
  }
}
