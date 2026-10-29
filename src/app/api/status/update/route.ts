import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { getAdminMessaging } from "@/lib/firebase/admin";
import { buildStatusUpsertRow } from "@/lib/status";
import { excludeToken, formatPushPayload, sendGroupPush } from "@/lib/push";

export async function POST(request: NextRequest) {
  const { childId, placeId, deviceToken } = (await request.json()) as {
    childId: string;
    placeId: string | null;
    deviceToken?: string | null;
  };

  const supabaseAuth = createAuthClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: guardian } = await supabase
    .from("child_guardians")
    .select("user_id")
    .eq("child_id", childId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!guardian) {
    return NextResponse.json(
      { error: "이 아이의 보호자만 상태를 바꿀 수 있어요" },
      { status: 403 }
    );
  }

  const { data: child } = await supabase
    .from("children")
    .select("group_id, name")
    .eq("id", childId)
    .maybeSingle();

  if (!child) {
    return NextResponse.json(
      { error: "아이를 찾을 수 없어요" },
      { status: 404 }
    );
  }

  const groupId = child.group_id;

  const row = buildStatusUpsertRow(childId, groupId, placeId);
  const { error: upsertError } = await supabase
    .from("current_statuses")
    .upsert(row);

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  // Every status change notifies the group — arriving somewhere and going
  // home ("🏠 귀가", placeId null) alike. The status update itself already
  // succeeded above; a push-sending problem is a side-effect failure, so it's
  // isolated in its own try/catch and only logged.
  try {
    const [{ data: place }, { data: members }] = await Promise.all([
      placeId
        ? supabase.from("places").select("name").eq("id", placeId).single()
        : Promise.resolve({ data: null }),
      supabase.from("group_members").select("user_id").eq("group_id", groupId),
    ]);

    const memberIds = (members ?? []).map((member) => member.user_id);

    if (memberIds.length > 0) {
      const { data: tokenRows } = await supabase
        .from("fcm_tokens")
        .select("token")
        .in("user_id", memberIds);

      const allTokens = (tokenRows ?? []).map((tokenRow) => tokenRow.token);
      const tokens = excludeToken(allTokens, deviceToken ?? null);

      if (tokens.length > 0) {
        const payload = formatPushPayload(
          child.name ?? "",
          placeId ? (place?.name ?? "") : null
        );

        const { failedTokens } = await sendGroupPush(
          getAdminMessaging(),
          tokens,
          payload,
          { tag: "child-" + childId }
        );

        if (failedTokens.length > 0) {
          await supabase.from("fcm_tokens").delete().in("token", failedTokens);
        }
      }
    }
  } catch (err) {
    console.error("push send failed (status update still succeeded):", err);
  }

  return NextResponse.json({ ok: true });
}
