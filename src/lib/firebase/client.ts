import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

function getFirebaseMessaging(): Messaging {
  return getMessaging(getFirebaseApp());
}

const FCM_TOKEN_STORAGE_KEY = "playwithme_fcm_token";

/**
 * Stores this device's FCM token in localStorage so later requests (e.g.
 * status updates) can identify "this browser/device" and have the server
 * exclude just its one token from push recipients, instead of excluding a
 * whole user/account. Degrades silently (no-op) when storage is unavailable
 * (private browsing, blocked storage, non-browser environment, etc).
 */
export function storeFcmToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
  } catch {
    return;
  }
}

/**
 * Reads back this device's previously stored FCM token, if any. Returns
 * `null` whenever it's unavailable — unsupported/non-browser environment,
 * blocked storage, or nothing stored yet — so callers can degrade
 * gracefully instead of crashing.
 */
export function getStoredFcmToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(FCM_TOKEN_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

/**
 * Requests notification permission, registers the FCM background service
 * worker at its own scope (kept separate from next-pwa's root-scope sw.js
 * so the two workers don't fight over control), and retrieves an FCM token.
 *
 * Returns `null` whenever notifications can't be enabled — unsupported
 * browser/environment, permission denied, or any error along the way —
 * so callers can degrade gracefully instead of crashing.
 */
export async function requestNotificationPermissionAndToken(): Promise<
  string | null
> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("Notification" in window)
  ) {
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return null;
    }

    const serviceWorkerRegistration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
      { scope: "/firebase-cloud-messaging-push-scope" }
    );

    const token = await getToken(getFirebaseMessaging(), {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration,
    });

    return token || null;
  } catch {
    return null;
  }
}
