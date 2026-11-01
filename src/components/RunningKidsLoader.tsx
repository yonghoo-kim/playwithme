import type { CSSProperties } from "react";

// Loading animation: five kids — girls and boys, different skin tones and
// hair — dashing after a bouncing ball (우다다다): quick legs and arms, a
// forward lean with heads up and big grins, a fast bob, and dust puffs
// kicked up behind their feet while
// clouds and the ground drift backwards. Pure CSS transforms/opacity
// (globals.css, .rk-*), so it also stops cleanly for reduced motion (a still
// mid-stride picture). Decorative: pair it with visible text.

type Hair = "short" | "curly" | "pigtails" | "bob" | "puffs";

interface KidLook {
  skin: string;
  hair: string;
  hairStyle: Hair;
  /** Top colour; `dress` draws a skirt (and bare legs) instead of shorts. */
  outfit: string;
  dress?: boolean;
  /** One stride, in seconds — each kid a little different so it isn't mechanical. */
  step: number;
  /** Slow forward/back jostle inside the pack, in seconds. */
  surge: number;
}

const KIDS: KidLook[] = [
  { skin: "#F9DCC4", hair: "#5B3A29", hairStyle: "pigtails", outfit: "#FF8FB1", dress: true, step: 0.14, surge: 1.3 },
  { skin: "#8D5524", hair: "#1F1A17", hairStyle: "curly", outfit: "#7FC8FF", step: 0.12, surge: 1.7 },
  { skin: "#E0AC69", hair: "#22201E", hairStyle: "bob", outfit: "#FFC93C", dress: true, step: 0.15, surge: 1.1 },
  { skin: "#F1C27D", hair: "#E2B84F", hairStyle: "short", outfit: "#9BE08F", step: 0.13, surge: 1.5 },
  { skin: "#B5763F", hair: "#2B1D14", hairStyle: "puffs", outfit: "#B79CFF", dress: true, step: 0.16, surge: 1.9 },
];

/** Gap between kids in the pack, as a slice of the 2s run (.rk-run in globals.css). */
const GAP_S = 0.15;
// Sandy dust: dark enough to read over both the grass and the sky.
const DUST_COLORS = ["#E3CFA8", "#D6C09A", "#EEDFC2", "#CDB68D", "#E8D6B4"];
const PUFFS = 5;

function HairShape({ style, color }: { style: Hair; color: string }) {
  switch (style) {
    case "curly":
      return (
        <g fill={color}>
          {[-8, -3, 2, 7].map((x) => (
            <circle key={x} cx={x + 1} cy={-31} r={4.2} />
          ))}
          <circle cx={-8} cy={-26} r={3.5} />
        </g>
      );
    case "pigtails":
      return (
        <g fill={color}>
          <path d="M-9 -26 Q-8 -36 1 -35 Q10 -36 11 -26 Q5 -31 -9 -26Z" />
          <circle cx={-11} cy={-22} r={4} />
          <circle cx={13} cy={-22} r={4} />
        </g>
      );
    case "bob":
      return (
        <path
          d="M-10 -18 Q-12 -36 1 -35 Q14 -36 12 -18 L9 -18 Q10 -28 1 -29 Q-7 -28 -6 -18Z"
          fill={color}
        />
      );
    case "puffs":
      return (
        <g fill={color}>
          <path d="M-9 -26 Q-8 -35 1 -34 Q10 -35 11 -26 Q5 -30 -9 -26Z" />
          <circle cx={-8} cy={-35} r={5} />
          <circle cx={10} cy={-35} r={5} />
        </g>
      );
    default:
      return (
        <path d="M-9 -26 Q-8 -36 1 -35 Q10 -36 11 -26 Q5 -31 -9 -26Z" fill={color} />
      );
  }
}

/** A leg with a little shoe; swings from the hip. */
function Leg({ fill, alt }: { fill: string; alt?: boolean }) {
  return (
    <g className={alt ? "rk-leg rk-alt" : "rk-leg"}>
      <rect x={alt ? -1 : -3} y="-5" width="4" height="9" rx="2" fill={fill} />
      <ellipse cx={alt ? 2 : 0} cy="4.2" rx="3.2" ry="1.8" fill="#3D4660" />
    </g>
  );
}

function Runner({ look }: { look: KidLook }) {
  const legFill = look.dress ? look.skin : "#5B6B8C";
  const backLeg = look.dress ? look.skin : "#4A5878";
  return (
    <g className="rk-bob">
      <Leg fill={legFill} />
      <Leg fill={backLeg} alt />
      <rect className="rk-arm rk-alt" x="-2" y="-14" width="3.5" height="10" rx="1.75" fill={look.skin} />
      {look.dress ? (
        <path d="M-7 -14 H7 L9 -1 H-9Z" fill={look.outfit} />
      ) : (
        <rect x="-7" y="-14" width="14" height="11" rx="4" fill={look.outfit} />
      )}
      <rect className="rk-arm" x="-1" y="-14" width="3.5" height="10" rx="1.75" fill={look.skin} />
      {/* Head held up: undo the body's 10° lean at the neck and tip the
          chin a touch higher, so they look ahead while they dash. */}
      <g transform="rotate(-14 1 -14)">
        <circle cx="1" cy="-24" r="10" fill={look.skin} />
        <HairShape style={look.hairStyle} color={look.hair} />
        {/* Happy ^ eye. */}
        <path
          d="M3.8 -23.6 Q5.2 -26.2 6.6 -23.6"
          stroke="#2A1E17"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="2.6" cy="-19.6" r="2" fill="#FF9DB5" opacity="0.85" />
        {/* Big open grin with teeth and a little tongue. */}
        <path d="M4.5 -20 L10.2 -20.6 Q9.6 -15 6.6 -15.5 Q4.6 -16.1 4.5 -20Z" fill="#B8345A" />
        <path d="M5 -19.9 L9.9 -20.4 L9.8 -19.1 L5.1 -18.7Z" fill="#fff" />
        <ellipse cx="7.3" cy="-16.5" rx="1.9" ry="1.1" fill="#FF8FA3" />
      </g>
    </g>
  );
}

/**
 * Dust kicked up at the heels: puffs spawn at the feet, drift back and up,
 * grow and fade. Staggered negative delays keep the trail continuous.
 * --rk-still-* place them as a small static cloud for reduced motion.
 */
function Dust({ index }: { index: number }) {
  const dur = 0.7 + (index % 3) * 0.06;
  return (
    <g>
      {Array.from({ length: PUFFS }, (_, j) => (
        <circle
          key={j}
          className={j % 2 ? "rk-dust rk-dust-low" : "rk-dust"}
          cx={-3}
          cy={j % 2 ? 4 : 3}
          r={j % 2 ? 3.4 : 4.2}
          fill={DUST_COLORS[(j + index) % DUST_COLORS.length]}
          style={
            {
              animationDuration: `${dur}s`,
              animationDelay: `${-((j * dur) / PUFFS + index * 0.07).toFixed(2)}s`,
              "--rk-still-x": `${-5 - j * 6}px`,
              "--rk-still-y": `${-j}px`,
              "--rk-still-s": `${0.7 + j * 0.25}`,
              "--rk-still-o": `${(0.85 - j * 0.15).toFixed(2)}`,
            } as CSSProperties
          }
        />
      ))}
    </g>
  );
}

/** Two short streaks behind the body. */
function SpeedLines({ index }: { index: number }) {
  return (
    <g stroke="#fff" strokeWidth="1.6" strokeLinecap="round">
      {[-15, -7].map((y, j) => (
        <path
          key={y}
          className="rk-zip"
          d={`M${-19 + j * 3} ${y} H${-12 + j * 3}`}
          style={{ animationDelay: `${-(j * 0.17 + index * 0.05).toFixed(2)}s` }}
        />
      ))}
    </g>
  );
}

export default function RunningKidsLoader({
  className = "w-full max-w-md",
}: {
  className?: string;
}) {
  const ballDelay = -0.85;
  return (
    <svg viewBox="0 0 240 112" className={className} aria-hidden>
      {/* Clouds and ground marks drift backwards, so the run feels fast. */}
      <g className="rk-cloud" style={{ animationDuration: "5s" }}>
        <g fill="#fff" opacity="0.9">
          <ellipse cx="0" cy="18" rx="16" ry="6" />
          <ellipse cx="10" cy="14" rx="10" ry="6" />
        </g>
      </g>
      <g
        className="rk-cloud"
        style={{ animationDuration: "7s", animationDelay: "-3.5s" }}
      >
        <g fill="#fff" opacity="0.75">
          <ellipse cx="0" cy="34" rx="11" ry="4.5" />
          <ellipse cx="7" cy="31" rx="7" ry="4.5" />
        </g>
      </g>

      {/* Wide ground from edge to edge, like the playground background. */}
      <path d="M0 99 C60 94 170 95 240 98 L240 112 L0 112Z" fill="#7BD88F" />
      <path d="M0 107 C80 104 170 105 240 107 L240 112 L0 112Z" fill="#5BC274" />
      <g className="rk-ground">
        {Array.from({ length: 9 }, (_, i) => (
          <rect key={i} x={10 + i * 36} y="102" width="10" height="2.5" rx="1.25" fill="#4FAF66" />
        ))}
      </g>

      {/* Ball: runs ahead of everyone (most negative delay) and bounces,
          with a little puff each time it lands. */}
      <g
        className="rk-run"
        style={{ animationDelay: `${ballDelay}s`, "--rk-x": "200px" } as CSSProperties}
      >
        <ellipse
          className="rk-dust rk-dust-low"
          cx="-2"
          cy="102"
          rx="5"
          ry="2.6"
          fill={DUST_COLORS[0]}
          style={{ animationDuration: "0.6s" }}
        />
        <g className="rk-ball">
          <circle cx="0" cy="96" r="7" fill="#E2557A" />
          <path d="M-7 96 H7 M0 89 V103" stroke="#fff" strokeWidth="1.3" />
        </g>
      </g>

      {KIDS.map((look, i) => (
        <g
          key={i}
          className="rk-run"
          style={
            {
              animationDelay: `${(ballDelay + 0.2 + i * GAP_S).toFixed(2)}s`,
              "--rk-x": `${170 - i * 30}px`,
              "--rk-step": `${look.step}s`,
              "--rk-bob": `${look.step / 2}s`,
              "--rk-surge": `${look.surge}s`,
            } as CSSProperties
          }
        >
          <g className="rk-surge" style={{ animationDelay: `${-i * 0.4}s` }}>
            <g transform={`translate(0 ${99 + (i % 2) * 4}) scale(0.85)`}>
              <Dust index={i} />
              <SpeedLines index={i} />
              {/* Body leans into the run, pivoting at the feet (the head
                  counter-rotates in Runner). */}
              <g transform="rotate(10 0 4)">
                <Runner look={look} />
              </g>
            </g>
          </g>
        </g>
      ))}
    </svg>
  );
}
