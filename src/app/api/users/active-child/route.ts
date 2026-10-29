import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  let childId: string | undefined;
  try {
    ({ childId } = (await request.json()) as { childId?: string });
  } catch {
    childId = undefined;
  }

  if (!childId) {
    return NextResponse.json({ error: "childId가 필요해요" }, { status: 400 });
  }

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
      { error: "이 아이의 보호자만 전환할 수 있어요" },
      { status: 403 }
    );
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({ active_child_id: childId })
    .eq("id", user.id);

  if (updateError) {
    console.error("Failed to set active_child_id:", updateError.message);
    return NextResponse.json(
      { error: "전환에 실패했어요. 다시 시도해주세요" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
