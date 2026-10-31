"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Must match OPEN_URL_MESSAGE in public/firebase-messaging-sw.js. */
const OPEN_URL_MESSAGE = "narangnol:open-url";

/**
 * Renders nothing. When a notification is tapped while the app is already
 * open, the FCM service worker focuses this window and posts the
 * notification's URL here (it cannot navigate a page it doesn't control).
 * Route there — or, if already on that screen, re-render it from the server —
 * and acknowledge so the worker doesn't open a second window.
 */
export default function PushOpenListener() {
  const router = useRouter();

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    const container = navigator.serviceWorker;

    function onMessage(event: MessageEvent) {
      const data = event.data as { type?: unknown; url?: unknown } | null;
      if (!data || data.type !== OPEN_URL_MESSAGE || typeof data.url !== "string") {
        return;
      }
      event.ports[0]?.postMessage("ok");

      let url: URL;
      try {
        url = new URL(data.url, window.location.origin);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      const path = `${url.pathname}${url.search}`;
      if (path === `${window.location.pathname}${window.location.search}`) {
        router.refresh();
      } else {
        router.push(path);
      }
    }

    container.addEventListener("message", onMessage);
    container.startMessages?.();
    return () => container.removeEventListener("message", onMessage);
  }, [router]);

  return null;
}
