import type { CurrentStatus } from "@/types/db";

export function buildStatusUpsertRow(
  childId: string,
  groupId: string,
  placeId: string | null
): CurrentStatus {
  return {
    child_id: childId,
    group_id: groupId,
    place_id: placeId,
    updated_at: new Date().toISOString(),
  };
}
