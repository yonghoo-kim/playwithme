"use client";

import { useEffect, useState } from "react";
import { postStatus } from "@/lib/postStatus";
import { isStatusStale } from "@/lib/status";

const RECHECK_MS = 60_000;

interface StaleStatusCheckInProps {
  /** A child the signed-in user guards (the server re-checks). */
  childId: string;
  /** The child's current place; null = home (never asked about). */
  placeId: string | null;
  /** That place's name, or null while it isn't known yet. */
  placeName: string | null;
  updatedAt: string | null;
  /** "가는 중" — never asked about while the child is on the way. */
  going: boolean;
  /** The same place was re-posted; `updatedAt` is the new timestamp. */
  onStillThere: (updatedAt: string) => void;
  /** "다른 곳으로 바꿀게요": bring the place selector into view. */
  onChangePlace: () => void;
}

/**
 * Current time, refreshed every minute and whenever the app comes back to
 * the foreground. Null until mounted, so the server render and hydration
 * never disagree about "now".
 */
function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    tick();
    const timer = window.setInterval(tick, RECHECK_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", tick);
    window.addEventListener("pageshow", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", tick);
      window.removeEventListener("pageshow", tick);
    };
  }, []);

  return now;
}

/**
 * "아직도 ○○에 있나요?" — on MY child's card only (the dashboard's own-child
 * block; never on friends' cards), once the child has been somewhere other
 * than home for 5h+ without an update. "네, 아직 있어요" re-posts the same
 * place (refreshes `updated_at`; the API skips the push for a repeat).
 * "다른 곳으로 바꿀게요" points at the place selector and hides this until
 * the status changes. Skipped while the status is "가는 중" (no nagging
 * while the child is on the way).
 */
export default function StaleStatusCheckIn({
  childId,
  placeId,
  placeName,
  updatedAt,
  going,
  onStillThere,
  onChangePlace,
}: StaleStatusCheckInProps) {
  const now = useNow();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The status (by timestamp) the parent said they'd change themselves.
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [placeId, updatedAt]);

  if (
    now === null ||
    !placeId ||
    !placeName ||
    (updatedAt !== null && updatedAt === dismissedFor) ||
    !isStatusStale(placeId, placeName, updatedAt, now, going)
  ) {
    return null;
  }

  async function stillThere() {
    if (!placeId) return;
    setBusy(true);
    setError(null);
    // Shown only when arrived (going false), so this re-posts the same
    // status — a repeat, so the API sends no push.
    const failure = await postStatus(childId, placeId, false);
    setBusy(false);
    if (failure) {
      setError(failure);
    } else {
      onStillThere(new Date().toISOString());
    }
  }

  function changePlace() {
    setDismissedFor(updatedAt);
    onChangePlace();
  }

  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-2xl border-4 border-gray-800 bg-yellow-100 p-3 shadow-[4px_4px_0px_rgba(31,41,55,0.25)]"
    >
      <p className="font-jua text-lg text-yellow-900">
        <span aria-hidden>🤔 </span>
        아직도 {placeName}에 있나요?
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={stillThere}
          disabled={busy}
          className="rounded-full border-4 border-gray-800 bg-green-200 px-4 py-1.5 font-jua text-sm text-green-900 transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
        >
          네, 아직 있어요
        </button>
        <button
          type="button"
          onClick={changePlace}
          disabled={busy}
          className="rounded-full border-4 border-gray-800 bg-white px-4 py-1.5 font-jua text-sm text-gray-700 transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
        >
          다른 곳으로 바꿀게요
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs font-bold text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
