import type { CurrentStatus } from "@/types/db";

export function buildStatusUpsertRow(
  userId: string,
  groupId: string,
  placeId: string | null
): CurrentStatus {
  return {
    user_id: userId,
    group_id: groupId,
    place_id: placeId,
    updated_at: new Date().toISOString(),
  };
}
