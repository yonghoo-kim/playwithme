import type { SupabaseClient } from "@supabase/supabase-js";
import { hasBatchim } from "@/lib/push";

const CODE_PATTERN = /^[A-Za-z0-9]{16}$/;

export type GuardianInviteLookup =
  | { status: "invalid" }
  | { status: "expired" }
  | { status: "used"; childId: string }
  | {
      status: "ok";
      childId: string;
      childName: string;
      /** e.g. "지훈이네" / "민호네" */
      inviterLabel: string;
    };

/** "지훈" -> "지훈이네", "민호" -> "민호네". */
export function familyLabel(childName: string): string {
  return hasBatchim(childName) ? `${childName}이네` : `${childName}네`;
}

/**
 * Resolves a guardian invite code with the service-role client and decides
 * whether it can still be accepted. Used by both the page (to render) and
 * the accept action (to re-validate before writing), so a stale page can't
 * accept a link that has since expired, been used, or been orphaned.
 */
export async function lookupGuardianInvite(
  supabase: SupabaseClient,
  code: string
): Promise<GuardianInviteLookup> {
  if (!CODE_PATTERN.test(code)) return { status: "invalid" };

  const { data: invite, error } = await supabase
    .from("child_guardian_invites")
    .select("child_id, created_by, expires_at, used_at")
    .eq("code", code)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!invite) return { status: "invalid" };

  const childId = invite.child_id as string;

  if (invite.used_at) return { status: "used", childId };
  if (new Date(invite.expires_at as string).getTime() <= Date.now()) {
    return { status: "expired" };
  }

  // The issuer must still guard the child; a link from someone who has
  // since been removed as a guardian no longer grants anything.
  const { data: issuer, error: issuerError } = await supabase
    .from("child_guardians")
    .select("user_id")
    .eq("child_id", childId)
    .eq("user_id", invite.created_by as string)
    .maybeSingle();

  if (issuerError) throw new Error(issuerError.message);
  if (!issuer) return { status: "invalid" };

  const { data: child, error: childError } = await supabase
    .from("children")
    .select("name")
    .eq("id", childId)
    .maybeSingle();

  if (childError) throw new Error(childError.message);
  if (!child) return { status: "invalid" };

  const childName = child.name as string;
  return {
    status: "ok",
    childId,
    childName,
    inviterLabel: familyLabel(childName),
  };
}

export async function isGuardianOf(
  supabase: SupabaseClient,
  userId: string,
  childId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("child_guardians")
    .select("user_id")
    .eq("child_id", childId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Boolean(data);
}

export function guardianInvitePath(code: string): string {
  return `/guardian-invite/${encodeURIComponent(code)}`;
}

export function guardianInviteLoginPath(code: string): string {
  return `/login?next=${encodeURIComponent(guardianInvitePath(code))}`;
}
