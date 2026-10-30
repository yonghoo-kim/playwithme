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

/** Notification for a chat message: the group as title, one-line body. */
export function chatPushPayload(
  groupName: string,
  senderLabel: string,
  body: string
): PushPayload {
  const oneLine = body.replace(/\s+/g, " ").trim();
  const short = oneLine.length > 80 ? `${oneLine.slice(0, 80)}…` : oneLine;
  return { title: groupName, body: `${senderLabel}: ${short}` };
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
