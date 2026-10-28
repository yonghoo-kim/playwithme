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
export default function PlaceSelector({ groupId, places }: PlaceSelectorProps) {
  const [selectingPlaceId, setSelectingPlaceId] = useState<string | null>(null);

  async function selectPlace(placeId: string) {
    setSelectingPlaceId(placeId);
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
      {selectingPlaceId && (
        <span className="sr-only" role="status">
          장소를 업데이트하는 중이에요
        </span>
      )}
    </div>
  );
}
