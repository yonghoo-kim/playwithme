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
// So the page routes itself (src/components/PushOpenListener.tsx), and the
// URL reaches it two ways:
// 1. Cache Storage entry {id, url, at}, written first. The page reads it on
//    mount and whenever it comes back on screen. This is the iOS path: there
//    the postMessage below can arrive late (app resuming) or before React
//    listens (cold launch from the tap), and WebKit only allows
//    clients.openWindow()/focus() within 2 s of the click
//    (ServiceWorkerGlobalScope::userGestureLifetime) — the old 1.5 s ack wait
//    plus awaited focus() pushed openWindow past that, it was rejected and
//    the rejection swallowed, so the app just came to the front unchanged.
// 2. postMessage to an open window, acknowledged on a MessageChannel — the
//    fast path (Android). The same id is sent so the page never routes twice.
// If nobody takes it quickly, openWindow() — still inside the gesture window.
// Names must match src/lib/firebase/pushOpen.ts.
const OPEN_URL_MESSAGE = "narangnol:open-url";
const PUSH_OPEN_CACHE = "narangnol-push-open";
const PUSH_OPEN_KEY = "/__narangnol/push-open";
// Keeps openWindow() well inside WebKit's 2 s user-gesture window.
const OPEN_ACK_TIMEOUT_MS = 1000;

async function savePendingOpen(entry) {
  const cache = await caches.open(PUSH_OPEN_CACHE);
  await cache.put(
    PUSH_OPEN_KEY,
    new Response(JSON.stringify(entry), {
      headers: { "Content-Type": "application/json" },
    })
  );
}

// True when the stored entry is no longer this tap's (the page consumed it).
async function pendingOpenTaken(id) {
  try {
    const cache = await caches.open(PUSH_OPEN_CACHE);
    const res = await cache.match(PUSH_OPEN_KEY);
    if (!res) return true;
    const stored = await res.json().catch(() => null);
    return !stored || stored.id !== id;
  } catch (err) {
    return false;
  }
}

async function clearPendingOpen(id) {
  try {
    if (await pendingOpenTaken(id)) return;
    const cache = await caches.open(PUSH_OPEN_CACHE);
    await cache.delete(PUSH_OPEN_KEY);
  } catch (err) {
    // Expires on its own (PUSH_OPEN_MAX_AGE_MS in pushOpen.ts).
  }
}

function askPageToOpen(client, url, id) {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve(false), OPEN_ACK_TIMEOUT_MS);
    channel.port1.onmessage = () => {
      clearTimeout(timer);
      resolve(true);
    };
    try {
      client.postMessage({ type: OPEN_URL_MESSAGE, url, id }, [channel.port2]);
    } catch (err) {
      clearTimeout(timer);
      resolve(false);
    }
  });
}

async function openInNewWindow(url, id) {
  try {
    const opened = await clients.openWindow(url);
    // Loaded at the target already; don't route it again later.
    if (opened) await clearPendingOpen(id);
  } catch (err) {
    // Refused (e.g. iOS gesture expired): the stored entry still routes the
    // page when it comes on screen.
  }
}

function notificationTarget(notification) {
  const fallback = new URL("/dashboard", self.location.origin);
  try {
    const url = new URL(notification.data?.url || "/dashboard", self.location.origin);
    return url.origin === self.location.origin ? url.href : fallback.href;
  } catch (err) {
    return fallback.href;
  }
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = notificationTarget(event.notification);
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  event.waitUntil(
    (async () => {
      // No awaits before these: the gesture window starts at the click.
      const [windows] = await Promise.all([
        clients.matchAll({ type: "window", includeUncontrolled: true }),
        savePendingOpen({ id, url: target, at: Date.now() }).catch(
          () => undefined
        ),
      ]);
      // Prefer a window already on that screen, then any app window.
      const existing =
        windows.find((w) => w.url === target && "focus" in w) ||
        windows.find((w) => "focus" in w);
      if (!existing) {
        await openInNewWindow(target, id);
        return;
      }
      // Don't wait on focus() (it can be slow on iOS) before messaging.
      const focusing = existing.focus().catch(() => null);
      const handled = await askPageToOpen(existing, target, id);
      if (handled) {
        await clearPendingOpen(id);
      } else if (!(await pendingOpenTaken(id))) {
        await openInNewWindow(target, id);
      }
      await focusing;
    })()
  );
});
