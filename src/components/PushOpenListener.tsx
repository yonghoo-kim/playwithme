"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  OPEN_URL_MESSAGE,
  PUSH_OPEN_CACHE,
  PUSH_OPEN_KEY,
  parsePendingOpen,
  sameOriginPath,
} from "@/lib/firebase/pushOpen";

// Re-checks after the page becomes visible: on iOS the app can come to the
// front before the worker's notificationclick has stored the URL.
const PENDING_CHECK_DELAYS_MS = [0, 500, 1500];
const FRESH_LOAD_MS = 5000;

async function readPending() {
  if (typeof caches === "undefined") return null;
  try {
    const cache = await caches.open(PUSH_OPEN_CACHE);
    const res = await cache.match(PUSH_OPEN_KEY);
    if (!res) return null;
    const pending = parsePendingOpen(
      await res.json().catch(() => null),
      window.location.origin,
      Date.now()
    );
    // Stale or malformed: drop it so it can never route a later app open.
    if (!pending) await cache.delete(PUSH_OPEN_KEY);
    return pending;
  } catch {
    return null;
  }
}

async function clearPending(id: string) {
  if (typeof caches === "undefined") return;
  try {
    const cache = await caches.open(PUSH_OPEN_CACHE);
    const res = await cache.match(PUSH_OPEN_KEY);
    const stored = res ? await res.json().catch(() => null) : null;
    if (!stored || stored.id === id) await cache.delete(PUSH_OPEN_KEY);
  } catch {
    return;
  }
}

/**
 * Renders nothing. Routes the app to a tapped notification's screen.
 *
 * The FCM service worker can't navigate pages it doesn't control, so it
 * hands the URL over two ways (see public/firebase-messaging-sw.js):
 * - a postMessage to an open window (answered on the MessageChannel so the
 *   worker doesn't also open a new window) — the fast path, Android;
 * - an entry in Cache Storage, read here on mount and whenever the page comes
 *   back on screen — iOS, where the message can arrive late or before this
 *   listener exists (cold launch from the notification).
 * Each tap carries an id so the two paths never route twice.
 */
export default function PushOpenListener() {
  const router = useRouter();

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    const container = navigator.serviceWorker;
    const handled = new Set<string>();
    const timers = new Set<ReturnType<typeof setTimeout>>();

    function open(id: string, path: string) {
      if (handled.has(id)) return;
      handled.add(id);
      void clearPending(id);
      if (path === `${window.location.pathname}${window.location.search}`) {
        // Already on that screen: re-render it with what was missed — unless
        // the page was just loaded there (openWindow from the tap).
        if (performance.now() > FRESH_LOAD_MS) router.refresh();
      } else {
        router.push(path);
      }
    }

    function onMessage(event: MessageEvent) {
      const data = event.data as
        | { type?: unknown; url?: unknown; id?: unknown }
        | null;
      if (!data || data.type !== OPEN_URL_MESSAGE) return;
      event.ports[0]?.postMessage("ok");
      const path = sameOriginPath(data.url, window.location.origin);
      if (!path) return;
      // An older worker sends no id: treat each message as its own tap.
      open(
        typeof data.id === "string" && data.id ? data.id : `msg-${Date.now()}`,
        path
      );
    }

    async function checkPending() {
      const pending = await readPending();
      if (pending) open(pending.id, pending.path);
    }

    function scheduleChecks() {
      if (document.visibilityState !== "visible") return;
      for (const delay of PENDING_CHECK_DELAYS_MS) {
        const timer = setTimeout(() => {
          timers.delete(timer);
          void checkPending();
        }, delay);
        timers.add(timer);
      }
    }

    container.addEventListener("message", onMessage);
    container.startMessages?.();
    document.addEventListener("visibilitychange", scheduleChecks);
    window.addEventListener("pageshow", scheduleChecks);
    window.addEventListener("focus", scheduleChecks);
    scheduleChecks();

    return () => {
      container.removeEventListener("message", onMessage);
      document.removeEventListener("visibilitychange", scheduleChecks);
      window.removeEventListener("pageshow", scheduleChecks);
      window.removeEventListener("focus", scheduleChecks);
      timers.forEach(clearTimeout);
    };
  }, [router]);

  return null;
}
