import { getStoredFcmToken } from "@/lib/firebase/client";

const FALLBACK_ERROR = "상태를 바꾸지 못했어요. 다시 시도해주세요.";

/**
 * Client-side POST to `/api/status/update` for one of MY children.
 * `going: true` = on the way to the place (or home when `placeId` is null).
 * Resolves to `null` on success, or a Korean error message to show.
 */
export async function postStatus(
  childId: string,
  placeId: string | null,
  going: boolean
): Promise<string | null> {
  try {
    const res = await fetch("/api/status/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        childId,
        placeId,
        going,
        deviceToken: getStoredFcmToken(),
      }),
    });
    if (res.ok) return null;
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return data.error ?? FALLBACK_ERROR;
  } catch {
    return FALLBACK_ERROR;
  }
}
