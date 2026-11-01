import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { getGroupChatAccess } from "@/lib/chatAccess";

/**
 * 설정 > 그룹: turn one group's pushes (status + group chat) off or on for
 * me. Body: `{ groupId: string; muted: boolean }`. Muting needs one of my
 * children in the group; unmuting just removes my row (group_mutes,
 * migration 0013).
 */
export async function POST(request: NextRequest) {
  let body: { groupId?: unknown; muted?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  const groupId = typeof body.groupId === "string" ? body.groupId : "";
  if (!groupId || typeof body.muted !== "boolean") {
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

  if (body.muted) {
    if (!(await getGroupChatAccess(supabase, user.id, groupId))) {
      return NextResponse.json(
        { error: "내 아이가 있는 그룹만 바꿀 수 있어요" },
        { status: 403 }
      );
    }
    const { error } = await supabase
      .from("group_mutes")
      .upsert(
        { user_id: user.id, group_id: groupId },
        { onConflict: "user_id,group_id", ignoreDuplicates: true }
      );
    if (error) {
      console.error("group mute failed:", error.message);
      return NextResponse.json(
        { error: "알림 설정을 바꾸지 못했어요. 다시 시도해주세요." },
        { status: 500 }
      );
    }
  } else {
    const { error } = await supabase
      .from("group_mutes")
      .delete()
      .eq("user_id", user.id)
      .eq("group_id", groupId);
    if (error) {
      console.error("group unmute failed:", error.message);
      return NextResponse.json(
        { error: "알림 설정을 바꾸지 못했어요. 다시 시도해주세요." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true, muted: body.muted });
}
