"use client";

import { useEffect, useState } from "react";
import { Bell, MapPin } from "lucide-react";
import {
  enableNotificationsOnThisDevice,
  getStoredFcmToken,
} from "@/lib/firebase/client";
import {
  currentPosition,
  locationPermission,
  readCoords,
  saveCoords,
} from "@/lib/location";

// Shown at most once per app session after it was answered.
const DONE_KEY = "playwithme_permission_gate_done";

type ItemState = "needed" | "on" | "blocked" | "unsupported";

function notificationState(): ItemState {
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  return Notification.permission === "granted" && getStoredFcmToken()
    ? "on"
    : "needed";
}

async function locationState(): Promise<ItemState> {
  if (!("geolocation" in navigator)) return "unsupported";
  const permission = await locationPermission();
  if (permission === "granted") return "on";
  if (permission === "denied") return "blocked";
  // No Permissions API (older Safari): saved coords mean it was allowed.
  return permission === "unknown" && readCoords() ? "on" : "needed";
}

function sessionDone(): boolean {
  try {
    return window.sessionStorage.getItem(DONE_KEY) === "1";
  } catch {
    return false;
  }
}

function markDone() {
  try {
    window.sessionStorage.setItem(DONE_KEY, "1");
  } catch {
    // Without storage it may show again next visit; harmless.
  }
}

/**
 * Right after login (on the dashboard): one card asking for both
 * permissions the app needs — notifications (friends' status) and location
 * (local weather). Both requests run from the single "모두 허용하기" tap,
 * since browsers only show permission prompts for a user gesture. Anything
 * blocked gets a how-to line; "계속하기" closes it for this session.
 */
export default function PermissionGate() {
  const [notif, setNotif] = useState<ItemState | null>(null);
  const [location, setLocation] = useState<ItemState | null>(null);
  const [asked, setAsked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const n = notificationState();
      const l = await locationState();
      if (cancelled) return;
      setNotif(n);
      setLocation(l);
      setOpen(!sessionDone() && (n === "needed" || l === "needed"));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function allowAll() {
    setBusy(true);
    // Notification first: Safari only allows it directly inside the tap.
    if (notif === "needed") {
      const on = await enableNotificationsOnThisDevice();
      setNotif(on ? "on" : notificationState() === "blocked" ? "blocked" : "needed");
    }
    if (location === "needed") {
      try {
        saveCoords(await currentPosition());
        setLocation("on");
      } catch {
        setLocation("blocked");
      }
    }
    setBusy(false);
    setAsked(true);
  }

  function close() {
    markDone();
    setOpen(false);
  }

  // Both on after the tap: close by itself.
  useEffect(() => {
    if (asked && notif === "on" && location === "on") {
      markDone();
      setOpen(false);
    }
  }, [asked, notif, location]);

  if (!open || notif === null || location === null) return null;

  const row = (
    icon: React.ReactNode,
    title: string,
    why: string,
    state: ItemState,
    help: string
  ) => (
    <li className="flex items-start gap-3 rounded-2xl bg-yellow-50 p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-200 shadow-md shadow-pink-200">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-2 font-jua text-lg text-blue-900">
          {title}
          {state === "on" && <span className="text-sm text-green-700">허용됨 ✅</span>}
        </span>
        <span className="text-xs font-bold text-gray-600">{why}</span>
        {(state === "blocked" || state === "unsupported") && (
          <span className="mt-1 text-xs font-bold text-red-600">{help}</span>
        )}
      </span>
    </li>
  );

  const pending = notif === "needed" || location === "needed";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 px-5">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="permission-gate-title"
        className="animate-page-enter flex w-full max-w-sm flex-col gap-4 rounded-3xl border-4 border-gray-800 bg-white p-5 shadow-[4px_4px_0px_rgba(31,41,55,0.25)]"
      >
        <h2
          id="permission-gate-title"
          className="text-center font-jua text-2xl text-pink-700"
        >
          두 가지만 허용해주세요 🙏
        </h2>
        <ul className="flex flex-col gap-2">
          {row(
            <Bell size={20} strokeWidth={2.5} className="text-pink-800" />,
            "알림",
            "친구가 놀이터에 나오면 바로 알려줘요",
            notif,
            notif === "unsupported"
              ? "홈 화면에 추가한 앱에서만 알림을 받을 수 있어요 (아이폰: 공유 → 홈 화면에 추가)"
              : "차단돼 있어요. 브라우저 설정 → 사이트 권한 → 알림에서 허용해주세요"
          )}
          {row(
            <MapPin size={20} strokeWidth={2.5} className="text-pink-800" />,
            "위치",
            "우리 동네 날씨를 보여줘요 (정확한 위치는 저장하지 않아요)",
            location,
            location === "unsupported"
              ? "이 브라우저는 위치를 지원하지 않아요"
              : "차단돼 있어요. 브라우저 설정 → 사이트 권한 → 위치에서 허용해주세요"
          )}
        </ul>

        {pending && !asked ? (
          <button
            type="button"
            onClick={allowAll}
            disabled={busy}
            autoFocus
            className="rounded-2xl border-4 border-gray-800 bg-pink-300 py-3 font-jua text-xl text-pink-900 shadow-[4px_4px_0px_rgba(31,41,55,0.25)] transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
          >
            {busy ? "허용하는 중…" : "모두 허용하기"}
          </button>
        ) : (
          <button
            type="button"
            onClick={close}
            autoFocus
            className="rounded-2xl border-4 border-gray-800 bg-blue-200 py-3 font-jua text-xl text-blue-900 shadow-[4px_4px_0px_rgba(31,41,55,0.25)] transition-transform hover:scale-105 active:scale-95"
          >
            계속하기
          </button>
        )}
      </div>
    </div>
  );
}
