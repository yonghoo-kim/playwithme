export type DayPhase = "morning" | "day" | "evening" | "night";

// Start hour of each phase (local time on the viewer's phone).
const MORNING = 5;
const DAY = 9;
const EVENING = 17;
const NIGHT = 20;

export function dayPhase(hour: number): DayPhase {
  if (hour >= NIGHT || hour < MORNING) return "night";
  if (hour < DAY) return "morning";
  if (hour < EVENING) return "day";
  return "evening";
}

/** Status-bar / browser chrome color per phase (top of each sky). */
export const PHASE_THEME_COLOR: Record<DayPhase, string> = {
  morning: "#FFD9C7",
  day: "#9DDCFF",
  evening: "#FFB59E",
  night: "#A9A6E8",
};

/**
 * Inline <head> script: sets <html data-phase> and the theme-color before
 * first paint so the background never flashes the wrong sky. Mirrors
 * dayPhase() above.
 */
export const DAY_PHASE_SCRIPT = `(function(){try{var h=new Date().getHours(),p=h>=${NIGHT}||h<${MORNING}?"night":h<${DAY}?"morning":h<${EVENING}?"day":"evening";document.documentElement.dataset.phase=p;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",${JSON.stringify(PHASE_THEME_COLOR)}[p])}catch(e){}})();`;
