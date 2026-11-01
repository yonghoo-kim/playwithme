import type { DayPhase } from "./dayPhase";

type SkyWeather = "clear" | "cloudy" | "rain" | "snow";

// Top edge of each sky (globals.css .pg-<phase>) with the weather tint
// (.pg-w-tint-*) composited over it. "partly" keeps the clear sky.
const SKY_TOP: Record<DayPhase, Record<SkyWeather, string>> = {
  morning: { clear: "#ffd9c7", cloudy: "#bac4d1", rain: "#99a9bd", snow: "#c8d3e2" },
  day: { clear: "#9ddcff", cloudy: "#b2c4d6", rain: "#94a9c0", snow: "#c0d3e6" },
  evening: { clear: "#ffb59e", cloudy: "#bac1ce", rain: "#99a7ba", snow: "#c8d0df" },
  night: { clear: "#4b4e9c", cloudy: "#363b62", rain: "#292e47", snow: "#3d446d" },
};

export function skyTopColor(phase: string | undefined, weather: string | undefined): string {
  const row = SKY_TOP[(phase as DayPhase) in SKY_TOP ? (phase as DayPhase) : "day"];
  return row[(weather as SkyWeather) in row ? (weather as SkyWeather) : "clear"];
}

/**
 * Paints the phone's status bar / browser chrome with the current sky:
 * meta theme-color (Android, older iOS) and the <html> background, which
 * newer iOS Safari samples instead of theme-color.
 */
export function applySkyChrome(): void {
  const root = document.documentElement;
  const color = skyTopColor(root.dataset.phase, root.dataset.weather);
  root.style.backgroundColor = color;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
}

/** Inline <head> script, run after the phase and weather scripts. Mirrors applySkyChrome(). */
export const SKY_CHROME_SCRIPT = `(function(){try{var t=${JSON.stringify(SKY_TOP)},r=document.documentElement,p=t[r.dataset.phase]||t.day,c=p[r.dataset.weather]||p.clear;r.style.backgroundColor=c;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",c)}catch(e){}})();`;
