import type { SupabaseClient } from "@supabase/supabase-js";
import { createUniqueInviteCode } from "@/lib/invite";
import type { Group } from "@/types/db";

export const DUPLICATE_GROUP_NAME_MESSAGE = "이미 같은 이름의 그룹이 있어요";

// Shared by `POST /api/groups/create` (client-side fetch path) and the
// dashboard's empty-state Server Action (no-JS form path) so group
// creation has exactly one implementation. Throws on failure; callers
// decide how to surface that (JSON error response vs. thrown Server
// Action error).
export async function createGroupForUser(
  supabase: SupabaseClient,
  userId: string,
  name: string
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

  const { error: memberError } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: userId });

  if (memberError) {
    throw new Error(memberError.message);
  }

  return group as Group;
}
