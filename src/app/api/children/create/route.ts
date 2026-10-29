import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import type { Child } from "@/types/db";

/**
 * Creates a new child (in no group) and makes the caller its first guardian
 * and the active child. Body: `{ name: string }`. Returns `{ child: Child }`.
 */
export async function POST(request: NextRequest) {
  let body: { name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json(
      { error: "아이 이름을 입력해주세요." },
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

  const { data: child, error: childError } = await supabase
    .from("children")
    .insert({ name })
    .select("id, name, created_at")
    .single();

  if (childError || !child) {
    console.error("Failed to create child:", childError?.message);
    return NextResponse.json(
      { error: "아이 추가에 실패했어요." },
      { status: 500 }
    );
  }

  const { error: guardianError } = await supabase
    .from("child_guardians")
    .insert({ child_id: child.id, user_id: user.id });

  if (guardianError) {
    // Don't leave an orphan child nobody guards.
    await supabase.from("children").delete().eq("id", child.id);
    console.error("Failed to add child guardian:", guardianError.message);
    return NextResponse.json(
      { error: "아이 추가에 실패했어요." },
      { status: 500 }
    );
  }

  // Make the newly added child the active one so the dashboard switches to
  // it immediately. Non-fatal: the child was created correctly either way.
  const { error: activeError } = await supabase
    .from("users")
    .update({ active_child_id: child.id })
    .eq("id", user.id);

  if (activeError) {
    console.error("Failed to set active_child_id:", activeError.message);
  }

  return NextResponse.json({ child: child as Child });
}
