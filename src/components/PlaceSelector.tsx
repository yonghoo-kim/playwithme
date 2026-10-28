"use client";

import { useState } from "react";
import type { Place } from "@/types/db";
import PlaceButton from "@/components/PlaceButton";
import AddPlaceButton from "@/components/AddPlaceButton";

interface PlaceSelectorProps {
  groupId: string;
  places: Place[];
}

/**
 * Client-side interactivity for the dashboard's place row. `dashboard/page.tsx`
 * stays a Server Component (it fetches `places` with the service client);
 * this component owns click-handling and calls `POST /api/status/update`
 * whenever a place is picked — whether from an existing `PlaceButton` or a
 * place just created via `AddPlaceButton`. Mirrors the client/server split
 * already used by `NotificationBanner`.
 */

// Sentinel used to track the home (귀가) button's in-flight state in the
// same `selectingPlaceId` field as place selections, since `placeId` itself
// is `null` for the home case.
const HOME_SENTINEL = "__home__";

export default function PlaceSelector({ groupId, places }: PlaceSelectorProps) {
  const [selectingPlaceId, setSelectingPlaceId] = useState<string | null>(null);

  async function selectPlace(placeId: string | null) {
    setSelectingPlaceId(placeId ?? HOME_SENTINEL);
    try {
      await fetch("/api/status/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, placeId }),
      });
    } finally {
      setSelectingPlaceId(null);
    }
  }

  return (
    <div className="flex flex-wrap items-start gap-3">
      {places.map((place) => (
        <PlaceButton
          key={place.id}
          place={place}
          onSelect={selectPlace}
        />
      ))}
      <AddPlaceButton groupId={groupId} onSelect={selectPlace} />
      <button
        type="button"
        onClick={() => selectPlace(null)}
        disabled={selectingPlaceId === HOME_SENTINEL}
        className="flex h-[76px] w-[76px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-4 border-gray-800 bg-white px-2 py-2 shadow-[4px_4px_0px_rgba(31,41,55,1)] transition-transform hover:scale-110 hover:-translate-y-1 active:scale-90 active:rotate-3 disabled:opacity-60"
      >
        <span className="font-jua text-sm text-gray-700">🏠 귀가</span>
      </button>
      {selectingPlaceId && (
        <span className="sr-only" role="status">
          장소를 업데이트하는 중이에요
        </span>
      )}
    </div>
  );
}
