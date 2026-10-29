"use server";

import { redirect } from "next/navigation";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";

// Takes the invite code (not a raw group id) and re-resolves the group on
// the server, so the only way to join a group is to hold its invite code —
// a tampered action argument can't be used to join an arbitrary group.
export async function confirmJoin(code: string) {
  const authClient = createAuthClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect(`/signup?invite=${encodeURIComponent(code)}`);
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

  const { error: joinError } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: user.id });

  // Ignore "already a member" duplicate-key errors; any other error is
  // a real failure worth surfacing.
  if (joinError && joinError.code !== "23505") {
    throw new Error(joinError.message);
  }

  // A brand-new member guards no child in this group yet, so send them to
  // Settings (where they can add or join one) rather than the dashboard.
  redirect("/settings");
}

// Declining intentionally writes nothing, so revisiting the same invite
// link later asks again instead of treating the user as having declined.
export async function declineJoin() {
  redirect("/");
}
