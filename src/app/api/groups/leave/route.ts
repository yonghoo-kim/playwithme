import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { assertGuardian } from "@/lib/childAccess";

/**
 * Takes one of the caller's children out of a group.
 * Body: `{ groupId: string; childId: string }`. When no child is left in the
 * group, the group itself is deleted (its invite link stops working).
 * Returns `{ ok: true, groupDeleted: boolean }`.
 */
export async function POST(request: NextRequest) {
  let body: { groupId?: unknown; childId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  const groupId = typeof body.groupId === "string" ? body.groupId : "";
  const childId = typeof body.childId === "string" ? body.childId : "";
  if (!groupId || !childId) {
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
      { error: "내 아이만 그룹에서 나갈 수 있어요" },
      { status: 403 }
    );
  }

  const { data: removed, error: deleteError } = await supabase
    .from("child_groups")
    .delete()
    .eq("group_id", groupId)
    .eq("child_id", childId)
    .select("child_id");

  if (deleteError) {
    console.error("group leave failed:", deleteError.message);
    return NextResponse.json(
      { error: "그룹에서 나가지 못했어요." },
      { status: 500 }
    );
  }
  if (!removed || removed.length === 0) {
    return NextResponse.json(
      { error: "이미 이 그룹에 없어요" },
      { status: 404 }
    );
  }

  // Last child out: remove the empty group (child_groups rows cascade).
  const { count } = await supabase
    .from("child_groups")
    .select("child_id", { count: "exact", head: true })
    .eq("group_id", groupId);

  let groupDeleted = false;
  if (count === 0) {
    const { error: groupError } = await supabase
      .from("groups")
      .delete()
      .eq("id", groupId);
    groupDeleted = !groupError;
  }

  return NextResponse.json({ ok: true, groupDeleted });
}
