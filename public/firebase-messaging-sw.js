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
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = data.title || payload.notification?.title || "나랑 놀자";

  self.registration.showNotification(title, {
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

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => {
        const existing = windows.find((w) => "focus" in w);
        if (existing) {
          existing.navigate(url);
          return existing.focus();
        }
        return clients.openWindow(url);
      })
  );
});
