import type { WeatherSummary } from "./weather";

// The last weather this phone received, so the next app open (and every
// loading screen) starts with the right sky instead of flashing clear first.
const CACHE_KEY = "playwithme_weather";
const MAX_AGE_MS = 60 * 60_000;

interface CachedWeather extends WeatherSummary {
  at: number;
}

/** Sets <html data-weather / data-wx-level>; null clears both. */
export function applyWeather(weather: WeatherSummary | null): void {
  const root = document.documentElement;
  if (!weather) {
    delete root.dataset.weather;
    delete root.dataset.wxLevel;
    return;
  }
  root.dataset.weather = weather.condition;
  if (weather.level) root.dataset.wxLevel = weather.level;
  else delete root.dataset.wxLevel;
}

/** Last weather if it is under an hour old. */
export function readCachedWeather(): WeatherSummary | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    const cached = raw ? (JSON.parse(raw) as CachedWeather) : null;
    if (!cached || Date.now() - cached.at > MAX_AGE_MS) return null;
    return {
      temp: cached.temp,
      condition: cached.condition,
      level: cached.level ?? null,
    };
  } catch {
    return null;
  }
}

export function saveCachedWeather(weather: WeatherSummary): void {
  try {
    const cached: CachedWeather = { ...weather, at: Date.now() };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch {
    // Storage blocked: the sky just catches up after the fetch.
  }
}

/**
 * Inline <head> script: applies the cached weather before first paint.
 * Mirrors readCachedWeather() + applyWeather() above.
 */
export const WEATHER_CACHE_SCRIPT = `(function(){try{var c=JSON.parse(localStorage.getItem(${JSON.stringify(CACHE_KEY)})||"null");if(!c||Date.now()-c.at>${MAX_AGE_MS})return;var r=document.documentElement;r.dataset.weather=c.condition;if(c.level)r.dataset.wxLevel=c.level}catch(e){}})();`;
