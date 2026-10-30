import RunningKidsLoader from "@/components/RunningKidsLoader";

// Centered loading screen for route loading.tsx files: kids chasing a ball
// with a label under it.
export default function PastelLoading({ label = "불러오는 중…" }: { label?: string }) {
  return (
    <main
      role="status"
      aria-label={label}
      // Fixed to the screen: a loading screen never scrolls.
      className="fixed inset-0 flex touch-none flex-col items-center justify-center gap-2 overflow-hidden overscroll-none"
    >
      <RunningKidsLoader />
      <p className="on-sky font-jua text-lg text-pink-700">{label}</p>
    </main>
  );
}
