import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { getAdminMessaging } from "@/lib/firebase/admin";
import { sendGroupPush } from "@/lib/push";
import {
  chatPushPayload,
  directChatTitle,
  directChatUrl,
  directPushPayload,
  familyLabel,
  normalizeMessage,
} from "@/lib/chat";
import {
  getDirectChatAccess,
  loadDirectMessages,
  loadFamilyLabels,
  loadTokens,
} from "@/lib/chatAccess";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const FORBIDDEN = "이 친구와는 채팅할 수 없어요";

/**
 * A 1:1 conversation's newest messages:
 * `GET ?childId=<my child>&friendChildId=` -> `{ messages }` (oldest first).
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const childId = params.get("childId") ?? "";
  const friendChildId = params.get("friendChildId") ?? "";

  const authClient = createAuthClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }

  const supabase = createServiceClient();
  const access = await getDirectChatAccess(
    supabase,
    user.id,
    friendChildId,
    childId,
    true
  );
  if (!access) {
    return NextResponse.json({ error: FORBIDDEN }, { status: 403 });
  }
  const messages = await loadDirectMessages(supabase, access.low, access.high);
  return NextResponse.json({ messages }, { headers: NO_STORE });
}

/**
 * Posts a 1:1 message between my child's family and a friend child's family.
 * Body: `{ childId: string (my child); friendChildId: string; body: string }`.
 * I must guard `childId`, and the two children must share a group. Notifies
 * the friend's guardians, and my child's other guardians. Returns
 * `{ message }` (the inserted row).
 */
export async function POST(request: NextRequest) {
  let payload: { childId?: unknown; friendChildId?: unknown; body?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  const childId = typeof payload.childId === "string" ? payload.childId : "";
  const friendChildId =
    typeof payload.friendChildId === "string" ? payload.friendChildId : "";
  const body =
    typeof payload.body === "string" ? normalizeMessage(payload.body) : null;
  if (!childId || !friendChildId || !body) {
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
  const access = await getDirectChatAccess(
    supabase,
    user.id,
    friendChildId,
    childId,
    true
  );
  if (!access) {
    return NextResponse.json({ error: FORBIDDEN }, { status: 403 });
  }
  const { myChildId, low, high } = access;

  const { data: message, error: insertError } = await supabase
    .from("direct_messages")
    .insert({
      child_low: low,
      child_high: high,
      user_id: user.id,
      child_id: myChildId,
      body,
    })
    .select("id, child_low, child_high, user_id, child_id, body, created_at")
    .single();
  if (insertError || !message) {
    console.error("direct message insert failed:", insertError?.message);
    return NextResponse.json(
      { error: "메시지를 보내지 못했어요. 다시 시도해주세요." },
      { status: 500 }
    );
  }

  // Push: the friend's family opens the chat from their side, my child's
  // other guardians from ours. A push problem is logged only; the message is
  // already saved and shown live via Realtime.
  try {
    const [{ data: guardianRows }, { names }] = await Promise.all([
      supabase
        .from("child_guardians")
        .select("child_id, user_id")
        .in("child_id", [myChildId, friendChildId]),
      loadFamilyLabels(supabase, [myChildId, friendChildId]),
    ]);
    const rows = (guardianRows ?? []) as { child_id: string; user_id: string }[];
    const friendFamily = new Set(
      rows.filter((r) => r.child_id === friendChildId).map((r) => r.user_id)
    );
    friendFamily.delete(user.id);
    const myFamily = new Set(
      rows
        .filter((r) => r.child_id === myChildId && !friendFamily.has(r.user_id))
        .map((r) => r.user_id)
    );
    myFamily.delete(user.id);

    const senderLabel = familyLabel(names[myChildId] ?? "");
    const tag = `dm-${low}-${high}`;
    const messaging = getAdminMessaging();
    const failed: string[] = [];

    const friendTokens = await loadTokens(supabase, Array.from(friendFamily));
    if (friendTokens.length > 0) {
      const { failedTokens } = await sendGroupPush(
        messaging,
        friendTokens,
        directPushPayload(senderLabel, body),
        { tag, url: directChatUrl(myChildId, friendChildId) }
      );
      failed.push(...failedTokens);
    }

    const myTokens = await loadTokens(supabase, Array.from(myFamily));
    if (myTokens.length > 0) {
      const { failedTokens } = await sendGroupPush(
        messaging,
        myTokens,
        chatPushPayload(
          directChatTitle(names[friendChildId] ?? ""),
          senderLabel,
          body
        ),
        { tag, url: directChatUrl(friendChildId, myChildId) }
      );
      failed.push(...failedTokens);
    }

    if (failed.length > 0) {
      await supabase.from("fcm_tokens").delete().in("token", failed);
    }
  } catch (err) {
    console.error("direct chat push failed (message was saved):", err);
  }

  return NextResponse.json({ message });
}
