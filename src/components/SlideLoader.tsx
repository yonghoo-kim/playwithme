// A kid climbs the ladder and slides down the slide, on a loop (still at
// the top when the viewer prefers reduced motion — see .pg-slider in
// globals.css). Decorative: pair it with visible text.
export default function SlideLoader({ className = "h-36 w-44" }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 170" className={className} aria-hidden>
      <ellipse cx="120" cy="156" rx="105" ry="8" fill="#7BD88F" />
      <rect x="40" y="52" width="5" height="102" rx="2.5" fill="#F48FB1" />
      <rect x="56" y="52" width="5" height="102" rx="2.5" fill="#F48FB1" />
      {[80, 104, 128].map((y) => (
        <rect key={y} x="42" y={y} width="17" height="4" rx="2" fill="#F48FB1" />
      ))}
      <rect x="34" y="46" width="58" height="8" rx="4" fill="#FF7FA8" />
      <path
        d="M90 52 C125 52 150 146 205 148"
        fill="none"
        stroke="#FFC93C"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <g className="pg-slider">
        <ellipse cx="0" cy="-22" rx="10" ry="10" fill="#FFD7B5" />
        <path
          d="M-10 -24 Q-9 -34 0 -33 Q9 -34 10 -24 Q4 -29 -10 -24Z"
          fill="#5B3A29"
        />
        <circle cx="-3.5" cy="-21" r="1.4" fill="#3A2A20" />
        <circle cx="3.5" cy="-21" r="1.4" fill="#3A2A20" />
        <circle cx="-6" cy="-17.5" r="2" fill="#FF9DB5" />
        <circle cx="6" cy="-17.5" r="2" fill="#FF9DB5" />
        <rect x="-7" y="-12" width="14" height="10" rx="4" fill="#7FC8FF" />
        <rect x="-6" y="-3" width="4" height="4" rx="2" fill="#5B6B8C" />
        <rect x="2" y="-3" width="4" height="4" rx="2" fill="#5B6B8C" />
      </g>
    </svg>
  );
}
