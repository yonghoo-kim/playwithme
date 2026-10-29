import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { isGroupOwner } from "@/lib/groups";

/**
 * Deletes a group for everyone in it. Owner (the group's creator) only.
 * Body: `{ groupId: string }`. Memberships go with it (cascade); the
 * children, their statuses and places are untouched.
 */
export async function POST(request: NextRequest) {
  let body: { groupId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  const groupId = typeof body.groupId === "string" ? body.groupId : "";
  if (!groupId) {
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

  if (!(await isGroupOwner(supabase, user.id, groupId))) {
    return NextResponse.json(
      { error: "그룹을 만든 사람만 삭제할 수 있어요" },
      { status: 403 }
    );
  }

  const { error } = await supabase.from("groups").delete().eq("id", groupId);
  if (error) {
    console.error("group delete failed:", error.message);
    return NextResponse.json(
      { error: "그룹을 삭제하지 못했어요." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
