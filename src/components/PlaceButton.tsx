"use client";

import { getPlaceVisual } from "@/lib/icons";
import type { Place } from "@/types/db";

interface PlaceButtonProps {
  place: Place;
  onSelect: (placeId: string, placeName: string) => void;
}

/**
 * A single selectable place chip. Clicking it reports the place to the
 * caller (`PlaceSelector`), which confirms and POSTs it to
 * `/api/status/update`.
 */
export default function PlaceButton({ place, onSelect }: PlaceButtonProps) {
  const visual = getPlaceVisual(place.icon_name);

  return (
    <button
      type="button"
      onClick={() => onSelect(place.id, place.name)}
      className="flex h-[76px] w-[76px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-4 border-gray-800 bg-white px-2 py-2 shadow-[4px_4px_0px_rgba(31,41,55,0.25)] transition-transform hover:scale-105 active:scale-95"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-200 shadow-md shadow-blue-200">
        {visual.type === "emoji" ? (
          <span aria-hidden className="text-[20px] leading-none">
            {visual.emoji}
          </span>
        ) : (
          <visual.Icon size={20} strokeWidth={3} className="text-blue-900" />
        )}
      </span>
      <span className="truncate text-center font-jua text-xs text-gray-700">
        {place.name}
      </span>
    </button>
  );
}
