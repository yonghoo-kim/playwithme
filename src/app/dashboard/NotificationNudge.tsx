"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUp } from "lucide-react";
import { getStoredFcmToken } from "@/lib/firebase/client";

/**
 * Nudges toward Settings when notifications aren't on for this device.
 * Uses the same real-browser-state check as `NotificationSettingsToggle`
 * (`Notification.permission === "granted"` + a stored FCM token), so it
 * never shows once notifications are enabled. Renders nothing until after
 * mount — `Notification` is browser-only, so this avoids hydration mismatch.
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
      className="flex items-center gap-2 self-end rounded-full border-4 border-gray-800 bg-yellow-200 px-3 py-1.5 text-sm font-bold text-yellow-900 shadow-[4px_4px_0px_rgba(31,41,55,0.25)] transition-transform hover:scale-110 hover:-translate-y-1 active:scale-90 active:rotate-3"
    >
      🔔 알림을 켜주세요 — 설정에서 켤 수 있어요
      <span className="flex h-6 w-6 shrink-0 animate-bounce items-center justify-center rounded-full bg-pink-200 shadow-md shadow-pink-200">
        <ArrowUp size={14} strokeWidth={3} className="text-pink-800" />
      </span>
    </Link>
  );
}
