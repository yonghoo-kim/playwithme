import SlideLoader from "@/components/SlideLoader";

// Centered loading screen for route loading.tsx files: the sliding-kid
// animation with a label under it.
export default function PastelLoading({ label = "불러오는 중…" }: { label?: string }) {
  return (
    <main
      role="status"
      aria-label={label}
      className="flex min-h-screen flex-col items-center justify-center gap-2"
    >
      <SlideLoader />
      <p className="font-jua text-lg text-pink-700">{label}</p>
    </main>
  );
}
