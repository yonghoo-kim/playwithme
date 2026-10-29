import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import type { Place } from "@/types/db";

/**
 * Creates a new family place on the fly (dashboard's "+" button), owned by
 * the caller and so shared with every child they guard (and those
 * children's other guardians). Body: `{ name: string; iconName: string }`.
 * Returns `{ place: Place }` so the caller can immediately select it.
 */
export async function POST(request: NextRequest) {
  let body: { name?: unknown; iconName?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const iconName =
    typeof body.iconName === "string" ? body.iconName.trim() : "";

  if (!name || !iconName) {
    return NextResponse.json(
      { error: "장소 이름과 아이콘을 입력해주세요." },
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

  const { data: place, error } = await supabase
    .from("places")
    .insert({ created_by: user.id, name, icon_name: iconName })
    .select("id, created_by, name, icon_name, created_at")
    .single();

  if (error || !place) {
    return NextResponse.json(
      { error: error?.message ?? "장소 생성에 실패했어요." },
      { status: 500 }
    );
  }

  return NextResponse.json({ place: place as Place });
}
