"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import {
  getStoredFcmToken,
  requestNotificationPermissionAndToken,
  storeFcmToken,
} from "@/lib/firebase/client";

type ToggleState = "checking" | "enabled" | "disabled" | "unsupported";

/**
 * Self-contained notification setting. On mount it reads the REAL browser
 * state — `Notification.permission === "granted"` plus a stored FCM token
 * for this device — so once notifications are on, a reload shows a static
 * "알림 켜짐 ✅" pill and never re-prompts (the old banner only tracked
 * local component state, which reset on every reload).
 */
export default function NotificationSettingsToggle() {
  const [state, setState] = useState<ToggleState>("checking");
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    const enabled =
      typeof Notification !== "undefined" &&
      Notification.permission === "granted" &&
      !!getStoredFcmToken();
    setState(enabled ? "enabled" : "disabled");
  }, []);

  async function handleEnableClick() {
    setRequesting(true);
    try {
      const token = await requestNotificationPermissionAndToken();

      if (!token) {
        setState("unsupported");
        return;
      }

      await fetch("/api/fcm/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      storeFcmToken(token);
      setState("enabled");
    } finally {
      setRequesting(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border-4 border-gray-800 bg-pink-100 p-4 shadow-[4px_4px_0px_rgba(31,41,55,0.25)]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-200 shadow-md shadow-yellow-200">
        <Bell size={20} strokeWidth={2.5} className="text-yellow-800" />
      </span>

      {state === "checking" && (
        <p className="flex-1 text-sm font-bold text-blue-900">
          알림 상태 확인 중…
        </p>
      )}

      {state === "enabled" && (
        <>
          <p className="flex-1 text-sm font-bold text-blue-900">
            놀이터 알림을 받고 있어요!
          </p>
          <span className="shrink-0 rounded-full border-4 border-gray-800 bg-green-200 px-3 py-1 text-sm font-bold text-green-900">
            알림 켜짐 ✅
          </span>
        </>
      )}

      {state === "disabled" && (
        <>
          <p className="flex-1 text-sm font-bold text-blue-900">
            놀이터 알림을 받으려면 홈 화면에 추가하고 알림을 켜주세요! ✨
          </p>
          <button
            type="button"
            onClick={handleEnableClick}
            disabled={requesting}
            className="shrink-0 rounded-full border-4 border-gray-800 bg-yellow-200 px-3 py-1 text-sm font-bold text-yellow-900 shadow-md shadow-yellow-200 transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
          >
            켜기
          </button>
        </>
      )}

      {state === "unsupported" && (
        <p className="flex-1 text-sm font-bold text-blue-900">
          알림을 켤 수 없어요 — 브라우저 설정에서 허용해주세요 🙏
        </p>
      )}
    </div>
  );
}
