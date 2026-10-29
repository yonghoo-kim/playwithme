"use client";

import { useEffect } from "react";
import { dayPhase, PHASE_THEME_COLOR } from "@/lib/dayPhase";

function applyCurrentPhase() {
  const phase = dayPhase(new Date().getHours());
  const root = document.documentElement;
  if (root.dataset.phase === phase) return;
  root.dataset.phase = phase;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", PHASE_THEME_COLOR[phase]);
}

function Cloud({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 120 60" className={className}>
      <g fill="white" opacity="0.9">
        <ellipse cx="40" cy="38" rx="28" ry="18" />
        <ellipse cx="68" cy="30" rx="26" ry="22" />
        <ellipse cx="90" cy="40" rx="22" ry="15" />
        <rect x="20" y="38" width="88" height="17" rx="8.5" />
      </g>
    </svg>
  );
}

function Sun({ color, rays }: { color: string; rays: boolean }) {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full">
      {rays && (
        <g
          className="pg-spin"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
        >
          {Array.from({ length: 8 }, (_, i) => (
            <line
              key={i}
              x1="60"
              y1="14"
              x2="60"
              y2="24"
              transform={`rotate(${i * 45} 60 60)`}
            />
          ))}
        </g>
      )}
      <circle cx="60" cy="60" r="28" fill={color} />
      <circle cx="50" cy="56" r="3" fill="#7A4A12" />
      <circle cx="70" cy="56" r="3" fill="#7A4A12" />
      <path
        d="M51 66 Q60 74 69 66"
        fill="none"
        stroke="#7A4A12"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="44" cy="66" r="4" fill="#FF9DB5" opacity="0.7" />
      <circle cx="76" cy="66" r="4" fill="#FF9DB5" opacity="0.7" />
    </svg>
  );
}

const STARS: [number, number, number][] = [
  [12, 10, 1],
  [28, 22, 0.7],
  [46, 8, 0.8],
  [60, 26, 0.6],
  [8, 34, 0.6],
  [38, 38, 0.9],
  [92, 36, 0.7],
];

/**
 * Fixed, full-viewport sunny playground behind every page. The sky follows
 * the viewer's local time (morning / day / evening / night); the phase is set
 * on <html data-phase> by an inline head script before paint, and re-checked
 * here every minute and whenever the app comes back to the foreground.
 */
export default function PlaygroundBackground() {
  useEffect(() => {
    applyCurrentPhase();
    const timer = window.setInterval(applyCurrentPhase, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") applyCurrentPhase();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <div aria-hidden className="pg-bg">
      <div className="pg-layer pg-morning">
        <div className="absolute left-[6%] top-[12%] h-24 w-24">
          <Sun color="#FFC56B" rays />
        </div>
        <Cloud className="absolute right-[8%] top-[13%] w-28" />
      </div>

      <div className="pg-layer pg-day">
        {/* Sun / moon sit top-right, just left of the 설정 button. */}
        <div className="absolute right-[max(76px,17%)] top-[1%] h-24 w-24">
          <Sun color="#FFD84D" rays />
        </div>
        <Cloud className="absolute left-[5%] top-[12%] w-28" />
        <Cloud className="absolute right-[8%] top-[24%] w-20 opacity-80" />
      </div>

      <div className="pg-layer pg-evening">
        <div className="pg-low-sun absolute right-[12%] h-28 w-28">
          <Sun color="#FF9F6B" rays={false} />
        </div>
        <Cloud className="absolute left-[8%] top-[10%] w-28 opacity-70" />
      </div>

      <div className="pg-layer pg-night">
        <svg
          viewBox="0 0 100 50"
          preserveAspectRatio="xMidYMin slice"
          className="absolute inset-x-0 top-0 h-1/2 w-full"
        >
          {STARS.map(([x, y, s], i) => (
            <path
              key={i}
              className="pg-twinkle"
              style={{ animationDelay: `${i * 0.6}s` }}
              d="M0 -3 L0.7 -0.7 L3 0 L0.7 0.7 L0 3 L-0.7 0.7 L-3 0 L-0.7 -0.7Z"
              fill="#FFF7D1"
              transform={`translate(${x} ${y}) scale(${s * 0.45})`}
            />
          ))}
        </svg>
        <svg
          viewBox="0 0 120 120"
          className="absolute right-[max(76px,17%)] top-[1%] h-24 w-24"
        >
          <mask id="pg-moon-cut">
            <rect width="120" height="120" fill="white" />
            <circle cx="76" cy="48" r="26" fill="black" />
          </mask>
          <circle
            cx="60"
            cy="60"
            r="30"
            fill="#FFF2B8"
            mask="url(#pg-moon-cut)"
          />
          <path
            d="M40 66 Q44 70 48 66"
            fill="none"
            stroke="#7A6A3A"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="42" cy="76" r="3.5" fill="#FF9DB5" opacity="0.6" />
        </svg>
      </div>

      <svg
        viewBox="0 0 400 120"
        preserveAspectRatio="none"
        className="pg-hills absolute inset-x-0 bottom-0 w-full"
      >
        <path
          className="pg-hill-back"
          d="M0 62 C 80 18, 170 26, 240 56 C 300 82, 350 38, 400 42 L400 120 L0 120 Z"
        />
      </svg>

      <svg viewBox="0 0 80 70" className="pg-slide absolute left-[8%] w-20">
        <rect x="10" y="10" width="5" height="58" rx="2.5" fill="#F48FB1" />
        <rect x="24" y="10" width="5" height="58" rx="2.5" fill="#F48FB1" />
        {[24, 36, 48].map((y) => (
          <rect key={y} x="12" y={y} width="15" height="3.5" rx="1.75" fill="#F48FB1" />
        ))}
        <rect x="7" y="7" width="28" height="7" rx="3.5" fill="#FF7FA8" />
        <path
          d="M33 10 C 46 10, 52 54, 76 56 L76 66 C 48 64, 42 22, 33 20 Z"
          fill="#FFC93C"
        />
      </svg>

      <svg
        viewBox="0 0 400 120"
        preserveAspectRatio="none"
        className="pg-hills absolute inset-x-0 bottom-0 w-full"
      >
        <path
          className="pg-hill-front"
          d="M0 92 C 90 68, 180 74, 260 94 C 320 108, 370 84, 400 86 L400 120 L0 120 Z"
        />
      </svg>
    </div>
  );
}
