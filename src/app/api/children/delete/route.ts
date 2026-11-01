import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { assertGuardian } from "@/lib/childAccess";
import { removeChildForGuardian } from "@/lib/removeChild";

/**
 * "아이 지우기": takes one of the caller's children off their list.
 * Body: `{ childId: string }`.
 *
 * The work is in removeChildForGuardian (src/lib/removeChild.ts, shared with
 * 회원탈퇴): my guardianship row always goes; the child itself is deleted
 * only when nobody else guards it, along with groups it leaves empty.
 *
 * Returns `{ ok: true, childDeleted: boolean }`.
 */
export async function POST(request: NextRequest) {
  let body: { childId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  const childId = typeof body.childId === "string" ? body.childId : "";
  if (!childId) {
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
      { error: "내 아이만 지울 수 있어요." },
      { status: 403 }
    );
  }

  const result = await removeChildForGuardian(supabase, user.id, childId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    childDeleted: result.childDeleted,
  });
}
