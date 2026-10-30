import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { getGuardedChildIds } from "@/lib/childAccess";

/**
 * Turns friends' notifications for one family place on or off (a "quiet"
 * place still shows on everyone's screen, it just doesn't push).
 * Body: `{ placeId: string; notify: boolean }`. Only for my family's places
 * (created by a guardian of one of my children).
 */
export async function POST(request: NextRequest) {
  let body: { placeId?: unknown; notify?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  const placeId = typeof body.placeId === "string" ? body.placeId : "";
  if (!placeId || typeof body.notify !== "boolean") {
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

  const [guarded, { data: place }] = await Promise.all([
    getGuardedChildIds(supabase, user.id),
    supabase.from("places").select("created_by").eq("id", placeId).maybeSingle(),
  ]);
  const { data: familyRows } =
    guarded.length > 0
      ? await supabase
          .from("child_guardians")
          .select("user_id")
          .in("child_id", guarded)
      : { data: [] };
  const family = new Set(
    (familyRows ?? []).map((row) => row.user_id as string)
  );
  if (!place || !family.has(place.created_by as string)) {
    return NextResponse.json(
      { error: "우리 가족 장소만 바꿀 수 있어요" },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from("places")
    .update({ notify: body.notify })
    .eq("id", placeId);
  if (error) {
    console.error("place notify update failed:", error.message);
    return NextResponse.json(
      { error: "설정을 저장하지 못했어요. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
