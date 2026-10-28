import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { createUniqueInviteCode } from "@/lib/invite";

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

  const supabase = createServiceClient();

  const inviteCode = await createUniqueInviteCode(async (code) => {
    const { data } = await supabase
      .from("groups")
      .select("id")
      .eq("invite_code", code)
      .maybeSingle();
    return !!data;
  });

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .insert({ name, invite_code: inviteCode })
    .select()
    .single();

  if (groupError || !group) {
    return NextResponse.json(
      { error: "그룹 생성에 실패했어요." },
      { status: 500 }
    );
  }

  const { error: memberError } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: user.id });

  if (memberError) {
    return NextResponse.json(
      { error: "그룹 멤버 등록에 실패했어요." },
      { status: 500 }
    );
  }

  return NextResponse.json({ group });
}
