import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { assertGuardian, getGuardedChildIds } from "@/lib/childAccess";
import {
  decideChildRemoval,
  groupsEmptiedBy,
  nextActiveChildId,
} from "@/lib/childRemoval";

const DELETE_FAILED = "아이를 지우지 못했어요. 다시 시도해주세요.";

/**
 * "아이 지우기": takes one of the caller's children off their list.
 * Body: `{ childId: string }`.
 *
 * My guardianship row always goes. If another guardian still has the child
 * it stays for them; if nobody is left, the child row is deleted — FK
 * cascades remove its status, group memberships, guardian invites and 1:1
 * chats, group messages keep their text with `child_id` set null, and any
 * `users.active_child_id` pointing at it is set null. Groups the child was
 * the last member of are deleted too (like the last child leaving).
 * Anyone whose active child was this one is moved to their next child.
 *
 * Returns `{ ok: true, childDeleted: boolean }`.
 */
export async function POST(request: NextRequest) {
  let body: { childId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  const childId = typeof body.childId === "string" ? body.childId : "";
  if (!childId) {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  const authClient = createAuthClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const supabase = createServiceClient();

  if (!(await assertGuardian(supabase, user.id, childId))) {
    return NextResponse.json(
      { error: "내 아이만 지울 수 있어요." },
      { status: 403 }
    );
  }

  // Who has this child selected, captured before the FK nulls it.
  const { data: activeRows, error: activeLookupError } = await supabase
    .from("users")
    .select("id")
    .eq("active_child_id", childId);
  if (activeLookupError) {
    console.error("active child lookup failed:", activeLookupError.message);
    return NextResponse.json({ error: DELETE_FAILED }, { status: 500 });
  }

  const { data: removed, error: guardianError } = await supabase
    .from("child_guardians")
    .delete()
    .eq("child_id", childId)
    .eq("user_id", user.id)
    .select("child_id");

  if (guardianError) {
    console.error("child guardian delete failed:", guardianError.message);
    return NextResponse.json({ error: DELETE_FAILED }, { status: 500 });
  }
  if (!removed || removed.length === 0) {
    return NextResponse.json(
      { error: "이미 지워진 아이예요." },
      { status: 404 }
    );
  }

  // Decided after my row is gone, so two guardians removing themselves at
  // once can't leave an orphan child nobody guards.
  const { data: remainingRows, error: remainingError } = await supabase
    .from("child_guardians")
    .select("user_id")
    .eq("child_id", childId);

  if (remainingError) {
    console.error("child guardian lookup failed:", remainingError.message);
    await restoreGuardian(supabase, childId, user.id);
    return NextResponse.json({ error: DELETE_FAILED }, { status: 500 });
  }

  const decision = decideChildRemoval(
    (remainingRows ?? []).map((row) => row.user_id as string)
  );

  let affectedUserIds = (activeRows ?? []).map((row) => row.id as string);

  if (decision === "keep_child") {
    // The other guardians still have the child; only my selection moves.
    affectedUserIds = affectedUserIds.filter((id) => id === user.id);

    // Invite links I made for this child shouldn't keep working.
    const { error: inviteError } = await supabase
      .from("child_guardian_invites")
      .delete()
      .eq("child_id", childId)
      .eq("created_by", user.id)
      .is("used_at", null);
    if (inviteError) {
      console.error("guardian invite cleanup failed:", inviteError.message);
    }
  } else {
    const emptiedGroupIds = await groupsOnlyThisChildIsIn(supabase, childId);

    const { error: childError } = await supabase
      .from("children")
      .delete()
      .eq("id", childId);

    if (childError) {
      console.error("child delete failed:", childError.message);
      await restoreGuardian(supabase, childId, user.id);
      return NextResponse.json({ error: DELETE_FAILED }, { status: 500 });
    }

    for (const groupId of emptiedGroupIds) {
      // Re-check: someone may have joined since the lookup.
      const { count } = await supabase
        .from("child_groups")
        .select("child_id", { count: "exact", head: true })
        .eq("group_id", groupId);
      if (count === 0) {
        const { error: groupError } = await supabase
          .from("groups")
          .delete()
          .eq("id", groupId);
        if (groupError) {
          console.error("empty group delete failed:", groupError.message);
        }
      }
    }
  }

  // Non-fatal: the dashboard also falls back to the first child when the
  // stored active child is null or no longer theirs.
  for (const userId of affectedUserIds) {
    await moveActiveChild(supabase, userId, childId);
  }

  return NextResponse.json({
    ok: true,
    childDeleted: decision === "delete_child",
  });
}

async function restoreGuardian(
  supabase: SupabaseClient,
  childId: string,
  userId: string
) {
  const { error } = await supabase
    .from("child_guardians")
    .insert({ child_id: childId, user_id: userId });
  if (error) {
    console.error("child guardian restore failed:", error.message);
  }
}

/** Groups that would be left empty once `childId` is gone. */
async function groupsOnlyThisChildIsIn(
  supabase: SupabaseClient,
  childId: string
): Promise<string[]> {
  const { data: ownRows } = await supabase
    .from("child_groups")
    .select("group_id")
    .eq("child_id", childId);
  const groupIds = (ownRows ?? []).map((row) => row.group_id as string);
  if (groupIds.length === 0) return [];

  const { data: memberRows, error } = await supabase
    .from("child_groups")
    .select("child_id, group_id")
    .in("group_id", groupIds);
  if (error) {
    console.error("group member lookup failed:", error.message);
    return [];
  }
  return groupsEmptiedBy(
    childId,
    (memberRows ?? []) as { child_id: string; group_id: string }[]
  );
}

/** Points the user's active child at their next child (or null). */
async function moveActiveChild(
  supabase: SupabaseClient,
  userId: string,
  removedChildId: string
) {
  try {
    const guardedIds = await getGuardedChildIds(supabase, userId);
    let orderedIds: string[] = [];
    if (guardedIds.length > 0) {
      const { data: childRows } = await supabase
        .from("children")
        .select("id")
        .in("id", guardedIds)
        .order("created_at", { ascending: true });
      orderedIds = (childRows ?? []).map((row) => row.id as string);
    }

    const next = nextActiveChildId(removedChildId, removedChildId, orderedIds);
    const { error } = await supabase
      .from("users")
      .update({ active_child_id: next })
      .eq("id", userId);
    if (error) {
      console.error("Failed to move active_child_id:", error.message);
    }
  } catch (error) {
    console.error("Failed to move active_child_id:", error);
  }
}
