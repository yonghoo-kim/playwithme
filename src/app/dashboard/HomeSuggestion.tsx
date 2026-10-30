"use client";

import { useEffect, useState } from "react";
import { getStoredFcmToken } from "@/lib/firebase/client";
import {
  currentPosition,
  distanceMeters,
  locationPermission,
  readHome,
} from "@/lib/location";

// "Near home" radius; GPS on a phone indoors is often off by ~50-100m.
const NEAR_HOME_M = 200;

interface HomeSuggestionProps {
  childId: string;
  childName: string;
  /** The child's current place; null = already home (nothing to suggest). */
  placeId: string | null;
  updatedAt: string | null;
  onWentHome: () => void;
}

function dismissKey(childId: string, updatedAt: string | null) {
  return `playwithme_home_suggest:${childId}:${updatedAt ?? ""}`;
}

/**
 * "집에 오셨네요? ○○ 집으로 바꿀까요?" — only when a home spot is saved in
 * 설정, location is already allowed (never prompts), the parent's phone is
 * near home, and the child is still somewhere else. It only suggests: the
 * phone is the parent's, so after a daycare drop-off "아니요" is one tap.
 * A "아니요" lasts until the child's status changes.
 */
export default function HomeSuggestion({
  childId,
  childName,
  placeId,
  updatedAt,
  onWentHome,
}: HomeSuggestionProps) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setShow(false);
    if (!placeId) return;
    const home = readHome();
    if (!home) return;
    try {
      if (window.sessionStorage.getItem(dismissKey(childId, updatedAt))) return;
    } catch {
      // No storage: ask again next time, harmless.
    }

    let cancelled = false;
    (async () => {
      if ((await locationPermission()) !== "granted") return;
      try {
        const here = await currentPosition();
        if (!cancelled && distanceMeters(here, home) <= NEAR_HOME_M) {
          setShow(true);
        }
      } catch {
        // No position right now: no suggestion.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [childId, placeId, updatedAt]);

  if (!show) return null;

  function dismiss() {
    try {
      window.sessionStorage.setItem(dismissKey(childId, updatedAt), "1");
    } catch {
      // Ignore: it only hides for now.
    }
    setShow(false);
  }

  async function goHome() {
    setBusy(true);
    try {
      const res = await fetch("/api/status/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          placeId: null,
          deviceToken: getStoredFcmToken(),
        }),
      });
      if (res.ok) {
        setShow(false);
        onWentHome();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="status"
      className="animate-page-enter flex flex-wrap items-center gap-2 rounded-2xl border-2 border-orange-300 bg-orange-50 px-3 py-2"
    >
      <p className="min-w-0 flex-1 font-jua text-sm text-orange-900">
        🏠 집에 오셨네요? {childName}도 집으로 바꿀까요?
      </p>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={dismiss}
          className="rounded-full border-2 border-gray-300 bg-white px-3 py-1 text-xs font-bold text-gray-600 transition-transform hover:scale-105 active:scale-95"
        >
          아니요
        </button>
        <button
          type="button"
          onClick={goHome}
          disabled={busy}
          className="rounded-full border-2 border-gray-800 bg-orange-200 px-3 py-1 font-jua text-sm text-orange-900 transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
        >
          집으로
        </button>
      </div>
    </div>
  );
}
