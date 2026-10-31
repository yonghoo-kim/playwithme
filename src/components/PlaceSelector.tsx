"use client";

import { useCallback, useState } from "react";
import type { Place } from "@/types/db";
import PlaceButton from "@/components/PlaceButton";
import AddPlaceButton from "@/components/AddPlaceButton";
import ConfirmDialog from "@/components/ConfirmDialog";
import { withDirectionParticle } from "@/lib/korean";
import { postStatus } from "@/lib/postStatus";

interface PlaceSelectorProps {
  /** A child the signed-in user guards (the server re-checks). */
  childId: string;
  /** The child's family places. */
  places: Place[];
  onSelected?: (placeId: string | null, going: boolean) => void;
}

/**
 * Status controls for one of MY children (dashboard only — never rendered
 * for another family's child). A two-option toggle on top picks how the
 * place is meant: "도착 📍" (there now, the default) or "가는 중 🚶" (on the
 * way). Picking a place — an existing `PlaceButton`, one just created via
 * `AddPlaceButton`, or "🏠 집으로" — first asks for confirmation, then POSTs
 * `/api/status/update` with `{ placeId, going }`. The child has one status
 * shared with all of its groups. After a successful update it calls
 * `onSelected(placeId, going)` so the parent can reflect the change
 * immediately (Realtime delivers the same change to everyone else), and the
 * toggle goes back to 도착.
 *
 * Order is fixed: places, then 집으로, then 추가 always last.
 */

// Sentinel used to track the home (집으로) button's in-flight state in the
// same `selectingPlaceId` field as place selections, since `placeId` itself
// is `null` for the home case.
const HOME_SENTINEL = "__home__";

interface PendingChoice {
  placeId: string | null;
  placeName: string;
}

const MODES = [
  { going: false, label: "도착", emoji: "📍", on: "bg-green-200 text-green-900" },
  { going: true, label: "가는 중", emoji: "🚶", on: "bg-sky-200 text-sky-900" },
] as const;

export default function PlaceSelector({
  childId,
  places,
  onSelected,
}: PlaceSelectorProps) {
  const [selectingPlaceId, setSelectingPlaceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingChoice | null>(null);
  const [going, setGoing] = useState(false);

  const closeDialog = useCallback(() => setPending(null), []);

  function askToGo(placeId: string | null, placeName: string) {
    setError(null);
    setPending({ placeId, placeName });
  }

  async function selectPlace(placeId: string | null, asGoing: boolean) {
    setSelectingPlaceId(placeId ?? HOME_SENTINEL);
    setError(null);
    const failure = await postStatus(childId, placeId, asGoing);
    setSelectingPlaceId(null);
    if (failure) {
      setError(failure);
      return;
    }
    setGoing(false);
    onSelected?.(placeId, asGoing);
  }

  function confirm() {
    if (!pending) return;
    const { placeId } = pending;
    setPending(null);
    void selectPlace(placeId, going);
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        role="group"
        aria-label="도착했나요, 가는 중인가요?"
        className="flex gap-2"
      >
        {MODES.map((mode) => {
          const selected = going === mode.going;
          return (
            <button
              key={mode.label}
              type="button"
              aria-pressed={selected}
              onClick={() => setGoing(mode.going)}
              className={`rounded-full border-4 px-4 py-1 font-jua text-sm transition-transform hover:scale-105 active:scale-95 ${
                selected
                  ? `border-gray-800 ${mode.on}`
                  : "border-gray-300 bg-white text-gray-500"
              }`}
            >
              {mode.label} <span aria-hidden>{mode.emoji}</span>
            </button>
          );
        })}
      </div>
      <div data-place-buttons className="flex flex-wrap items-start gap-3">
        {places.map((place) => (
          <PlaceButton key={place.id} place={place} onSelect={askToGo} />
        ))}
        <button
          type="button"
          onClick={() => askToGo(null, "집")}
          disabled={selectingPlaceId === HOME_SENTINEL}
          className="flex h-[76px] w-[76px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-4 border-gray-800 bg-white px-2 py-2 shadow-[4px_4px_0px_rgba(31,41,55,0.25)] transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-200 shadow-md shadow-orange-200">
            <span aria-hidden className="text-[20px] leading-none">
              🏠
            </span>
          </span>
          <span className="font-jua text-xs text-gray-700">집으로</span>
        </button>
        <AddPlaceButton onSelect={askToGo} />
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

      {pending && (
        <ConfirmDialog
          message={
            going
              ? `${withDirectionParticle(pending.placeName)} 가는 중이에요?`
              : `${withDirectionParticle(pending.placeName)} 가시겠습니까?`
          }
          confirmLabel={going ? "네, 가는 중!" : "네, 갈래요!"}
          onConfirm={confirm}
          onCancel={closeDialog}
        />
      )}
    </div>
  );
}
