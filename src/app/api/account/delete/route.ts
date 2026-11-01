import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { getGuardedChildIds } from "@/lib/childAccess";
import { removeChildForGuardian } from "@/lib/removeChild";
import {
  DELETE_ACCOUNT_FAILED,
  groupOwnerCandidates,
} from "@/lib/accountDeletion";

/**
 * "회원탈퇴": deletes the caller's account. No body.
 *
 *  1. Every child I guard goes through the same removal as "아이 지우기"
 *     (removeChildForGuardian): children with another guardian stay with
 *     them; the rest are deleted, with groups they leave empty.
 *  2. Groups I created that still have children are handed to another
 *     guardian in them (or left ownerless). `groups.created_by` references
 *     public.users with no ON DELETE action, so this must happen before the
 *     user row can go.
 *  3. My FCM tokens are removed.
 *  4. The auth user is deleted with the service-role admin API. That
 *     cascades auth.users → public.users → everything referencing it ON
 *     DELETE CASCADE: remaining child_guardians rows, places I created
 *     (statuses at them fall back to null), guardian invites I made, my
 *     group and 1:1 messages, chat_reads, fcm_tokens; invites I used keep
 *     `used_by` null.
 *
 * Each step is safe to re-run, so a failure part-way can simply be retried.
 * Returns `{ ok: true }`; the client then signs out locally.
 */
export async function POST(request: NextRequest) {
  // Belt and braces next to the SameSite=Lax session cookie: only this
  // site's own pages may ask to delete the account.
  const origin = request.headers.get("origin");
  if (origin && originHost(origin) !== request.nextUrl.host) {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 403 });
  }

  const authClient = createAuthClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const supabase = createServiceClient();

  let childIds: string[];
  try {
    childIds = await getGuardedChildIds(supabase, user.id);
  } catch {
    return NextResponse.json({ error: DELETE_ACCOUNT_FAILED }, { status: 500 });
  }

  for (const childId of childIds) {
    const result = await removeChildForGuardian(supabase, user.id, childId);
    // 404: already gone (e.g. a double tap) — nothing left to do for it.
    if (!result.ok && result.status !== 404) {
      return NextResponse.json(
        { error: DELETE_ACCOUNT_FAILED },
        { status: 500 }
      );
    }
  }

  if (!(await releaseOwnedGroups(supabase, user.id))) {
    return NextResponse.json({ error: DELETE_ACCOUNT_FAILED }, { status: 500 });
  }

  const { error: tokenError } = await supabase
    .from("fcm_tokens")
    .delete()
    .eq("user_id", user.id);
  if (tokenError) {
    // The user delete below cascades to fcm_tokens anyway.
    console.error("fcm token delete failed:", tokenError.message);
  }

  const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("auth user delete failed:", deleteError.message);
    return NextResponse.json({ error: DELETE_ACCOUNT_FAILED }, { status: 500 });
  }

  // Clear the session cookies on this response. "local" skips the server
  // call (the session's user no longer exists).
  await authClient.auth.signOut({ scope: "local" }).catch(() => undefined);

  return NextResponse.json({ ok: true });
}

function originHost(origin: string): string | null {
  try {
    return new URL(origin).host;
  } catch {
    return null;
  }
}

/**
 * Hands every group the user created to someone else, or deletes it when no
 * child is left in it. Returns false if any group still points at the user.
 */
async function releaseOwnedGroups(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data: groups, error } = await supabase
    .from("groups")
    .select("id")
    .eq("created_by", userId);
  if (error) {
    console.error("owned groups lookup failed:", error.message);
    return false;
  }

  for (const { id: groupId } of (groups ?? []) as { id: string }[]) {
    const { data: memberRows, error: memberError } = await supabase
      .from("child_groups")
      .select("child_id")
      .eq("group_id", groupId)
      .order("joined_at", { ascending: true });
    if (memberError) {
      console.error("group member lookup failed:", memberError.message);
      return false;
    }
    const memberChildIds = (memberRows ?? []).map(
      (row) => row.child_id as string
    );

    if (memberChildIds.length === 0) {
      const { error: groupError } = await supabase
        .from("groups")
        .delete()
        .eq("id", groupId);
      if (groupError) {
        console.error("empty group delete failed:", groupError.message);
        return false;
      }
      continue;
    }

    const { data: guardianRows, error: guardianError } = await supabase
      .from("child_guardians")
      .select("child_id, user_id")
      .in("child_id", memberChildIds);
    if (guardianError) {
      console.error("group guardian lookup failed:", guardianError.message);
      return false;
    }

    const candidates = groupOwnerCandidates(
      userId,
      memberChildIds,
      (guardianRows ?? []) as { child_id: string; user_id: string }[]
    );

    let transferred = false;
    for (const candidate of candidates) {
      // Fails on unique(created_by, name) when they already own a group
      // with this name — then try the next guardian.
      const { error: updateError } = await supabase
        .from("groups")
        .update({ created_by: candidate })
        .eq("id", groupId);
      if (!updateError) {
        transferred = true;
        break;
      }
      if (updateError.code !== "23505") {
        console.error("group owner transfer failed:", updateError.message);
      }
    }

    if (!transferred) {
      // Nobody could take it: the group stays for its children, ownerless.
      const { error: clearError } = await supabase
        .from("groups")
        .update({ created_by: null })
        .eq("id", groupId);
      if (clearError) {
        console.error("group owner clear failed:", clearError.message);
        return false;
      }
    }
  }

  return true;
}
