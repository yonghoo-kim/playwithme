"use client";

import { useState } from "react";
import type { Place } from "@/types/db";
import PlaceButton from "@/components/PlaceButton";
import AddPlaceButton from "@/components/AddPlaceButton";
import { getStoredFcmToken } from "@/lib/firebase/client";

interface PlaceSelectorProps {
  /** A child the signed-in user guards (the server re-checks). */
  childId: string;
  /** The child's family places. */
  places: Place[];
  onSelected?: (placeId: string | null) => void;
}

/**
 * Status controls for one of MY children (dashboard only — never rendered
 * for another family's child). Picking a place — an existing `PlaceButton`,
 * one just created via `AddPlaceButton`, or "🏠 귀가" — POSTs
 * `/api/status/update`. The child has one status shared with all of its
 * groups. After a successful update it calls `onSelected(placeId)` so the
 * parent can reflect the change immediately (Realtime delivers the same
 * change to everyone else).
 */

// Sentinel used to track the home (귀가) button's in-flight state in the
// same `selectingPlaceId` field as place selections, since `placeId` itself
// is `null` for the home case.
const HOME_SENTINEL = "__home__";

export default function PlaceSelector({
  childId,
  places,
  onSelected,
}: PlaceSelectorProps) {
  const [selectingPlaceId, setSelectingPlaceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function selectPlace(placeId: string | null) {
    setSelectingPlaceId(placeId ?? HOME_SENTINEL);
    setError(null);
    try {
      const res = await fetch("/api/status/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          placeId,
          deviceToken: getStoredFcmToken(),
        }),
      });
      if (res.ok) {
        onSelected?.(placeId);
      } else {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(data.error ?? "상태를 바꾸지 못했어요. 다시 시도해주세요.");
      }
    } catch {
      setError("상태를 바꾸지 못했어요. 다시 시도해주세요.");
    } finally {
      setSelectingPlaceId(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-start gap-3">
        {places.map((place) => (
          <PlaceButton key={place.id} place={place} onSelect={selectPlace} />
        ))}
        <AddPlaceButton onSelect={selectPlace} />
        <button
          type="button"
          onClick={() => selectPlace(null)}
          disabled={selectingPlaceId === HOME_SENTINEL}
          className="flex h-[76px] w-[76px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-4 border-gray-800 bg-white px-2 py-2 shadow-[4px_4px_0px_rgba(31,41,55,0.25)] transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
        >
          <span className="font-jua text-sm text-gray-700">🏠 귀가</span>
        </button>
        {selectingPlaceId && (
          <span className="sr-only" role="status">
            장소를 업데이트하는 중이에요
          </span>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs font-bold text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
