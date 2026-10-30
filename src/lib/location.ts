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

/** Straight-line distance between two points (haversine), in meters. */
export function distanceMeters(a: Coords, b: Coords): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

const HOME_KEY = "playwithme_home_coords";

/** "우리 집" spot saved on this phone only (never sent to the server). */
export function readHome(): Coords | null {
  try {
    const raw = window.localStorage.getItem(HOME_KEY);
    const parsed = raw ? (JSON.parse(raw) as Coords) : null;
    return parsed && Number.isFinite(parsed.lat) && Number.isFinite(parsed.lon)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function saveHome(coords: Coords | null): void {
  try {
    if (coords) window.localStorage.setItem(HOME_KEY, JSON.stringify(coords));
    else window.localStorage.removeItem(HOME_KEY);
  } catch {
    // Storage blocked: the home suggestion just won't appear.
  }
}
