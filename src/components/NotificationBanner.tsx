"use client";

import { useState } from "react";
import { Bell, X } from "lucide-react";
import { requestNotificationPermissionAndToken } from "@/lib/firebase/client";

/**
 * Dismissible banner prompting parents to add the app to their home screen
 * and enable notifications. Clicking "켜기" requests notification
 * permission, registers the FCM service worker, and — if a token comes
 * back — registers it with the server. If permission is denied or FCM is
 * unsupported, the banner degrades to a dismissible message instead of
 * retrying forever.
 */
export default function NotificationBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [requesting, setRequesting] = useState(false);

  if (dismissed) {
    return null;
  }

  async function handleEnableClick() {
    setRequesting(true);
    try {
      const token = await requestNotificationPermissionAndToken();

      if (!token) {
        setUnsupported(true);
        return;
      }

      await fetch("/api/fcm/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      setDismissed(true);
    } finally {
      setRequesting(false);
    }
  }

  if (unsupported) {
    return (
      <div className="mx-auto flex w-full max-w-md items-center gap-3 rounded-2xl border-4 border-gray-800 bg-pink-100 p-4 shadow-[4px_4px_0px_rgba(31,41,55,1)]">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-200 shadow-md shadow-yellow-200">
          <Bell size={20} strokeWidth={2.5} className="text-yellow-800" />
        </span>

        <p className="flex-1 text-sm font-bold text-blue-900">
          알림을 켤 수 없어요 — 브라우저 설정에서 허용해주세요 🙏
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
        onClick={handleEnableClick}
        disabled={requesting}
        className="shrink-0 rounded-full border-4 border-gray-800 bg-yellow-200 px-3 py-1 text-sm font-bold text-yellow-900 shadow-md shadow-yellow-200 transition-transform hover:scale-110 hover:-translate-y-1 active:scale-90 active:rotate-3 disabled:opacity-60"
      >
        켜기
      </button>

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
