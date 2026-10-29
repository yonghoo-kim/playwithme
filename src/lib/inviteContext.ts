import { createServiceClient } from "@/lib/supabase/server";
import { hasBatchim } from "@/lib/push";

export interface InviteContext {
  code: string;
  groupName: string;
  /** e.g. "지훈이네" / "민호네" — null when no verified inviter child. */
  inviterLabel: string | null;
}

/**
 * Resolves an invite code (and optional `from` child id from the invite
 * link) into what the login/signup banner shows. Server-only: uses the
 * service client so logged-out visitors can see the group name.
 *
 * Returns null for an unknown code. `fromChildId` comes straight from the
 * URL, so it's only used when that child really is in the invited group
 * (`child_groups`) — otherwise the banner falls back to the no-inviter copy.
 */
export async function getInviteContext(
  code: string,
  fromChildId?: string | null
): Promise<InviteContext | null> {
  if (!code) return null;

  const supabase = createServiceClient();

  const { data: group } = await supabase
    .from("groups")
    .select("id, name")
    .eq("invite_code", code)
    .maybeSingle();

  if (!group) return null;

  let inviterLabel: string | null = null;
  if (fromChildId) {
    // A malformed id (not a uuid) makes these queries error; treat that the
    // same as "no such child in this group".
    const { data: membership } = await supabase
      .from("child_groups")
      .select("child_id")
      .eq("child_id", fromChildId)
      .eq("group_id", group.id)
      .maybeSingle();

    if (membership) {
      const { data: child } = await supabase
        .from("children")
        .select("name")
        .eq("id", fromChildId)
        .maybeSingle();

      const name = (child?.name as string | undefined)?.trim();
      if (name) {
        inviterLabel = hasBatchim(name) ? `${name}이네` : `${name}네`;
      }
    }
  }

  return { code, groupName: group.name as string, inviterLabel };
}
