import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { getAdminMessaging } from "@/lib/firebase/admin";
import { getGuardedChildIds } from "@/lib/childAccess";
import { sendGroupPush } from "@/lib/push";
import {
  chatPushPayload,
  familyLabel,
  normalizeMessage,
  pickSenderChild,
} from "@/lib/chat";

/**
 * Posts a chat message to a group and notifies everyone else in it.
 * Body: `{ groupId: string; body: string }`. The sender must guard a child
 * in the group; the message is said as that child's family ("지훈이네").
 * Returns `{ message }` (the inserted row).
 */
export async function POST(request: NextRequest) {
  let payload: { groupId?: unknown; body?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  const groupId = typeof payload.groupId === "string" ? payload.groupId : "";
  const body =
    typeof payload.body === "string" ? normalizeMessage(payload.body) : null;
  if (!groupId || !body) {
    return NextResponse.json({ error: "메시지를 입력해주세요." }, { status: 400 });
  }

  const authClient = createAuthClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const supabase = createServiceClient();

  const guarded = await getGuardedChildIds(supabase, user.id);
  const [{ data: memberRows }, { data: userRow }, { data: group }] =
    await Promise.all([
      supabase.from("child_groups").select("child_id").eq("group_id", groupId),
      supabase
        .from("users")
        .select("active_child_id")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("groups").select("name").eq("id", groupId).maybeSingle(),
    ]);

  const memberChildIds = (memberRows ?? []).map((row) => row.child_id as string);
  const guardedSet = new Set(guarded);
  const senderChildId = pickSenderChild(
    memberChildIds.filter((id) => guardedSet.has(id)),
    (userRow?.active_child_id as string | null | undefined) ?? null
  );
  if (!group || !senderChildId) {
    return NextResponse.json(
      { error: "이 그룹의 채팅에 참여할 수 없어요" },
      { status: 403 }
    );
  }

  const { data: message, error: insertError } = await supabase
    .from("group_messages")
    .insert({ group_id: groupId, user_id: user.id, child_id: senderChildId, body })
    .select("id, group_id, user_id, child_id, body, created_at")
    .single();
  if (insertError || !message) {
    console.error("chat insert failed:", insertError?.message);
    return NextResponse.json(
      { error: "메시지를 보내지 못했어요. 다시 시도해주세요." },
      { status: 500 }
    );
  }

  // Notify the other families in the group. A push problem is logged only;
  // the message itself is already saved and shown live via Realtime.
  try {
    const [{ data: guardianRows }, { data: child }] = await Promise.all([
      supabase
        .from("child_guardians")
        .select("user_id")
        .in("child_id", memberChildIds),
      supabase.from("children").select("name").eq("id", senderChildId).maybeSingle(),
    ]);
    const recipients = Array.from(
      new Set((guardianRows ?? []).map((row) => row.user_id as string))
    ).filter((id) => id !== user.id);

    if (recipients.length > 0) {
      const { data: tokenRows } = await supabase
        .from("fcm_tokens")
        .select("token")
        .in("user_id", recipients);
      const tokens = Array.from(
        new Set((tokenRows ?? []).map((row) => row.token as string))
      );
      if (tokens.length > 0) {
        const { failedTokens } = await sendGroupPush(
          getAdminMessaging(),
          tokens,
          chatPushPayload(
            group.name as string,
            familyLabel((child?.name as string) ?? ""),
            body
          ),
          { tag: `chat-${groupId}`, url: `/chat/${groupId}` }
        );
        if (failedTokens.length > 0) {
          await supabase.from("fcm_tokens").delete().in("token", failedTokens);
        }
      }
    }
  } catch (err) {
    console.error("chat push failed (message was saved):", err);
  }

  return NextResponse.json({ message });
}
