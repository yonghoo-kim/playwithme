import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  const token = body.token?.trim();
  if (!token) {
    return NextResponse.json(
      { error: "토큰이 필요해요." },
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

  const { error } = await supabase
    .from("fcm_tokens")
    .upsert({ token, user_id: user.id }, { onConflict: "token" });

  if (error) {
    return NextResponse.json(
      { error: "토큰 등록에 실패했어요." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
