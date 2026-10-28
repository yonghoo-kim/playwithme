import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { getAdminMessaging } from "@/lib/firebase/admin";
import { buildStatusUpsertRow } from "@/lib/status";
import { formatPushPayload } from "@/lib/push";
import { sendGroupPush } from "@/lib/push";

export async function POST(request: NextRequest) {
  const { groupId, placeId } = (await request.json()) as {
    groupId: string;
    placeId: string | null;
  };

  const supabaseAuth = createAuthClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const row = buildStatusUpsertRow(user.id, groupId, placeId);
  const { error: upsertError } = await supabase
    .from("current_statuses")
    .upsert(row);

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  // "🏠 귀가 (Home)" clears place_id and never triggers a push.
  if (placeId === null) {
    return NextResponse.json({ ok: true });
  }

  // The status update itself already succeeded above — a push-sending
  // problem (bad Firebase credentials, a transient API error, etc.) is a
  // side effect failure, not a reason to fail this response, so it's
  // isolated in its own try/catch and only logged.
  try {
    const [{ data: userRow }, { data: place }, { data: members }] =
      await Promise.all([
        supabase.from("users").select("child_name").eq("id", user.id).single(),
        supabase.from("places").select("name").eq("id", placeId).single(),
        supabase
          .from("group_members")
          .select("user_id")
          .eq("group_id", groupId)
          .neq("user_id", user.id),
      ]);

    const memberIds = (members ?? []).map((member) => member.user_id);

    if (memberIds.length > 0) {
      const { data: tokenRows } = await supabase
        .from("fcm_tokens")
        .select("token")
        .in("user_id", memberIds);

      const tokens = (tokenRows ?? []).map((tokenRow) => tokenRow.token);

      if (tokens.length > 0) {
        const payload = formatPushPayload(
          userRow?.child_name ?? "",
          place?.name ?? ""
        );

        const { failedTokens } = await sendGroupPush(
          getAdminMessaging(),
          tokens,
          payload
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
