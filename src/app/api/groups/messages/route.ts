import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { getAdminMessaging } from "@/lib/firebase/admin";
import { sendGroupPush } from "@/lib/push";
import { chatPushPayload, familyLabel, normalizeMessage } from "@/lib/chat";
import {
  getGroupChatAccess,
  loadGroupMessages,
  loadTokens,
} from "@/lib/chatAccess";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * The group's newest messages: `GET ?groupId=` -> `{ messages }` (oldest
 * first). ChatRoom calls it on open and whenever the app comes back to the
 * foreground, to catch up on anything Realtime missed.
 */
export async function GET(request: NextRequest) {
  const groupId = request.nextUrl.searchParams.get("groupId") ?? "";

  const authClient = createAuthClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const supabase = createServiceClient();
  const access = await getGroupChatAccess(supabase, user.id, groupId);
  if (!access) {
    return NextResponse.json(
      { error: "이 그룹의 채팅에 참여할 수 없어요" },
      { status: 403 }
    );
  }
  const messages = await loadGroupMessages(supabase, access.groupId);
  return NextResponse.json({ messages }, { headers: NO_STORE });
}

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
  const access = await getGroupChatAccess(supabase, user.id, groupId);
  if (!access) {
    return NextResponse.json(
      { error: "이 그룹의 채팅에 참여할 수 없어요" },
      { status: 403 }
    );
  }
  const { memberChildIds, senderChildId } = access;

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

    const tokens = await loadTokens(supabase, recipients);
    if (tokens.length > 0) {
      const { failedTokens } = await sendGroupPush(
        getAdminMessaging(),
        tokens,
        chatPushPayload(
          access.groupName,
          familyLabel((child?.name as string) ?? ""),
          body
        ),
        { tag: `chat-${groupId}`, url: `/chat/${groupId}` }
      );
      if (failedTokens.length > 0) {
        await supabase.from("fcm_tokens").delete().in("token", failedTokens);
      }
    }
  } catch (err) {
    console.error("chat push failed (message was saved):", err);
  }

  return NextResponse.json({ message });
}
