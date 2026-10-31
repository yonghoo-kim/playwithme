import { hasBatchim, type PushPayload } from "./push";

export const MAX_MESSAGE_LENGTH = 500;

/** One-tap questions shown above the chat input. */
export const QUICK_MESSAGES = [
  "언제 와? 🕐",
  "어디야? 📍",
  "곧 갈게! 🏃",
  "같이 놀자! 🎈",
  "오늘은 못 가요 🙏",
];

/** How a family is named in chat: "지훈이네", "하나네". */
export function familyLabel(childName: string): string {
  return hasBatchim(childName) ? `${childName}이네` : `${childName}네`;
}

/** Trimmed message text, or null when there is nothing to send. */
export function normalizeMessage(raw: string): string | null {
  const text = raw.trim().replace(/\n{3,}/g, "\n\n");
  if (!text) return null;
  return text.slice(0, MAX_MESSAGE_LENGTH);
}

/** How many of the newest messages a chat screen loads. */
export const CHAT_PAGE_SIZE = 50;

/** One chat message as the chat screen uses it. */
export interface ChatMessage {
  id: string;
  userId: string;
  childId: string | null;
  body: string;
  createdAt: string;
}

/** A group_messages / direct_messages row (REST, Realtime and POST replies). */
export interface ChatMessageRow {
  id: string;
  user_id: string;
  child_id: string | null;
  body: string;
  created_at: string;
}

export function toChatMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    userId: row.user_id,
    childId: row.child_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

/**
 * Adds `incoming` to `current`: each id once (the copy already shown wins),
 * oldest first. Returns `current` itself when nothing is new, so a refetch
 * that finds no new messages causes no re-render.
 */
export function mergeMessages(
  current: ChatMessage[],
  incoming: ChatMessage[]
): ChatMessage[] {
  const known = new Set(current.map((m) => m.id));
  const added: ChatMessage[] = [];
  for (const message of incoming) {
    if (known.has(message.id)) continue;
    known.add(message.id);
    added.push(message);
  }
  if (added.length === 0) return current;
  // Stable sort: same-instant messages keep their arrival order.
  return [...current, ...added].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)
  );
}

function oneLineShort(body: string): string {
  const oneLine = body.replace(/\s+/g, " ").trim();
  return oneLine.length > 80 ? `${oneLine.slice(0, 80)}…` : oneLine;
}

/** Notification for a chat message: the group as title, one-line body. */
export function chatPushPayload(
  groupName: string,
  senderLabel: string,
  body: string
): PushPayload {
  return { title: groupName, body: `${senderLabel}: ${oneLineShort(body)}` };
}

/** Notification for a 1:1 message: the sending family as title. */
export function directPushPayload(senderLabel: string, body: string): PushPayload {
  return { title: `${senderLabel} 💬`, body: oneLineShort(body) };
}

/** 1:1 chat screen title: "지훈이네와 채팅". */
export function directChatTitle(friendChildName: string): string {
  return `${familyLabel(friendChildName)}와 채팅`;
}

/**
 * A 1:1 conversation is keyed by the two children, smaller id first, so both
 * families land on the same rows (matches the table's child_low < child_high
 * check; Postgres orders lowercase uuids like these strings).
 */
export function directPair(
  childA: string,
  childB: string
): { low: string; high: string } {
  const a = childA.toLowerCase();
  const b = childB.toLowerCase();
  return a < b ? { low: a, high: b } : { low: b, high: a };
}

/** The 1:1 chat page for talking with `friendChildId` as my `myChildId`. */
export function directChatUrl(friendChildId: string, myChildId: string): string {
  return `/chat/direct/${encodeURIComponent(friendChildId)}?child=${encodeURIComponent(myChildId)}`;
}

/**
 * Which of my children can talk 1:1 with `friendChildId`: those sharing at
 * least one group with it (in `guardedChildIds` order). Never the friend
 * itself. `childGroupRows` are child_groups rows for at least my children
 * and the friend.
 */
export function directChatCandidates(
  guardedChildIds: string[],
  friendChildId: string,
  childGroupRows: { child_id: string; group_id: string }[]
): string[] {
  const friendGroups = new Set(
    childGroupRows
      .filter((row) => row.child_id === friendChildId)
      .map((row) => row.group_id)
  );
  if (friendGroups.size === 0) return [];
  const sharing = new Set(
    childGroupRows
      .filter((row) => row.child_id !== friendChildId && friendGroups.has(row.group_id))
      .map((row) => row.child_id)
  );
  return guardedChildIds.filter(
    (id) => id !== friendChildId && sharing.has(id)
  );
}

/**
 * Which of my children a message is sent as: the active child if it is in
 * the group, otherwise the first of my children there.
 */
export function pickSenderChild(
  myChildIdsInGroup: string[],
  activeChildId: string | null
): string | null {
  if (activeChildId && myChildIdsInGroup.includes(activeChildId)) {
    return activeChildId;
  }
  return myChildIdsInGroup[0] ?? null;
}
