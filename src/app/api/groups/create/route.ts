import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import {
  createGroupForUser,
  DUPLICATE_GROUP_NAME_MESSAGE,
} from "@/lib/groups";
import { getGuardedChildIds } from "@/lib/childAccess";

/**
 * Creates a group with the caller's children in it.
 * Body: `{ name: string; childIds: string[] }` (at least one, every one
 * guarded by the caller). Returns `{ group: Group }`.
 */
export async function POST(request: NextRequest) {
  let body: { name?: unknown; childIds?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json(
      { error: "그룹 이름을 입력해주세요." },
      { status: 400 }
    );
  }

  const childIds = Array.isArray(body.childIds)
    ? Array.from(
        new Set(
          body.childIds.filter(
            (id): id is string => typeof id === "string" && id.length > 0
          )
        )
      )
    : [];
  if (
    childIds.length === 0 ||
    childIds.length !== (body.childIds as unknown[]).length
  ) {
    return NextResponse.json(
      { error: "그룹에 넣을 아이를 선택해주세요." },
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

  try {
    const guarded = new Set(await getGuardedChildIds(supabase, user.id));
    if (!childIds.every((id) => guarded.has(id))) {
      return NextResponse.json(
        { error: "내 아이만 그룹에 넣을 수 있어요" },
        { status: 403 }
      );
    }

    const group = await createGroupForUser(supabase, user.id, name, childIds);
    return NextResponse.json({ group });
  } catch (err) {
    if (err instanceof Error && err.message === DUPLICATE_GROUP_NAME_MESSAGE) {
      return NextResponse.json(
        { error: DUPLICATE_GROUP_NAME_MESSAGE },
        { status: 409 }
      );
    }
    // groups.ts only throws Korean, user-facing messages.
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "그룹을 만들지 못했어요." },
      { status: 500 }
    );
  }
}
