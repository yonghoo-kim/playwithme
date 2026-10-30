"use client";

import { useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { getPlaceVisual } from "@/lib/icons";

export interface PlaceAlertItem {
  id: string;
  name: string;
  iconName: string;
  notify: boolean;
}

/**
 * Settings "장소 알림": per family place, whether going there notifies the
 * group friends. Quiet places (e.g. the daycare) still update everyone's
 * screen — they just don't push.
 */
export default function PlaceAlerts({ places }: { places: PlaceAlertItem[] }) {
  const [notifyById, setNotifyById] = useState(
    () => new Map(places.map((place) => [place.id, place.notify]))
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(placeId: string) {
    const next = !notifyById.get(placeId);
    setSavingId(placeId);
    setError(null);
    setNotifyById((current) => new Map(current).set(placeId, next));
    try {
      const res = await fetch("/api/places/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId, notify: next }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "설정을 저장하지 못했어요.");
      }
    } catch (err) {
      setNotifyById((current) => new Map(current).set(placeId, !next));
      setError(err instanceof Error ? err.message : "설정을 저장하지 못했어요.");
    } finally {
      setSavingId(null);
    }
  }

  if (places.length === 0) {
    return (
      <p className="rounded-2xl border-4 border-dashed border-gray-300 bg-white/60 p-4 text-center text-sm font-bold text-gray-600">
        아직 장소가 없어요 — 홈에서 ＋로 추가해보세요
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border-4 border-gray-800 bg-white p-3 shadow-[4px_4px_0px_rgba(31,41,55,0.25)]">
      <p className="text-xs font-bold text-gray-500">
        끈 장소는 친구들 화면에만 바뀌고 알림은 가지 않아요 (어린이집처럼 매일 가는 곳)
      </p>
      <ul className="flex flex-col gap-1.5">
        {places.map((place) => {
          const on = notifyById.get(place.id) !== false;
          const visual = getPlaceVisual(place.iconName);
          return (
            <li key={place.id} className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                {visual.type === "emoji" ? (
                  <span aria-hidden className="text-[16px] leading-none">
                    {visual.emoji}
                  </span>
                ) : (
                  <visual.Icon size={16} strokeWidth={3} className="text-blue-900" />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate font-jua text-base text-blue-900">
                {place.name}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`${place.name} 알림`}
                disabled={savingId === place.id}
                onClick={() => toggle(place.id)}
                className={`flex items-center gap-1 rounded-full border-2 px-3 py-1 text-xs font-bold transition-transform hover:scale-105 active:scale-95 disabled:opacity-60 ${
                  on
                    ? "border-green-300 bg-green-100 text-green-800"
                    : "border-gray-300 bg-gray-100 text-gray-500"
                }`}
              >
                {on ? (
                  <Bell size={12} strokeWidth={3} aria-hidden />
                ) : (
                  <BellOff size={12} strokeWidth={3} aria-hidden />
                )}
                {on ? "알림 켜짐" : "조용히"}
              </button>
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="text-xs font-bold text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
