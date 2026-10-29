import type { SupabaseClient } from "@supabase/supabase-js";
import { createUniqueInviteCode } from "@/lib/invite";
import type { Group } from "@/types/db";

export const DUPLICATE_GROUP_NAME_MESSAGE = "이미 같은 이름의 그룹이 있어요";

/** Trimmed, with runs of whitespace collapsed to one space. */
export function normalizeGroupName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

/** True when `name` equals one of `existing`, ignoring spacing and case. */
export function hasSameGroupName(existing: string[], name: string): boolean {
  const key = normalizeGroupName(name).toLowerCase();
  return existing.some((other) => normalizeGroupName(other).toLowerCase() === key);
}

/**
 * Throws DUPLICATE_GROUP_NAME_MESSAGE when any of `childIds` is already in a
 * group called `name` (whoever created it) — a child never sees two groups
 * with the same name. `excludeGroupId` skips the group being renamed.
 */
export async function assertNoSameNameGroup(
  supabase: SupabaseClient,
  childIds: string[],
  name: string,
  excludeGroupId?: string
): Promise<void> {
  if (childIds.length === 0) return;

  const { data: links } = await supabase
    .from("child_groups")
    .select("group_id")
    .in("child_id", childIds);
  const groupIds = Array.from(
    new Set((links ?? []).map((row) => row.group_id as string))
  ).filter((id) => id !== excludeGroupId);
  if (groupIds.length === 0) return;

  const { data: groups } = await supabase
    .from("groups")
    .select("name")
    .in("id", groupIds);
  if (
    hasSameGroupName(
      (groups ?? []).map((group) => group.name as string),
      name
    )
  ) {
    throw new Error(DUPLICATE_GROUP_NAME_MESSAGE);
  }
}

/** True when `userId` created the group (its owner). */
export async function isGroupOwner(
  supabase: SupabaseClient,
  userId: string,
  groupId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("groups")
    .select("created_by")
    .eq("id", groupId)
    .maybeSingle();
  return !!data && data.created_by === userId;
}

/**
 * Renames a group, keeping names unique for every child in it. The caller
 * MUST already have verified ownership. Throws DUPLICATE_GROUP_NAME_MESSAGE
 * on a clash.
 */
export async function renameGroup(
  supabase: SupabaseClient,
  groupId: string,
  rawName: string
): Promise<void> {
  const name = normalizeGroupName(rawName);

  const { data: members } = await supabase
    .from("child_groups")
    .select("child_id")
    .eq("group_id", groupId);
  await assertNoSameNameGroup(
    supabase,
    (members ?? []).map((row) => row.child_id as string),
    name,
    groupId
  );

  const { error } = await supabase
    .from("groups")
    .update({ name })
    .eq("id", groupId);
  if (error) {
    // `unique(created_by, name)`: the owner already has a group with it.
    throw new Error(
      error.code === "23505"
        ? DUPLICATE_GROUP_NAME_MESSAGE
        : "그룹 이름을 바꾸지 못했어요."
    );
  }
}

// Creates a group and puts the given children in it (`child_groups`).
// Membership derives from children, so there is no per-user membership row.
// The caller MUST already have verified that `userId` guards every id in
// `childIds`. Throws on failure; callers decide how to surface that.
export async function createGroupForUser(
  supabase: SupabaseClient,
  userId: string,
  rawName: string,
  childIds: string[]
): Promise<Group> {
  const name = normalizeGroupName(rawName);
  await assertNoSameNameGroup(supabase, childIds, name);

  const inviteCode = await createUniqueInviteCode(async (code) => {
    const { data } = await supabase
      .from("groups")
      .select("id")
      .eq("invite_code", code)
      .maybeSingle();
    return !!data;
  });

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .insert({ name, invite_code: inviteCode, created_by: userId })
    .select()
    .single();

  if (groupError || !group) {
    // `unique(created_by, name)`: the same user already has a group with
    // this name (uniqueness is per-creator, not global).
    if (groupError?.code === "23505") {
      throw new Error(DUPLICATE_GROUP_NAME_MESSAGE);
    }
    throw new Error("그룹을 만들지 못했어요.");
  }

  const uniqueChildIds = Array.from(new Set(childIds));
  if (uniqueChildIds.length > 0) {
    const { error: childGroupError } = await supabase
      .from("child_groups")
      .insert(
        uniqueChildIds.map((childId) => ({
          child_id: childId,
          group_id: group.id,
        }))
      );

    if (childGroupError) {
      // Don't leave behind a group no child is in (nobody could see it, and
      // it would block reusing the name).
      await supabase.from("groups").delete().eq("id", group.id);
      console.error("child_groups insert failed:", childGroupError.message);
      throw new Error("그룹을 만들지 못했어요.");
    }
  }

  return group as Group;
}
