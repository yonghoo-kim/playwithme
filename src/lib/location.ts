// Browser-only helpers for the phone's approximate location (used for the
// weather). Coordinates are rounded to 3 decimals (≈100m) and kept on this
// phone only; the server turns them into a 5km KMA grid cell.

const COORDS_KEY = "playwithme_weather_coords";

/** Fired on window after new coordinates are saved. */
export const COORDS_EVENT = "playwithme:coords";

export interface Coords {
  lat: number;
  lon: number;
}

export function readCoords(): Coords | null {
  try {
    const raw = window.localStorage.getItem(COORDS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Coords) : null;
    return parsed && Number.isFinite(parsed.lat) && Number.isFinite(parsed.lon)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function saveCoords(coords: Coords): void {
  try {
    window.localStorage.setItem(COORDS_KEY, JSON.stringify(coords));
  } catch {
    // Storage blocked: weather still shows for this visit.
  }
  window.dispatchEvent(new Event(COORDS_EVENT));
}

/** Asks for (or reuses) the location permission and returns the position. */
export function currentPosition(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("geolocation unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: Math.round(position.coords.latitude * 1000) / 1000,
          lon: Math.round(position.coords.longitude * 1000) / 1000,
        }),
      reject,
      { enableHighAccuracy: false, maximumAge: 30 * 60_000, timeout: 15_000 }
    );
  });
}

/** "granted" | "prompt" | "denied", or "unknown" without the Permissions API. */
export async function locationPermission(): Promise<PermissionState | "unknown"> {
  try {
    const status = await navigator.permissions?.query({
      name: "geolocation" as PermissionName,
    });
    return status?.state ?? "unknown";
  } catch {
    return "unknown";
  }
}
