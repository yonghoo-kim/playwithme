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
    return await currentDeviceToken();
  } catch {
    return null;
  }
}

// register() also makes the browser re-check firebase-messaging-sw.js for
// updates — its scope is never navigated to, so without this an old worker
// could keep running indefinitely.
async function currentDeviceToken(): Promise<string | null> {
  const serviceWorkerRegistration = await navigator.serviceWorker.register(
    "/firebase-messaging-sw.js",
    { scope: "/firebase-cloud-messaging-push-scope", updateViaCache: "none" }
  );
  // Explicitly check for a newer worker on every app open.
  await serviceWorkerRegistration.update().catch(() => undefined);

  const token = await getToken(getFirebaseMessaging(), {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration,
  });

  return token || null;
}

/**
 * Asks for the notification permission (call from a tap — Safari requires a
 * user gesture), then registers this device's token with the server.
 * Resolves true when notifications are on.
 */
export async function enableNotificationsOnThisDevice(): Promise<boolean> {
  const token = await requestNotificationPermissionAndToken();
  if (!token) return false;
  try {
    const res = await fetch("/api/fcm/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) return false;
  } catch {
    return false;
  }
  storeFcmToken(token);
  return true;
}

/**
 * Silent refresh for app open: if notifications are already allowed (never
 * prompts), fetch this device's current FCM token and re-register it when it
 * differs from the stored one — browsers rotate tokens, and a stale one
 * means notifications quietly stop arriving.
 */
export async function syncFcmTokenIfGranted(): Promise<void> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  try {
    const token = await currentDeviceToken();
    if (!token || token === getStoredFcmToken()) {
      return;
    }
    const res = await fetch("/api/fcm/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (res.ok) {
      storeFcmToken(token);
    }
  } catch {
    return;
  }
}
