// Next.js remounts template.tsx on every navigation, so the enter animation
// replays for each route. The animation uses fill-mode "backwards" so no
// transform lingers afterwards (a lingering transform would break
// position:fixed descendants).
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-enter">{children}</div>;
}
