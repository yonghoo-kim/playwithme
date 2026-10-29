import { NextRequest, NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";

// 16 alphanumeric chars (~95 bits): unguessable, and clean in a URL.
const generateGuardianInviteCode = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  16
);

const MAX_CODE_ATTEMPTS = 3;

// Absolute origin of the current request, matching buildInviteUrl (honours
// the proxy's forwarded protocol on Vercel).
function requestOrigin(request: NextRequest): string {
  const host = request.headers.get("host");
  if (!host) return request.nextUrl.origin;
  const proto =
    request.headers.get("x-forwarded-proto") ??
    request.nextUrl.protocol.replace(/:$/, "");
  return `${proto}://${host}`;
}

// An existing guardian of a child issues a single-use, 7-day guardian
// invite link for that child. The table is service-role only (RLS on, no
// policies), so the guardian check below is the only gate.
export async function POST(request: NextRequest) {
  let childId: string | undefined;
  try {
    ({ childId } = (await request.json()) as { childId?: string });
  } catch {
    childId = undefined;
  }

  if (!childId || typeof childId !== "string") {
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

  const { data: guardian, error: guardianError } = await supabase
    .from("child_guardians")
    .select("user_id")
    .eq("child_id", childId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (guardianError) {
    return NextResponse.json({ error: guardianError.message }, { status: 500 });
  }

  if (!guardian) {
    return NextResponse.json(
      { error: "이 아이의 보호자만 초대 링크를 만들 수 있어요" },
      { status: 403 }
    );
  }

  // Retry only on the (astronomically unlikely) primary-key collision.
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = generateGuardianInviteCode();
    const { data: invite, error: insertError } = await supabase
      .from("child_guardian_invites")
      .insert({ code, child_id: childId, created_by: user.id })
      .select("code, expires_at")
      .single();

    if (insertError) {
      if (insertError.code === "23505") continue;
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const url = `${requestOrigin(request)}/guardian-invite/${invite.code}`;
    return NextResponse.json({ url, expiresAt: invite.expires_at });
  }

  return NextResponse.json(
    { error: "초대 링크를 만들지 못했어요. 다시 시도해주세요." },
    { status: 500 }
  );
}
