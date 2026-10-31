import type { CurrentStatus } from "@/types/db";
import { withDirectionParticle } from "./korean";

// One status row per child, shared with every group the child is in — so
// there is no group in the row. `going` is always written so a later
// arrival clears an earlier "가는 중".
export function buildStatusUpsertRow(
  childId: string,
  placeId: string | null,
  going = false
): CurrentStatus {
  return {
    child_id: childId,
    place_id: placeId,
    going,
    updated_at: new Date().toISOString(),
  };
}

/**
 * True when posting (placeId, going) changes nothing: same place and same
 * going flag. No previous row means home and arrived. Rows from before
 * migration 0012 have no `going` — treated as false.
 */
export function isRepeatStatus(
  previous: { place_id?: string | null; going?: boolean | null } | null,
  placeId: string | null,
  going: boolean
): boolean {
  const previousPlaceId = previous?.place_id ?? null;
  const previousGoing = previous?.going === true;
  return previousPlaceId === placeId && previousGoing === going;
}

/** "놀이터로 가는 중", "집으로 가는 중" (no place = home). */
export function goingLabel(placeName: string | null): string {
  return `${withDirectionParticle(placeName ?? "집")} 가는 중`;
}

/** After this long at the same (non-home) place, ask "아직도 ○○에 있나요?". */
export const STALE_STATUS_MS = 5 * 60 * 60 * 1000;

/**
 * Home is the status with no place (`place_id` null — what "🏠 집으로"
 * posts). A family place literally named "집" counts as home too.
 */
export function isHomeStatus(
  placeId: string | null,
  placeName?: string | null
): boolean {
  return placeId === null || placeName?.trim() === "집";
}

/**
 * True when the child is somewhere other than home and the status hasn't
 * been updated for `STALE_STATUS_MS` or more. An unknown or unparsable
 * `updatedAt` is never stale (nothing to compare against). A "가는 중"
 * status is never stale either — we don't nag while the child is on the way.
 */
export function isStatusStale(
  placeId: string | null,
  placeName: string | null | undefined,
  updatedAt: string | null,
  now: number,
  going = false
): boolean {
  if (going || isHomeStatus(placeId, placeName) || !updatedAt) return false;
  const updatedMs = new Date(updatedAt).getTime();
  if (!Number.isFinite(updatedMs)) return false;
  return now - updatedMs >= STALE_STATUS_MS;
}
