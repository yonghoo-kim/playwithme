"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getStoredFcmToken } from "@/lib/firebase/client";

/**
 * Compact pill left of the 설정 button, pointing at it, while notifications
 * aren't on for this device. Uses the same real-browser-state check as
 * `NotificationSettingsToggle` (`Notification.permission === "granted"` + a
 * stored FCM token), so it never shows once notifications are enabled.
 * Renders nothing until after mount — `Notification` is browser-only, so
 * this avoids hydration mismatch.
 */
export default function NotificationNudge() {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    setEnabled(
      typeof Notification !== "undefined" &&
        Notification.permission === "granted" &&
        !!getStoredFcmToken()
    );
  }, []);

  if (enabled !== false) {
    return null;
  }

  return (
    <Link
      href="/settings"
      className="flex items-center gap-1.5 rounded-full border-4 border-gray-800 bg-yellow-200 py-1 pl-3 pr-2 text-sm font-bold text-yellow-900 shadow-[4px_4px_0px_rgba(31,41,55,0.25)] transition-transform hover:scale-105 active:scale-95"
    >
      🔔 알림을 켜주세요
      <ArrowRight
        size={16}
        strokeWidth={3}
        aria-hidden
        className="animate-nudge-x text-pink-700"
      />
    </Link>
  );
}
