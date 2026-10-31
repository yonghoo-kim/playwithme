// Background service worker for Firebase Cloud Messaging.
//
// This is a plain (non-bundled) script — Next.js does NOT inject
// `NEXT_PUBLIC_FIREBASE_*` env vars into it, so the public client config
// values below are hardcoded (safe: these are public client config, not
// secrets). Registered at its own scope
// ('/firebase-cloud-messaging-push-scope') by
// requestNotificationPermissionAndToken() in src/lib/firebase/client.ts, so
// it doesn't collide with next-pwa's root-scope sw.js.
//
importScripts(
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyChQ3GfTmIuWSoOIyBy94RyxUhUCiUNRro",
  authDomain: "playwiteme.firebaseapp.com",
  projectId: "playwiteme",
  storageBucket: "playwiteme.firebasestorage.app",
  messagingSenderId: "863766032627",
  appId: "1:863766032627:web:bd1babf6270f4707058786",
});

const messaging = firebase.messaging();

// Take over immediately when a new version of this worker is fetched, so a
// phone never keeps showing notifications through an outdated handler.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// The server sends data-only messages, so this handler is the ONLY place a
// notification is shown (a `notification` payload would also be auto-shown
// by the FCM SDK — that was the duplicate "P"-icon notification).
// Return the showNotification promise: the SDK keeps the push event alive
// until it settles. Without it Chrome sees a push with no notification and
// adds its own "이 사이트는 백그라운드에서 업데이트되었습니다".
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = data.title || payload.notification?.title || "나랑 놀자";

  return self.registration.showNotification(title, {
    body: data.body || payload.notification?.body || "",
    icon: "/icons/icon-192.png",
    // Android status bar uses only the alpha channel: a white-on-transparent
    // silhouette, otherwise it renders as a plain white square.
    badge: "/icons/badge-96.png",
    // Same child -> replace the previous notification instead of stacking.
    tag: data.tag || undefined,
    renotify: !!data.tag,
    data: { url: data.url || "/dashboard" },
  });
});

// Opening a notification. This worker's scope is the FCM push scope, so it
// never *controls* the app's pages (next-pwa's root sw.js does) — and
// WindowClient.navigate() rejects for a window the worker doesn't control.
// The old handler called navigate() anyway: it silently failed and only
// focus() ran, so an already-open app came to the front showing whatever it
// had before (e.g. a chat with messages missed while in the background).
// Instead, focus the window and ask the page to route itself
// (src/components/PushOpenListener.tsx answers on the MessageChannel). If no
// page answers, open the URL in a new window.
const OPEN_URL_MESSAGE = "narangnol:open-url";
const OPEN_ACK_TIMEOUT_MS = 1500;

function askPageToOpen(client, url) {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve(false), OPEN_ACK_TIMEOUT_MS);
    channel.port1.onmessage = () => {
      clearTimeout(timer);
      resolve(true);
    };
    try {
      client.postMessage({ type: OPEN_URL_MESSAGE, url }, [channel.port2]);
    } catch (err) {
      clearTimeout(timer);
      resolve(false);
    }
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(
    event.notification.data?.url || "/dashboard",
    self.location.origin
  ).href;

  event.waitUntil(
    (async () => {
      const windows = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Prefer a window already on that screen, then any app window.
      const existing =
        windows.find((w) => w.url === target && "focus" in w) ||
        windows.find((w) => "focus" in w);
      if (!existing) {
        await clients.openWindow(target);
        return;
      }
      const focused = (await existing.focus().catch(() => null)) || existing;
      const handled = await askPageToOpen(focused, target);
      if (!handled) {
        await clients.openWindow(target).catch(() => undefined);
      }
    })()
  );
});
