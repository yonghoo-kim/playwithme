import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import {
  DUPLICATE_GROUP_NAME_MESSAGE,
  isGroupOwner,
  renameGroup,
} from "@/lib/groups";

/**
 * Renames a group. Owner (the group's creator) only.
 * Body: `{ groupId: string; name: string }`. 409 when a child in the group
 * is already in another group with that name.
 */
export async function POST(request: NextRequest) {
  let body: { groupId?: unknown; name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  const groupId = typeof body.groupId === "string" ? body.groupId : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!groupId) {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json(
      { error: "그룹 이름을 입력해주세요." },
      { status: 400 }
    );
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
      { error: "그룹을 만든 사람만 이름을 바꿀 수 있어요" },
      { status: 403 }
    );
  }

  try {
    await renameGroup(supabase, groupId, name);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "그룹 이름을 바꾸지 못했어요.";
    return NextResponse.json(
      { error: message },
      { status: message === DUPLICATE_GROUP_NAME_MESSAGE ? 409 : 500 }
    );
  }
}
