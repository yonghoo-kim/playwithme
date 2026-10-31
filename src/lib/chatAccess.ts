import type { SupabaseClient } from "@supabase/supabase-js";
import { getGuardedChildIds } from "./childAccess";
import {
  CHAT_PAGE_SIZE,
  directChatCandidates,
  directPair,
  familyLabel,
  pickSenderChild,
  toChatMessage,
  type ChatMessage,
  type ChatMessageRow,
} from "./chat";

// Server-side chat access checks and loading, shared by the chat pages and
// the /api/groups/messages and /api/direct/messages routes. Callers pass the
// service client after authenticating the user.

const MESSAGE_COLUMNS = "id, user_id, child_id, body, created_at";

export interface GroupChatAccess {
  groupId: string;
  groupName: string;
  /** Every child in the group. */
  memberChildIds: string[];
  /** Which of my children I speak as (active child when it is a member). */
  senderChildId: string;
}

/** Null when the group doesn't exist or none of my children are in it. */
export async function getGroupChatAccess(
  supabase: SupabaseClient,
  userId: string,
  groupId: string
): Promise<GroupChatAccess | null> {
  if (!groupId) return null;
  const [guarded, { data: group }, { data: memberRows }, { data: userRow }] =
    await Promise.all([
      getGuardedChildIds(supabase, userId),
      supabase.from("groups").select("id, name").eq("id", groupId).maybeSingle(),
      supabase.from("child_groups").select("child_id").eq("group_id", groupId),
      supabase
        .from("users")
        .select("active_child_id")
        .eq("id", userId)
        .maybeSingle(),
    ]);

  const memberChildIds = (memberRows ?? []).map((row) => row.child_id as string);
  const guardedSet = new Set(guarded);
  const senderChildId = pickSenderChild(
    memberChildIds.filter((id) => guardedSet.has(id)),
    (userRow?.active_child_id as string | null | undefined) ?? null
  );
  if (!group || !senderChildId) return null;
  return {
    groupId: group.id as string,
    groupName: group.name as string,
    memberChildIds,
    senderChildId,
  };
}

export interface DirectChatAccess {
  /** My child this conversation is for. */
  myChildId: string;
  friendChildId: string;
  low: string;
  high: string;
}

/**
 * Checks that I may talk 1:1 with `friendChildId`: I guard a child (not the
 * friend) that shares a group with it. `preferredChildId` picks which of my
 * children (e.g. the page's `?child=`); `strict` makes an unusable preferred
 * child a refusal (the API, so a message never lands in another pair)
 * instead of falling back to the active child, then the first candidate.
 */
export async function getDirectChatAccess(
  supabase: SupabaseClient,
  userId: string,
  friendChildId: string,
  preferredChildId: string | null,
  strict = false
): Promise<DirectChatAccess | null> {
  if (!friendChildId) return null;
  const guarded = await getGuardedChildIds(supabase, userId);
  if (guarded.length === 0 || guarded.includes(friendChildId)) return null;

  const { data: rows } = await supabase
    .from("child_groups")
    .select("child_id, group_id")
    .in("child_id", [...guarded, friendChildId]);
  const candidates = directChatCandidates(
    guarded,
    friendChildId,
    (rows ?? []) as { child_id: string; group_id: string }[]
  );

  let myChildId: string | null = null;
  if (preferredChildId && candidates.includes(preferredChildId)) {
    myChildId = preferredChildId;
  } else if (strict) {
    return null;
  } else {
    const { data: userRow } = await supabase
      .from("users")
      .select("active_child_id")
      .eq("id", userId)
      .maybeSingle();
    myChildId = pickSenderChild(
      candidates,
      (userRow?.active_child_id as string | null | undefined) ?? null
    );
  }
  if (!myChildId) return null;

  return { myChildId, friendChildId, ...directPair(myChildId, friendChildId) };
}

function toMessages(rows: unknown[] | null): ChatMessage[] {
  return ((rows ?? []) as ChatMessageRow[]).reverse().map(toChatMessage);
}

/** The group's newest messages, oldest first. */
export async function loadGroupMessages(
  supabase: SupabaseClient,
  groupId: string
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("group_messages")
    .select(MESSAGE_COLUMNS)
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(CHAT_PAGE_SIZE);
  if (error) console.error("group_messages lookup failed:", error.message);
  return toMessages(data);
}

/** The pair's newest 1:1 messages, oldest first. */
export async function loadDirectMessages(
  supabase: SupabaseClient,
  low: string,
  high: string
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("direct_messages")
    .select(MESSAGE_COLUMNS)
    .eq("child_low", low)
    .eq("child_high", high)
    .order("created_at", { ascending: false })
    .limit(CHAT_PAGE_SIZE);
  if (error) console.error("direct_messages lookup failed:", error.message);
  return toMessages(data);
}

/** child id -> "지훈이네" for every given child that still exists. */
export async function loadFamilyLabels(
  supabase: SupabaseClient,
  childIds: string[]
): Promise<{ labels: Record<string, string>; names: Record<string, string> }> {
  const ids = Array.from(new Set(childIds.filter(Boolean)));
  const labels: Record<string, string> = {};
  const names: Record<string, string> = {};
  if (ids.length === 0) return { labels, names };
  const { data } = await supabase.from("children").select("id, name").in("id", ids);
  for (const child of (data ?? []) as { id: string; name: string }[]) {
    labels[child.id] = familyLabel(child.name);
    names[child.id] = child.name;
  }
  return { labels, names };
}

/** Distinct FCM tokens of the given users. */
export async function loadTokens(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<string[]> {
  if (userIds.length === 0) return [];
  const { data } = await supabase
    .from("fcm_tokens")
    .select("token")
    .in("user_id", userIds);
  return Array.from(new Set((data ?? []).map((row) => row.token as string)));
}
