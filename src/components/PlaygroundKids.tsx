"use client";

import { useEffect, useState } from "react";

const SKIN = {
  light: "#FFE6D5",
  tan: "#F3CFA6",
  dark: "#8D5A3B",
} as const;

const HAIR = {
  blonde: "#E8C25A",
  brown: "#8B5A2B",
  black: "#2E2A28",
  darkBlack: "#1A1412",
} as const;

// One cartoon kid, feet at (0, 0).
function Kid({
  shirt,
  hair,
  skin,
  scale = 1,
  armsUp = false,
  girl = false,
}: {
  shirt: string;
  hair: string;
  skin: keyof typeof SKIN;
  scale?: number;
  armsUp?: boolean;
  /** Pigtails with bows and a skirt. */
  girl?: boolean;
}) {
  const armY = armsUp ? -20 : -4;
  const skinFill = SKIN[skin];
  const eye = skin === "dark" ? "#120C0A" : "#3A2A20";
  return (
    <g transform={`scale(${scale})`}>
      <rect x="-6" y="-3" width="4" height="7" rx="2" fill={girl ? skinFill : "#5B6B8C"} />
      <rect x="2" y="-3" width="4" height="7" rx="2" fill={girl ? skinFill : "#5B6B8C"} />
      <path d={`M-7 -10 L-13 ${armY}`} stroke={skinFill} strokeWidth="3" strokeLinecap="round" />
      <path d={`M7 -10 L13 ${armY}`} stroke={skinFill} strokeWidth="3" strokeLinecap="round" />
      <rect x="-7" y="-13" width="14" height="11" rx="4" fill={shirt} />
      {girl && <path d="M-6 -7 L6 -7 L10 1 L-10 1Z" fill={shirt} />}
      {girl && (
        <>
          <circle cx="-11" cy="-21" r="4.5" fill={hair} />
          <circle cx="11" cy="-21" r="4.5" fill={hair} />
          <circle cx="-9.5" cy="-27" r="2.2" fill="#FF5C8A" />
          <circle cx="9.5" cy="-27" r="2.2" fill="#FF5C8A" />
        </>
      )}
      <circle cx="0" cy="-23" r="10" fill={skinFill} />
      <path d="M-10 -25 Q-9 -35 0 -34 Q9 -35 10 -25 Q4 -30 -10 -25Z" fill={hair} />
      <circle cx="-3.5" cy="-22" r="1.4" fill={eye} />
      <circle cx="3.5" cy="-22" r="1.4" fill={eye} />
      <path d="M-3.5 -18 Q0 -14 3.5 -18" fill="#E2557A" />
      <circle cx="-6.5" cy="-18.5" r="2" fill="#FF9DB5" />
      <circle cx="6.5" cy="-18.5" r="2" fill="#FF9DB5" />
    </g>
  );
}

const ease = { calcMode: "spline", keyTimes: "0;0.5;1", keySplines: "0.45 0 0.55 1;0.45 0 0.55 1" };

/** Small up-and-down bob, used for running / patting kids. */
function Bob({ dur, dy, begin = "0s" }: { dur: string; dy: number; begin?: string }) {
  return (
    <animateTransform
      attributeName="transform"
      type="translate"
      values={`0 0;0 ${dy};0 0`}
      dur={dur}
      begin={begin}
      repeatCount="indefinite"
    />
  );
}

/**
 * Landing-only playground: small kids playing on the background's front hill
 * (a kid on the existing slide, one on a swing, two on a seesaw, one in the
 * sandbox, one jumping, and two running after a ball). Each piece is a tiny
 * SVG drawn at 1 unit = 1px and anchored to the hill's surface height in CSS
 * (.pg-kid-* in globals.css), so the background itself is untouched. With
 * reduced motion the same scene is drawn still.
 */
export default function PlaygroundKids() {
  const [still, setStill] = useState(false);

  useEffect(() => {
    setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  return (
    <div aria-hidden className="pg-kids">
      {/* A kid climbing and sliding down the background's slide (same box as .pg-slide). */}
      <svg viewBox="0 0 80 70" width="80" height="70" className="pg-kid-slide">
        <g transform={still ? "translate(33 8)" : undefined}>
          <Kid shirt="#7FC8FF" hair={HAIR.blonde} skin="light" scale={0.64} armsUp />
          {!still && (
            <animateMotion
              dur="3.4s"
              repeatCount="indefinite"
              path="M19.5 58 L19.5 8 L33 8 C46 8 52 52 76 54 L78 54"
              keyPoints="0;0.375;0.476;0.476;1;1"
              keyTimes="0;0.32;0.42;0.5;0.78;1"
              calcMode="linear"
            />
          )}
        </g>
      </svg>

      {/* Swing set. */}
      <svg viewBox="0 0 76 66" width="76" height="66" className="pg-kid-swing">
        <path d="M6 66 L17 6 M70 66 L59 6" stroke="#B79CFF" strokeWidth="3.5" strokeLinecap="round" />
        <rect x="11" y="3" width="54" height="5" rx="2.5" fill="#8B6FE0" />
        <g>
          <line x1="31" y1="6" x2="31" y2="44" stroke="#8C6A4F" strokeWidth="1.2" />
          <line x1="45" y1="6" x2="45" y2="44" stroke="#8C6A4F" strokeWidth="1.2" />
          <rect x="28" y="43" width="20" height="3.5" rx="1.75" fill="#FFC93C" />
          <g transform="translate(38 44)">
            <Kid shirt="#FF8FB1" hair={HAIR.darkBlack} skin="dark" scale={0.66} armsUp girl />
          </g>
          {!still && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="-28 38 6;28 38 6;-28 38 6"
              dur="1.6s"
              repeatCount="indefinite"
              {...ease}
            />
          )}
        </g>
      </svg>

      {/* Seesaw. */}
      <svg viewBox="0 -16 84 56" width="84" height="56" className="pg-kid-seesaw">
        <path d="M34 40 L42 27 L50 40Z" fill="#8B6FE0" />
        <g>
          <rect x="2" y="25" width="80" height="5" rx="2.5" fill="#FF7FA8" />
          <g transform="translate(10 25)">
            <Kid shirt="#9BE08F" hair={HAIR.darkBlack} skin="dark" scale={0.64} armsUp />
          </g>
          <g transform="translate(74 25)">
            <Kid shirt="#FFC93C" hair={HAIR.black} skin="tan" scale={0.64} armsUp girl />
          </g>
          {!still && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="-14 42 27.5;14 42 27.5;-14 42 27.5"
              dur="1.8s"
              repeatCount="indefinite"
              {...ease}
            />
          )}
        </g>
      </svg>

      {/* Sandbox: a kid digging next to a little sandcastle. */}
      <svg viewBox="0 0 52 30" width="52" height="30" className="pg-kid-sand">
        <rect x="1" y="16" width="50" height="8" rx="3" fill="#B97A48" />
        <ellipse cx="26" cy="21" rx="23" ry="4" fill="#F6D98B" />
        <g>
          <g transform="translate(18 25)">
            <Kid shirt="#FF9F6B" hair={HAIR.brown} skin="light" scale={0.62} girl />
          </g>
          <g transform="translate(26 22.5)">
            <path d="M0 0 L5 6" stroke="#4A90D9" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M3.5 5 L7.5 4 L7 8.5Z" fill="#4A90D9" />
            {!still && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 0 0;-30 0 0;0 0 0"
                dur="0.9s"
                repeatCount="indefinite"
                additive="sum"
              />
            )}
          </g>
          {!still && <Bob dur="0.9s" dy={1.2} />}
        </g>
        <path d="M36 21 L36 13 L39 13 L39 15 L41 15 L41 13 L44 13 L44 21Z" fill="#E8C26E" />
        <path d="M40 13 L40 8 M40 8 L43.5 9.5 L40 11" stroke="#E2557A" strokeWidth="1" fill="#E2557A" />
        <rect x="1" y="22" width="50" height="7" rx="3" fill="#C98B55" />
      </svg>

      {/* Jumping kid with a little shadow. */}
      <svg viewBox="-14 -44 28 48" width="28" height="48" className="pg-kid-jump">
        <ellipse cx="0" cy="2" rx="7" ry="1.6" fill="#1F2937" opacity="0.15">
          {!still && (
            <animate attributeName="rx" values="7;4;7" dur="0.8s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.3 0 0.4 1;0.6 0 0.7 1" />
          )}
        </ellipse>
        <g>
          <Kid shirt="#B79CFF" hair={HAIR.black} skin="tan" scale={0.7} armsUp />
          {!still && (
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0;0 -14;0 0"
              dur="0.8s"
              repeatCount="indefinite"
              calcMode="spline"
              keyTimes="0;0.5;1"
              keySplines="0.3 0 0.4 1;0.6 0 0.7 1"
            />
          )}
        </g>
      </svg>

      {/* Two kids running across the front, one dribbling a ball. */}
      <div className="pg-kid-run">
        <svg viewBox="-12 -28 72 32" width="72" height="32">
          <g>
            <Kid shirt="#7BD88F" hair={HAIR.black} skin="tan" scale={0.7} />
            {!still && <Bob dur="0.36s" dy={-2} begin="-0.18s" />}
          </g>
          <g transform="translate(30 0)">
            <g>
              <Kid shirt="#FF7FA8" hair={HAIR.blonde} skin="light" scale={0.7} girl />
              {!still && <Bob dur="0.36s" dy={-2} />}
            </g>
          </g>
          <g transform={`translate(45 ${still ? -4 : 0})`}>
            <circle r="4.5" fill="#E2557A">
              {!still && (
                <animate
                  attributeName="cy"
                  values="-2;-14;-2"
                  dur="0.72s"
                  repeatCount="indefinite"
                  calcMode="spline"
                  keyTimes="0;0.5;1"
                  keySplines="0.2 0.6 0.4 1;0.6 0 0.8 0.4"
                />
              )}
            </circle>
          </g>
        </svg>
      </div>
    </div>
  );
}
