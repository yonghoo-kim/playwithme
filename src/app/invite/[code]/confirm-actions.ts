"use server";

import { redirect } from "next/navigation";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { inviteQuery } from "@/lib/inviteQuery";

type JoinError = "pick" | "name";

function backToInvite(code: string, from: string | null, error: JoinError): never {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  params.set("error", error);
  redirect(`/invite/${encodeURIComponent(code)}?${params.toString()}`);
}

// Takes the invite code (not a raw group id) and re-resolves the group on
// the server, so the only way to join a group is to hold its invite code —
// a tampered action argument can't be used to join an arbitrary group.
// Submitted child ids are filtered down to children the caller actually
// guards, so a tampered form can't put someone else's child in a group.
export async function confirmJoin(
  code: string,
  from: string | null,
  formData: FormData
) {
  const authClient = createAuthClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect(`/login${inviteQuery(code, from)}`);
  }

  const supabase = createServiceClient();

  const { data: group } = await supabase
    .from("groups")
    .select("id")
    .eq("invite_code", code)
    .maybeSingle();

  if (!group) {
    redirect(`/invite/${encodeURIComponent(code)}`);
  }

  const { data: guardianRows, error: guardianError } = await supabase
    .from("child_guardians")
    .select("child_id")
    .eq("user_id", user.id);

  if (guardianError) {
    throw new Error(guardianError.message);
  }

  const guardedIds = new Set(
    (guardianRows ?? []).map((row) => row.child_id as string)
  );

  let childIds: string[];

  if (guardedIds.size === 0) {
    // No children yet: the form asked for a name — create the child (with
    // the caller as its guardian) and join that one.
    const rawName = formData.get("childName");
    const name = typeof rawName === "string" ? rawName.trim() : "";
    if (!name) {
      backToInvite(code, from, "name");
    }

    const { data: child, error: childError } = await supabase
      .from("children")
      .insert({ name })
      .select("id")
      .single();

    if (childError || !child) {
      throw new Error(childError?.message ?? "아이 추가에 실패했어요.");
    }

    const { error: linkError } = await supabase
      .from("child_guardians")
      .insert({ child_id: child.id, user_id: user.id });

    if (linkError) {
      throw new Error(linkError.message);
    }

    childIds = [child.id as string];
  } else {
    const submitted = formData
      .getAll("childId")
      .filter((v): v is string => typeof v === "string");
    childIds = Array.from(new Set(submitted)).filter((id) =>
      guardedIds.has(id)
    );

    if (childIds.length === 0) {
      backToInvite(code, from, "pick");
    }
  }

  const { error: joinError } = await supabase
    .from("child_groups")
    .insert(childIds.map((childId) => ({ child_id: childId, group_id: group.id })));

  // A duplicate-key error means a child was already in the group (e.g. a
  // double submit); insert the rest one by one so none are lost.
  if (joinError) {
    if (joinError.code !== "23505") {
      throw new Error(joinError.message);
    }
    for (const childId of childIds) {
      const { error } = await supabase
        .from("child_groups")
        .insert({ child_id: childId, group_id: group.id });
      if (error && error.code !== "23505") {
        throw new Error(error.message);
      }
    }
  }

  // Non-fatal: the join itself succeeded either way.
  const { error: activeError } = await supabase
    .from("users")
    .update({ active_child_id: childIds[0] })
    .eq("id", user.id);

  if (activeError) {
    console.error("Failed to set active_child_id:", activeError.message);
  }

  redirect(`/groups/${group.id}`);
}

// Declining intentionally writes nothing, so revisiting the same invite
// link later asks again instead of treating the user as having declined.
export async function declineJoin() {
  redirect("/");
}
