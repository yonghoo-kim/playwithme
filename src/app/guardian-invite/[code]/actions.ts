"use server";

import { redirect } from "next/navigation";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import {
  guardianInviteLoginPath,
  guardianInvitePath,
  isGuardianOf,
  lookupGuardianInvite,
} from "./lookup";

// Takes only the code and re-validates everything server-side, so a stale
// page or a tampered action argument can't attach the caller to any child
// other than the one this unused, unexpired code was issued for.
export async function acceptGuardianInvite(code: string) {
  const authClient = createAuthClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect(guardianInviteLoginPath(code));
  }

  const supabase = createServiceClient();
  const invite = await lookupGuardianInvite(supabase, code);

  // Not acceptable any more: the page re-reads the code and explains why.
  if (invite.status !== "ok") {
    redirect(guardianInvitePath(code));
  }

  // Already a guardian: no-op, and leave the link unused.
  if (await isGuardianOf(supabase, user.id, invite.childId)) {
    redirect("/dashboard");
  }

  // Claim the code first. The `used_at is null` + not-expired conditions
  // make this atomic: of two simultaneous accepts only one updates a row.
  const now = new Date().toISOString();
  const { data: claimed, error: claimError } = await supabase
    .from("child_guardian_invites")
    .update({ used_at: now, used_by: user.id })
    .eq("code", code)
    .eq("child_id", invite.childId)
    .is("used_at", null)
    .gt("expires_at", now)
    .select("code");

  if (claimError) {
    throw new Error(claimError.message);
  }

  if (!claimed || claimed.length === 0) {
    // Someone else won the race (or it just expired): the page now shows
    // "이미 사용된 링크예요" / expired, and no guardian is added.
    redirect(guardianInvitePath(code));
  }

  const { error: guardianError } = await supabase
    .from("child_guardians")
    .insert({ child_id: invite.childId, user_id: user.id });

  // 23505 = already a guardian (e.g. a concurrent request); that's fine.
  if (guardianError && guardianError.code !== "23505") {
    // Release the claim so the link isn't burned by a failed write.
    await supabase
      .from("child_guardian_invites")
      .update({ used_at: null, used_by: null })
      .eq("code", code)
      .eq("used_by", user.id);
    throw new Error(guardianError.message);
  }

  const { error: activeError } = await supabase
    .from("users")
    .update({ active_child_id: invite.childId })
    .eq("id", user.id);

  if (activeError) {
    // The guardian link is already in place; the dashboard falls back to
    // another child, so this is not worth failing the accept over.
    console.error("guardian invite: failed to set active child", activeError);
  }

  redirect("/dashboard");
}

// Declining intentionally writes nothing, so the link stays usable.
export async function declineGuardianInvite() {
  redirect("/");
}
