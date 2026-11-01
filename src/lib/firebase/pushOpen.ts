/**
 * "Open this screen" hand-off from a tapped notification to the app page.
 *
 * public/firebase-messaging-sw.js (plain JS, can't import this) writes the
 * tapped notification's URL to Cache Storage before doing anything else, and
 * src/components/PushOpenListener.tsx consumes it when the page mounts or
 * comes back on screen. That covers iOS, where the worker's postMessage can
 * reach the page late (app resuming) or before React listens (cold launch),
 * and clients.openWindow() is refused once WebKit's 2 s notification-click
 * gesture window has passed. Keep the names below in sync with the worker.
 */
export const PUSH_OPEN_CACHE = "narangnol-push-open";
export const PUSH_OPEN_KEY = "/__narangnol/push-open";
export const OPEN_URL_MESSAGE = "narangnol:open-url";

/** A tap older than this is ignored, so it can't hijack a later app open. */
export const PUSH_OPEN_MAX_AGE_MS = 60_000;

export interface PendingOpen {
  id: string;
  /** Same-origin path + query, e.g. `/chat/direct/f1?child=m1`. */
  path: string;
}

/**
 * Same-origin path + query of `url` (absolute or relative), or null when it
 * points elsewhere or doesn't parse.
 */
export function sameOriginPath(url: unknown, origin: string): string | null {
  if (typeof url !== "string" || !url) return null;
  try {
    const parsed = new URL(url, origin);
    if (parsed.origin !== origin) return null;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

/** Validates a stored hand-off entry; null when malformed, foreign or stale. */
export function parsePendingOpen(
  value: unknown,
  origin: string,
  now: number
): PendingOpen | null {
  if (!value || typeof value !== "object") return null;
  const { id, url, at } = value as { id?: unknown; url?: unknown; at?: unknown };
  if (typeof id !== "string" || !id || typeof at !== "number") return null;
  if (now - at > PUSH_OPEN_MAX_AGE_MS || at - now > PUSH_OPEN_MAX_AGE_MS) {
    return null;
  }
  const path = sameOriginPath(url, origin);
  return path ? { id, path } : null;
}
