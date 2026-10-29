"use client";

import { useEffect } from "react";
import { syncFcmTokenIfGranted } from "@/lib/firebase/client";

/** Renders nothing; keeps this device's push token registered on app open. */
export default function FcmTokenSync() {
  useEffect(() => {
    void syncFcmTokenIfGranted();
  }, []);
  return null;
}
