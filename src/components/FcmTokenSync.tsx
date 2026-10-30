"use client";

import { useEffect } from "react";
import {
  showForegroundPushes,
  syncFcmTokenIfGranted,
} from "@/lib/firebase/client";

/**
 * Renders nothing; keeps this device's push token registered on app open
 * and shows pushes that arrive while the app is on screen.
 */
export default function FcmTokenSync() {
  useEffect(() => {
    let unsubscribe: () => void = () => undefined;
    void syncFcmTokenIfGranted().then(() => {
      unsubscribe = showForegroundPushes();
    });
    return () => unsubscribe();
  }, []);
  return null;
}
