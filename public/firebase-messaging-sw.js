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

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || "나랑 놀자";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/icons/icon-192.png",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
