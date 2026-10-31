"use client";

import { useState } from "react";
import { postStatus } from "@/lib/postStatus";

interface ArrivedButtonProps {
  /** A child the signed-in user guards (the server re-checks). */
  childId: string;
  /** Where the child was headed (null = home). */
  placeId: string | null;
  /** Re-posted as arrived; `updatedAt` is the new timestamp. */
  onArrived: (updatedAt: string) => void;
}

/**
 * "도착했어요" on MY child's card while the status is "가는 중": re-posts the
 * same place with `going: false`. That flips 가는 중 → 도착, which the API
 * treats as a real change (friends get the arrival push).
 */
export default function ArrivedButton({
  childId,
  placeId,
  onArrived,
}: ArrivedButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function arrive() {
    setBusy(true);
    setError(null);
    const failure = await postStatus(childId, placeId, false);
    setBusy(false);
    if (failure) {
      setError(failure);
    } else {
      onArrived(new Date().toISOString());
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={arrive}
        disabled={busy}
        className="shrink-0 rounded-full border-4 border-gray-800 bg-green-200 px-4 py-1.5 font-jua text-sm text-green-900 transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
      >
        도착했어요 <span aria-hidden>📍</span>
      </button>
      {error && (
        <p role="alert" className="text-xs font-bold text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
