import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";

/**
 * Attaches the caller as an additional guardian of an existing child.
 * Body: `{ childId: string }`. Returns `{ ok: true }`.
 */
export async function POST(request: NextRequest) {
  let body: { childId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  const childId = body.childId;
  if (!childId) {
    return NextResponse.json(
      { error: "아이를 선택해주세요." },
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

  const { data: child } = await supabase
    .from("children")
    .select("group_id")
    .eq("id", childId)
    .maybeSingle();

  if (!child) {
    return NextResponse.json(
      { error: "아이를 찾을 수 없어요." },
      { status: 404 }
    );
  }

  const { data: membership } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", child.group_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json(
      { error: "이 그룹의 멤버만 연결할 수 있어요" },
      { status: 403 }
    );
  }

  const { error: guardianError } = await supabase
    .from("child_guardians")
    .insert({ child_id: childId, user_id: user.id });

  // Ignore "already a guardian" duplicate-key errors; any other error is
  // a real failure worth surfacing.
  if (guardianError && guardianError.code !== "23505") {
    return NextResponse.json(
      { error: guardianError.message },
      { status: 500 }
    );
  }

  // Make the newly joined child the active one so the dashboard switches to
  // it immediately. Non-fatal: the guardian link is correct either way.
  const { error: activeError } = await supabase
    .from("users")
    .update({ active_child_id: childId })
    .eq("id", user.id);

  if (activeError) {
    console.error("Failed to set active_child_id:", activeError.message);
  }

  return NextResponse.json({ ok: true });
}
