"use client";

import { getPlaceIcon } from "@/lib/icons";
import type { Place } from "@/types/db";

interface PlaceButtonProps {
  place: Place;
  onSelect: (placeId: string) => void;
}

/**
 * A single selectable place chip. Clicking it reports the place's id to the
 * caller (`PlaceSelector`), which POSTs it to `/api/status/update`.
 */
export default function PlaceButton({ place, onSelect }: PlaceButtonProps) {
  const Icon = getPlaceIcon(place.icon_name);

  return (
    <button
      type="button"
      onClick={() => onSelect(place.id)}
      className="flex h-[76px] w-[76px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-4 border-gray-800 bg-white px-2 py-2 shadow-[4px_4px_0px_rgba(31,41,55,1)] transition-transform hover:scale-110 hover:-translate-y-1 active:scale-90 active:rotate-3"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-200 shadow-md shadow-blue-200">
        <Icon size={20} strokeWidth={3} className="text-blue-900" />
      </span>
      <span className="truncate text-center font-jua text-xs text-gray-700">
        {place.name}
      </span>
    </button>
  );
}
