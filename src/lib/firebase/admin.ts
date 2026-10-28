import { cert, initializeApp, type App } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

let app: App | undefined;

export function getAdminMessaging(): Messaging {
  if (!app) {
    app = initializeApp({
      credential: cert(
        JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!)
      ),
    });
  }

  return getMessaging(app);
}
