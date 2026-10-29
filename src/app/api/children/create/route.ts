import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import type { Child } from "@/types/db";

/**
 * Creates a new child in a group and makes the caller its first guardian.
 * Body: `{ groupId: string; name: string }`. Returns `{ child: Child }`.
 */
export async function POST(request: NextRequest) {
  let body: { groupId?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  const groupId = body.groupId;
  const name = body.name?.trim();

  if (!groupId || !name) {
    return NextResponse.json(
      { error: "그룹과 아이 이름을 입력해주세요." },
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

  const { data: membership } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json(
      { error: "그룹 멤버만 아이를 추가할 수 있어요" },
      { status: 403 }
    );
  }

  const { data: child, error: childError } = await supabase
    .from("children")
    .insert({ group_id: groupId, name })
    .select()
    .single();

  if (childError || !child) {
    return NextResponse.json(
      { error: childError?.message ?? "아이 추가에 실패했어요." },
      { status: 500 }
    );
  }

  const { error: guardianError } = await supabase
    .from("child_guardians")
    .insert({ child_id: child.id, user_id: user.id });

  if (guardianError) {
    return NextResponse.json(
      { error: guardianError.message },
      { status: 500 }
    );
  }

  // Make the newly added child the active one so the dashboard switches to
  // it immediately. Non-fatal: the child was created correctly either way.
  const { error: activeError } = await supabase
    .from("users")
    .update({ active_child_id: child.id })
    .eq("id", user.id);

  if (activeError) {
    console.error("Failed to set active_child_id:", activeError.message);
  }

  return NextResponse.json({ child: child as Child });
}
