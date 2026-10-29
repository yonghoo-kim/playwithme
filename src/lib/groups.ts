import type { SupabaseClient } from "@supabase/supabase-js";
import { createUniqueInviteCode } from "@/lib/invite";
import type { Group } from "@/types/db";

export const DUPLICATE_GROUP_NAME_MESSAGE = "이미 같은 이름의 그룹이 있어요";

// Creates a group and puts the given children in it (`child_groups`).
// Membership derives from children, so there is no per-user membership row.
// The caller MUST already have verified that `userId` guards every id in
// `childIds`. Throws on failure; callers decide how to surface that.
export async function createGroupForUser(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  childIds: string[]
): Promise<Group> {
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
    throw new Error(groupError?.message ?? "그룹 생성에 실패했어요.");
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
      throw new Error(childGroupError.message);
    }
  }

  return group as Group;
}
