import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";

/**
 * 설정 > 알림 > 밤 시간 알림 끄기: `{ quietHours: boolean }` — on = no
 * pushes 22:00–07:00 KST (users.quiet_hours, migration 0013).
 */
export async function POST(request: NextRequest) {
  let body: { quietHours?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }
  if (typeof body.quietHours !== "boolean") {
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
  const { error } = await supabase
    .from("users")
    .update({ quiet_hours: body.quietHours })
    .eq("id", user.id);
  if (error) {
    console.error("quiet_hours update failed:", error.message);
    return NextResponse.json(
      { error: "설정을 바꾸지 못했어요. 다시 시도해주세요." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, quietHours: body.quietHours });
}
