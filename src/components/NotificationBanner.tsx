"use client";

import { useState } from "react";
import { Bell, X } from "lucide-react";

/**
 * Dismissible banner prompting parents to add the app to their home screen
 * and enable notifications.
 *
 * NOTE: This is a shell only — dismissal is local component state (no
 * persistence) and there is no real notification-permission or FCM token
 * logic here yet. Task 6 wires that in.
 */
export default function NotificationBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-md items-center gap-3 rounded-2xl border-4 border-gray-800 bg-pink-100 p-4 shadow-[4px_4px_0px_rgba(31,41,55,1)]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-200 shadow-md shadow-yellow-200">
        <Bell size={20} strokeWidth={2.5} className="text-yellow-800" />
      </span>

      <p className="flex-1 text-sm font-bold text-blue-900">
        놀이터 알림을 받으려면 홈 화면에 추가하고 알림을 켜주세요! ✨
      </p>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="알림 닫기"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-4 border-gray-800 bg-white shadow-md shadow-pink-200 transition-transform hover:scale-110 hover:-translate-y-1 active:scale-90 active:rotate-3"
      >
        <X size={16} strokeWidth={3} className="text-pink-700" />
      </button>
    </div>
  );
}
