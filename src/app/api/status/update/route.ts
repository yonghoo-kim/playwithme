import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { getAdminMessaging } from "@/lib/firebase/admin";
import { buildStatusUpsertRow } from "@/lib/status";
import { formatPushPayload, sendGroupPush } from "@/lib/push";
import { assertGuardian, statusRecipientGroupIds } from "@/lib/childAccess";

/**
 * Sets a child's one status (shared with every group the child is in) and
 * notifies everyone connected to the child.
 * Body: `{ childId: string; placeId: string | null; deviceToken?: string }`.
 */
export async function POST(request: NextRequest) {
  let body: { childId?: unknown; placeId?: unknown; deviceToken?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청이에요" }, { status: 400 });
  }

  const childId = typeof body.childId === "string" ? body.childId : "";
  const placeId = body.placeId;
  const deviceToken =
    typeof body.deviceToken === "string" ? body.deviceToken : null;

  if (
    !childId ||
    !(placeId === null || (typeof placeId === "string" && placeId !== ""))
  ) {
    return NextResponse.json({ error: "잘못된 요청이에요" }, { status: 400 });
  }

  const supabaseAuth = createAuthClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });
  }

  const supabase = createServiceClient();

  if (!(await assertGuardian(supabase, user.id, childId))) {
    return NextResponse.json(
      { error: "이 아이의 보호자만 상태를 바꿀 수 있어요" },
      { status: 403 }
    );
  }

  const { data: child } = await supabase
    .from("children")
    .select("name")
    .eq("id", childId)
    .maybeSingle();

  if (!child) {
    return NextResponse.json(
      { error: "아이를 찾을 수 없어요" },
      { status: 404 }
    );
  }

  let placeName: string | null = null;
  if (placeId !== null) {
    // Only the child's family places (created by one of its guardians) —
    // never another family's place.
    const { data: place } = await supabase
      .from("places")
      .select("name, created_by")
      .eq("id", placeId)
      .maybeSingle();
    if (
      !place ||
      !place.created_by ||
      !(await assertGuardian(supabase, place.created_by as string, childId))
    ) {
      return NextResponse.json(
        { error: "장소를 찾을 수 없어요" },
        { status: 400 }
      );
    }
    placeName = (place.name as string) ?? "";
  }

  const row = buildStatusUpsertRow(childId, placeId);
  const { error: upsertError } = await supabase
    .from("current_statuses")
    .upsert(row, { onConflict: "child_id" });

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  // Every status change notifies everyone connected to the child — arriving
  // somewhere and going home ("🏠 집으로", placeId null) alike. The status
  // update itself already succeeded above; a push-sending problem is a
  // side-effect failure, so it's isolated in its own try/catch and only
  // logged.
  try {
    const { data: ownGroups } = await supabase
      .from("child_groups")
      .select("child_id, group_id")
      .eq("child_id", childId)
      .order("joined_at", { ascending: true });

    const groupIds = (ownGroups ?? []).map((r) => r.group_id as string);

    const [{ data: groupRows }, { data: groupNameRows }] =
      groupIds.length > 0
        ? await Promise.all([
            supabase
              .from("child_groups")
              .select("child_id, group_id")
              .in("group_id", groupIds),
            supabase.from("groups").select("id, name").in("id", groupIds),
          ])
        : [{ data: [] }, { data: [] }];

    // The child's own rows first, in join order, so titles list its groups
    // in that order.
    const childGroupRows = [
      ...((ownGroups ?? []) as { child_id: string; group_id: string }[]),
      ...((groupRows ?? []) as { child_id: string; group_id: string }[]),
    ];
    const groupNameById = new Map(
      ((groupNameRows ?? []) as { id: string; name: string }[]).map((g) => [
        g.id,
        g.name,
      ])
    );
    const connectedChildIds = Array.from(
      new Set([childId, ...childGroupRows.map((r) => r.child_id)])
    );

    const { data: guardianRows } = await supabase
      .from("child_guardians")
      .select("child_id, user_id")
      .in("child_id", connectedChildIds);

    const groupsByRecipient = statusRecipientGroupIds(
      childId,
      childGroupRows,
      (guardianRows ?? []) as { child_id: string; user_id: string }[]
    );

    if (groupsByRecipient.size > 0) {
      const { data: tokenRows } = await supabase
        .from("fcm_tokens")
        .select("token, user_id")
        .in("user_id", Array.from(groupsByRecipient.keys()));

      // Each recipient's title names the groups they share with the child,
      // so tokens are batched by title — still one notification per device.
      const batches = new Map<string, { names: string[]; tokens: string[] }>();
      const seenTokens = new Set<string>();
      for (const tokenRow of (tokenRows ?? []) as {
        token: string;
        user_id: string;
      }[]) {
        // Skip the sender's own device, and a token registered under two
        // users (send it once).
        if (tokenRow.token === deviceToken || seenTokens.has(tokenRow.token)) {
          continue;
        }
        seenTokens.add(tokenRow.token);
        const names = (groupsByRecipient.get(tokenRow.user_id) ?? [])
          .map((id) => groupNameById.get(id))
          .filter((name): name is string => !!name);
        const key = names.join("\n");
        const batch = batches.get(key) ?? { names, tokens: [] };
        batch.tokens.push(tokenRow.token);
        batches.set(key, batch);
      }

      const failedTokens: string[] = [];
      for (const { names, tokens } of Array.from(batches.values())) {
        const result = await sendGroupPush(
          getAdminMessaging(),
          tokens,
          formatPushPayload(child.name ?? "", placeName, names),
          { tag: "child-" + childId }
        );
        failedTokens.push(...result.failedTokens);
      }

      if (failedTokens.length > 0) {
        await supabase.from("fcm_tokens").delete().in("token", failedTokens);
      }
    }
  } catch (err) {
    console.error("push send failed (status update still succeeded):", err);
  }

  return NextResponse.json({ ok: true });
}
