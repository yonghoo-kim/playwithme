import type { SupabaseClient } from "@supabase/supabase-js";
import type { Place } from "@/types/db";

// Child-first access helpers. Every function takes the Supabase client to
// use (normally the service client — callers have already authenticated the
// user) so this module stays importable from tests and Server Components
// alike.

/** Ids of every child the user is a guardian of. */
export async function getGuardedChildIds(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("child_guardians")
    .select("child_id")
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => row.child_id as string);
}

/** True when the user is a guardian of the child. */
export async function assertGuardian(
  supabase: SupabaseClient,
  userId: string,
  childId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("child_guardians")
    .select("user_id")
    .eq("child_id", childId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

/** The child's family places: those created by any of its guardians. */
export async function familyPlaces(
  supabase: SupabaseClient,
  childId: string
): Promise<Place[]> {
  const { data: guardians, error: guardianError } = await supabase
    .from("child_guardians")
    .select("user_id")
    .eq("child_id", childId);

  if (guardianError) {
    throw new Error(guardianError.message);
  }

  const guardianIds = (guardians ?? []).map((row) => row.user_id as string);
  if (guardianIds.length === 0) return [];

  const { data: places, error: placesError } = await supabase
    .from("places")
    .select("id, created_by, name, icon_name, created_at")
    .in("created_by", guardianIds)
    .order("created_at", { ascending: true });

  if (placesError) {
    throw new Error(placesError.message);
  }
  return (places ?? []) as Place[];
}

/**
 * Who hears about `childId`'s status change: the guardians of every child
 * that shares any group with it, plus the child's own guardians. Distinct —
 * a user connected through several groups or several children appears once
 * (so each of their devices gets exactly one notification).
 *
 * `childGroupRows` are `child_groups` rows covering at least every group
 * `childId` is in; rows for other groups are ignored. `guardianRows` are
 * `child_guardians` rows; rows for unconnected children are ignored.
 */
export function statusRecipientUserIds(
  childId: string,
  childGroupRows: { child_id: string; group_id: string }[],
  guardianRows: { child_id: string; user_id: string }[]
): string[] {
  const groupIds = new Set(
    childGroupRows
      .filter((row) => row.child_id === childId)
      .map((row) => row.group_id)
  );

  const connectedChildIds = new Set<string>([childId]);
  for (const row of childGroupRows) {
    if (groupIds.has(row.group_id)) {
      connectedChildIds.add(row.child_id);
    }
  }

  const userIds = new Set<string>();
  for (const row of guardianRows) {
    if (connectedChildIds.has(row.child_id)) {
      userIds.add(row.user_id);
    }
  }
  return Array.from(userIds);
}
