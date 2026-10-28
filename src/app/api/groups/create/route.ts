import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { createGroupForUser } from "@/lib/groups";

export async function POST(request: NextRequest) {
  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  const name = body.name?.trim();
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

  try {
    const group = await createGroupForUser(createServiceClient(), user.id, name);
    return NextResponse.json({ group });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "그룹 생성에 실패했어요." },
      { status: 500 }
    );
  }
}
