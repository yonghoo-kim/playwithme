import { directPair } from "./chat";

// Unread chat badges: conversation keys (match migration 0014's
// chat_reads.conversation and unread_counts()), count formatting and the
// small pure updates the dashboard applies to its live counts.

/** conversation key -> unread messages (only conversations with some). */
export type UnreadMap = Record<string, number>;

/** "g:<groupId>" */
export function groupConversationKey(groupId: string): string {
  return `g:${groupId.toLowerCase()}`;
}

/** "d:<childLow>:<childHigh>" — the same key from either family's side. */
export function directConversationKey(childA: string, childB: string): string {
  const { low, high } = directPair(childA, childB);
  return `d:${low}:${high}`;
}

/** The conversation a realtime group_messages / direct_messages row is in. */
export function conversationKeyForRow(
  table: "group_messages" | "direct_messages",
  row: { group_id?: string | null; child_low?: string | null; child_high?: string | null }
): string | null {
  if (table === "group_messages") {
    return row.group_id ? groupConversationKey(row.group_id) : null;
  }
  return row.child_low && row.child_high
    ? directConversationKey(row.child_low, row.child_high)
    : null;
}

/** Badge text: null for none, "1".."9", then "9+". */
export function formatUnreadCount(count: number | null | undefined): string | null {
  if (!count || !Number.isFinite(count) || count <= 0) return null;
  return count > 9 ? "9+" : String(Math.floor(count));
}

/**
 * unread_counts() rows -> map. Null when the rows are missing (RPC failed,
 * e.g. migration 0014 not applied) so callers can show no badges at all.
 */
export function toUnreadMap(
  rows: { conversation: string; unread: number | string }[] | null | undefined
): UnreadMap | null {
  if (!Array.isArray(rows)) return null;
  const map: UnreadMap = {};
  for (const row of rows) {
    const count = Number(row.unread);
    if (typeof row.conversation === "string" && count > 0) {
      map[row.conversation] = (map[row.conversation] ?? 0) + count;
    }
  }
  return map;
}

/**
 * One new message arrived live: +1 for its conversation unless I sent it.
 * Returns `map` itself when nothing changes (no re-render).
 */
export function addIncomingMessage(
  map: UnreadMap,
  conversation: string | null,
  senderUserId: string | null | undefined,
  myUserId: string
): UnreadMap {
  if (!conversation || !senderUserId || senderUserId === myUserId) return map;
  return { ...map, [conversation]: (map[conversation] ?? 0) + 1 };
}

/** Sum of every conversation's unread count (for the app icon badge). */
export function totalUnread(map: UnreadMap | null | undefined): number {
  if (!map) return 0;
  return Object.values(map).reduce(
    (sum, count) => sum + (count > 0 ? count : 0),
    0
  );
}
