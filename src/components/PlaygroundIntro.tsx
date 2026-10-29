"use client";

import { useEffect, useState } from "react";

const SKIN = "#FFD7B5";

// One cartoon kid, feet at (0, 0).
function Kid({
  shirt,
  hair,
  scale = 1,
  armsUp = false,
}: {
  shirt: string;
  hair: string;
  scale?: number;
  armsUp?: boolean;
}) {
  const armY = armsUp ? -20 : -4;
  return (
    <g transform={`scale(${scale})`}>
      <rect x="-6" y="-3" width="4" height="7" rx="2" fill="#5B6B8C" />
      <rect x="2" y="-3" width="4" height="7" rx="2" fill="#5B6B8C" />
      <path d={`M-7 -10 L-13 ${armY}`} stroke={SKIN} strokeWidth="3" strokeLinecap="round" />
      <path d={`M7 -10 L13 ${armY}`} stroke={SKIN} strokeWidth="3" strokeLinecap="round" />
      <rect x="-7" y="-13" width="14" height="11" rx="4" fill={shirt} />
      <circle cx="0" cy="-23" r="10" fill={SKIN} />
      <path d="M-10 -25 Q-9 -35 0 -34 Q9 -35 10 -25 Q4 -30 -10 -25Z" fill={hair} />
      <circle cx="-3.5" cy="-22" r="1.4" fill="#3A2A20" />
      <circle cx="3.5" cy="-22" r="1.4" fill="#3A2A20" />
      <path d="M-3.5 -18 Q0 -14 3.5 -18" fill="#E2557A" />
      <circle cx="-6.5" cy="-18.5" r="2" fill="#FF9DB5" />
      <circle cx="6.5" cy="-18.5" r="2" fill="#FF9DB5" />
    </g>
  );
}

const ease = { calcMode: "spline", keyTimes: "0;0.5;1", keySplines: "0.45 0 0.55 1;0.45 0 0.55 1" };

/**
 * First screen: a busy playground — a kid sliding, one swinging, two on the
 * seesaw, one dribbling a ball across, one jumping. SMIL keeps each motion
 * self-contained; with reduced motion the same scene is drawn still.
 */
export default function PlaygroundIntro() {
  const [still, setStill] = useState(false);

  useEffect(() => {
    setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  return (
    <svg
      viewBox="0 0 300 220"
      className="w-full max-w-sm overflow-hidden rounded-3xl border-4 border-gray-800 shadow-[4px_4px_0px_rgba(31,41,55,0.25)]"
      role="img"
      aria-label="아이들이 놀이터에서 신나게 놀고 있어요"
    >
      <defs>
        <linearGradient id="intro-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9DDCFF" />
          <stop offset="1" stopColor="#E3F6FF" />
        </linearGradient>
      </defs>
      <rect width="300" height="220" fill="url(#intro-sky)" />

      <ellipse cx="60" cy="34" rx="24" ry="10" fill="#fff" opacity="0.9">
        {!still && <animate attributeName="cx" values="60;100;60" dur="9s" repeatCount="indefinite" />}
      </ellipse>
      <ellipse cx="200" cy="52" rx="18" ry="8" fill="#fff" opacity="0.8">
        {!still && <animate attributeName="cx" values="200;170;200" dur="11s" repeatCount="indefinite" />}
      </ellipse>

      <path d="M0 160 C80 140 170 146 300 156 L300 220 L0 220Z" fill="#7BD88F" />
      <path d="M0 190 C90 176 200 180 300 188 L300 220 L0 220Z" fill="#5BC274" />

      {/* Slide */}
      <rect x="22" y="88" width="4" height="72" rx="2" fill="#F48FB1" />
      <rect x="36" y="88" width="4" height="72" rx="2" fill="#F48FB1" />
      {[108, 126, 144].map((y) => (
        <rect key={y} x="24" y={y} width="14" height="3" rx="1.5" fill="#F48FB1" />
      ))}
      <rect x="18" y="84" width="40" height="6" rx="3" fill="#FF7FA8" />
      <path d="M56 88 C78 88 92 156 118 158" fill="none" stroke="#FFC93C" strokeWidth="8" strokeLinecap="round" />
      <g transform={still ? "translate(56 84)" : undefined}>
        <Kid shirt="#7FC8FF" hair="#5B3A29" scale={0.8} armsUp />
        {!still && (
          <animateMotion
            dur="2.6s"
            repeatCount="indefinite"
            path="M31 160 L31 84 L56 84 C78 84 92 152 118 154"
            keyPoints="0;0.5;0.5;1;1"
            keyTimes="0;0.4;0.5;0.8;1"
            calcMode="linear"
          />
        )}
      </g>

      {/* Swing */}
      <path d="M132 160 L144 80 M196 160 L184 80" stroke="#B79CFF" strokeWidth="4" strokeLinecap="round" />
      <rect x="138" y="76" width="52" height="6" rx="3" fill="#8B6FE0" />
      <g>
        <line x1="156" y1="80" x2="156" y2="130" stroke="#8C6A4F" strokeWidth="1.5" />
        <line x1="172" y1="80" x2="172" y2="130" stroke="#8C6A4F" strokeWidth="1.5" />
        <rect x="152" y="129" width="24" height="4" rx="2" fill="#FFC93C" />
        <g transform="translate(164 130)">
          <Kid shirt="#FF8FB1" hair="#2E2A28" scale={0.75} armsUp />
        </g>
        {!still && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="-35 164 80;35 164 80;-35 164 80"
            dur="1.4s"
            repeatCount="indefinite"
            {...ease}
          />
        )}
      </g>

      {/* Seesaw */}
      <path d="M238 164 L246 152 L254 164Z" fill="#8B6FE0" />
      <g>
        <rect x="210" y="148" width="72" height="5" rx="2.5" fill="#FF7FA8" />
        <g transform="translate(216 148)">
          <Kid shirt="#9BE08F" hair="#5B3A29" scale={0.65} armsUp />
        </g>
        <g transform="translate(276 148)">
          <Kid shirt="#FFC93C" hair="#2E2A28" scale={0.65} armsUp />
        </g>
        {!still && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="-14 246 150;14 246 150;-14 246 150"
            dur="1.6s"
            repeatCount="indefinite"
            {...ease}
          />
        )}
      </g>

      {/* Kid dribbling a ball across */}
      <g transform={still ? "translate(70 0)" : undefined}>
        <g transform="translate(0 200)">
          <Kid shirt="#FF9F6B" hair="#5B3A29" scale={0.75} />
        </g>
        {!still && (
          <animateTransform attributeName="transform" type="translate" values="-20 0;320 0" dur="4s" repeatCount="indefinite" />
        )}
      </g>
      <g transform={still ? "translate(88 196)" : undefined}>
        <circle r="6" fill="#E2557A" />
        <path d="M-6 0 H6 M0 -6 V6" stroke="#fff" strokeWidth="1.2" />
        {!still && (
          <animateMotion
            dur="4s"
            repeatCount="indefinite"
            path="M5 194 Q25 169 45 194 Q65 169 85 194 Q105 169 125 194 Q145 169 165 194 Q185 169 205 194 Q225 169 245 194 Q265 169 285 194 Q305 169 340 194"
          />
        )}
      </g>

      {/* Jumping kid */}
      <g>
        <g transform="translate(118 200)">
          <Kid shirt="#B79CFF" hair="#2E2A28" scale={0.75} armsUp />
        </g>
        {!still && (
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0 0;0 -26;0 0"
            dur="0.7s"
            repeatCount="indefinite"
            calcMode="spline"
            keyTimes="0;0.5;1"
            keySplines="0.3 0 0.4 1;0.6 0 0.7 1"
          />
        )}
      </g>
    </svg>
  );
}
