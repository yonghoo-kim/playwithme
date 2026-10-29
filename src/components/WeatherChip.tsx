"use client";

import { useCallback, useEffect, useState } from "react";
import { dayPhase } from "@/lib/dayPhase";
import {
  COORDS_EVENT,
  currentPosition,
  locationPermission,
  readCoords,
  saveCoords,
  type Coords,
} from "@/lib/location";
import type { WeatherCondition, WeatherSummary } from "@/lib/weather";

const REFRESH_MS = 10 * 60_000;

const LABEL: Record<WeatherCondition, string> = {
  clear: "맑음",
  partly: "구름많음",
  cloudy: "흐림",
  rain: "비",
  snow: "눈",
};

function emojiFor(condition: WeatherCondition): string {
  if (condition === "rain") return "🌧️";
  if (condition === "snow") return "❄️";
  if (condition === "cloudy") return "☁️";
  if (condition === "partly") return "⛅";
  return dayPhase(new Date().getHours()) === "night" ? "🌙" : "☀️";
}

type ChipState =
  | { kind: "ask" }
  | { kind: "loading" }
  | { kind: "blocked" }
  | { kind: "ready"; weather: WeatherSummary };

/**
 * Top-left weather chip ("🌧️ 10° 비") from 기상청 for the phone's location.
 * Location is normally granted right after login (PermissionGate); until
 * then the chip offers "📍 날씨 보기". Once allowed, the latest position is
 * used silently. Also sets <html data-weather> so the background and the
 * rain/snow hint follow.
 */
export default function WeatherChip() {
  const [state, setState] = useState<ChipState | null>(null);

  const load = useCallback(async (coords: Coords) => {
    try {
      const res = await fetch(`/api/weather?lat=${coords.lat}&lon=${coords.lon}`);
      if (!res.ok) throw new Error(String(res.status));
      const weather = (await res.json()) as WeatherSummary;
      document.documentElement.dataset.weather = weather.condition;
      setState({ kind: "ready", weather });
    } catch {
      // No weather: keep the plain time-of-day sky, hide the chip.
      delete document.documentElement.dataset.weather;
      setState(null);
    }
  }, []);

  const locate = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      saveCoords(await currentPosition());
    } catch {
      setState({ kind: "blocked" });
    }
  }, []);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;

    const refresh = async () => {
      const saved = readCoords();
      if ((await locationPermission()) === "granted") {
        // Allowed before: follow the phone without asking again.
        currentPosition()
          .then(saveCoords)
          .catch(() => (saved ? load(saved) : setState({ kind: "ask" })));
      } else if (saved) {
        await load(saved);
      } else {
        setState({ kind: "ask" });
      }
    };

    // New coordinates (from here or PermissionGate) -> reload the weather.
    const onCoords = () => {
      const coords = readCoords();
      if (coords) void load(coords);
    };
    window.addEventListener(COORDS_EVENT, onCoords);

    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, REFRESH_MS);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(COORDS_EVENT, onCoords);
    };
  }, [load]);

  const chip =
    "flex items-center gap-1 rounded-full bg-white/85 px-3 py-1.5 font-jua text-sm text-blue-900 shadow-sm";

  if (!state) return null;

  if (state.kind === "ready") {
    const { temp, condition } = state.weather;
    return (
      <span className={chip} aria-label={`지금 날씨 ${LABEL[condition]}`}>
        <span aria-hidden>{emojiFor(condition)}</span>
        {temp !== null && <span>{temp}°</span>}
        <span>{LABEL[condition]}</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={locate}
      disabled={state.kind === "loading"}
      className={`${chip} transition-transform hover:scale-105 active:scale-95 disabled:opacity-60`}
    >
      {state.kind === "loading"
        ? "📍 위치 찾는 중…"
        : state.kind === "blocked"
          ? "📍 위치를 허용해주세요"
          : "📍 날씨 보기"}
    </button>
  );
}
