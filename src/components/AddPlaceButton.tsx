"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { getPlaceVisual } from "@/lib/icons";

interface AddPlaceButtonProps {
  groupId: string;
  onSelect: (placeId: string) => void;
}

// Fixed set of icon choices offered when creating a place on the fly.
// Mirrors the known keys in `src/lib/icons.ts` (PLACE_EMOJIS + PLACE_ICONS) —
// keep in sync if those maps' keys ever change. Each choice is rendered via
// `getPlaceVisual`, so "Playground" shows the 🛝 emoji. Playground is first
// (and the default) since it's the most common place.
const ICON_CHOICES: { name: string }[] = [
  { name: "Playground" },
  { name: "Trees" },
  { name: "ShoppingCart" },
  { name: "MapPin" },
  { name: "Home" },
  { name: "Building2" },
  { name: "Bike" },
];

/**
 * Bouncy circular "+" button that opens an inline form (name + icon pick)
 * to create a new place. On submit, POSTs to `/api/places/create` and then
 * calls the same `onSelect(placeId)` callback `PlaceButton` uses, so the
 * new place is selected immediately via `/api/status/update`.
 */
export default function AddPlaceButton({
  groupId,
  onSelect,
}: AddPlaceButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [iconName, setIconName] = useState(ICON_CHOICES[0].name);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/places/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, name: trimmed, iconName }),
      });
      const data = await res.json();

      if (!res.ok || !data.place) {
        setError(data.error ?? "장소 생성에 실패했어요.");
        return;
      }

      onSelect(data.place.id as string);
      setOpen(false);
      setName("");
      setIconName(ICON_CHOICES[0].name);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="장소 추가"
        className="flex h-[76px] w-[76px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-4 border-dashed border-gray-400 bg-white/60 text-gray-500 transition-transform hover:scale-105 active:scale-95"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-200 shadow-md shadow-purple-200">
          <Plus size={20} strokeWidth={3} className="text-purple-900" />
        </span>
        <span className="text-xs font-bold">추가</span>
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-2 rounded-2xl border-4 border-gray-800 bg-white p-3 shadow-[4px_4px_0px_rgba(31,41,55,0.25)]"
    >
      <input
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="장소 이름"
        required
        autoFocus
        className="w-full rounded-2xl border-2 border-gray-800 bg-yellow-50 px-3 py-2 text-center outline-none"
      />

      <div className="flex flex-wrap justify-center gap-2">
        {ICON_CHOICES.map(({ name: choiceName }) => {
          const visual = getPlaceVisual(choiceName);
          return (
            <button
              key={choiceName}
              type="button"
              onClick={() => setIconName(choiceName)}
              aria-label={choiceName}
              aria-pressed={iconName === choiceName}
              className={`flex h-10 w-10 items-center justify-center rounded-full shadow-md transition-transform hover:scale-105 active:scale-95 ${
                iconName === choiceName
                  ? "bg-blue-300 shadow-blue-300"
                  : "bg-gray-100 shadow-gray-200"
              }`}
            >
              {visual.type === "emoji" ? (
                <span aria-hidden className="text-[18px] leading-none">
                  {visual.emoji}
                </span>
              ) : (
                <visual.Icon size={18} strokeWidth={3} className="text-blue-900" />
              )}
            </button>
          );
        })}
      </div>

      {error && <p className="text-center text-xs font-bold text-pink-700">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="flex-1 rounded-2xl border-4 border-gray-800 bg-gray-100 py-2 font-jua text-gray-600 transition-transform hover:scale-105 active:scale-95"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-2xl border-4 border-gray-800 bg-pink-300 py-2 font-jua text-pink-900 shadow-md shadow-pink-200 transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
        >
          추가 ✨
        </button>
      </div>
    </form>
  );
}
