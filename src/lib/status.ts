import type { CurrentStatus } from "@/types/db";

// One status row per child, shared with every group the child is in — so
// there is no group in the row.
export function buildStatusUpsertRow(
  childId: string,
  placeId: string | null
): CurrentStatus {
  return {
    child_id: childId,
    place_id: placeId,
    updated_at: new Date().toISOString(),
  };
}
