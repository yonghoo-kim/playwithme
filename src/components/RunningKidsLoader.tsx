import type { CSSProperties } from "react";

// Loading animation: five kids — girls and boys, different skin tones and
// hair — chasing a bouncing ball across the screen while clouds and the
// ground drift backwards. Pure CSS (globals.css,
// .rk-*), so it also stops cleanly for reduced motion. Decorative: pair it
// with visible text.

type Hair = "short" | "curly" | "pigtails" | "bob" | "puffs";

interface KidLook {
  skin: string;
  hair: string;
  hairStyle: Hair;
  /** Top colour; `dress` draws a skirt instead of shorts. */
  outfit: string;
  dress?: boolean;
}

const KIDS: KidLook[] = [
  { skin: "#F9DCC4", hair: "#5B3A29", hairStyle: "pigtails", outfit: "#FF8FB1", dress: true },
  { skin: "#8D5524", hair: "#1F1A17", hairStyle: "curly", outfit: "#7FC8FF" },
  { skin: "#E0AC69", hair: "#22201E", hairStyle: "bob", outfit: "#FFC93C", dress: true },
  { skin: "#F1C27D", hair: "#E2B84F", hairStyle: "short", outfit: "#9BE08F" },
  { skin: "#B5763F", hair: "#2B1D14", hairStyle: "puffs", outfit: "#B79CFF" },
];

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

function Runner({ look }: { look: KidLook }) {
  return (
    <g className="rk-bob">
      <rect className="rk-leg" x="-3" y="-5" width="4" height="10" rx="2" fill="#5B6B8C" />
      <rect className="rk-leg rk-alt" x="-1" y="-5" width="4" height="10" rx="2" fill="#4A5878" />
      <rect className="rk-arm rk-alt" x="-2" y="-14" width="3.5" height="10" rx="1.75" fill={look.skin} />
      {look.dress ? (
        <path d="M-7 -14 H7 L9 -1 H-9Z" fill={look.outfit} />
      ) : (
        <rect x="-7" y="-14" width="14" height="11" rx="4" fill={look.outfit} />
      )}
      <rect className="rk-arm" x="-1" y="-14" width="3.5" height="10" rx="1.75" fill={look.skin} />
      <circle cx="1" cy="-24" r="10" fill={look.skin} />
      <HairShape style={look.hairStyle} color={look.hair} />
      <circle cx="5" cy="-23" r="1.4" fill="#2A1E17" />
      <path d="M3 -19 Q6 -16 9 -19" fill="#E2557A" />
      <circle cx="8.5" cy="-20" r="2" fill="#FF9DB5" opacity="0.8" />
    </g>
  );
}

export default function RunningKidsLoader({
  className = "h-28 w-56",
}: {
  className?: string;
}) {
  return (
    <svg viewBox="0 0 240 112" className={className} aria-hidden>
      {/* Clouds and ground marks drift backwards, so the run feels fast. */}
      <g className="rk-cloud" style={{ animationDuration: "7s" }}>
        <g fill="#fff" opacity="0.9">
          <ellipse cx="0" cy="18" rx="16" ry="6" />
          <ellipse cx="10" cy="14" rx="10" ry="6" />
        </g>
      </g>
      <g
        className="rk-cloud"
        style={{ animationDuration: "10s", animationDelay: "-5s" }}
      >
        <g fill="#fff" opacity="0.75">
          <ellipse cx="0" cy="34" rx="11" ry="4.5" />
          <ellipse cx="7" cy="31" rx="7" ry="4.5" />
        </g>
      </g>

      <ellipse cx="120" cy="104" rx="116" ry="7" fill="#7BD88F" />
      <g className="rk-ground">
        {Array.from({ length: 9 }, (_, i) => (
          <rect key={i} x={10 + i * 36} y="104" width="10" height="2.5" rx="1.25" fill="#4FAF66" />
        ))}
      </g>

      {/* Ball: runs ahead of everyone (most negative delay) and bounces. */}
      <g
        className="rk-run"
        style={{ animationDelay: "-1s", "--rk-x": "200px" } as CSSProperties}
      >
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
              animationDelay: `${-0.78 + i * 0.16}s`,
              "--rk-x": `${170 - i * 30}px`,
            } as CSSProperties
          }
        >
          <g transform={`translate(0 ${99 + (i % 2) * 4}) scale(0.85)`}>
            <Runner look={look} />
          </g>
        </g>
      ))}
    </svg>
  );
}
