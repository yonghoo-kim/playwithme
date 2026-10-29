// Small centered pastel "bouncy dots" spinner used by route loading.tsx files.
export default function PastelLoading() {
  return (
    <main
      role="status"
      aria-label="불러오는 중"
      className="flex min-h-screen items-center justify-center"
    >
      <div className="flex items-end gap-2">
        <span className="h-4 w-4 animate-bounce rounded-full border-2 border-gray-800 bg-pink-300 motion-reduce:animate-none" />
        <span
          className="h-4 w-4 animate-bounce rounded-full border-2 border-gray-800 bg-yellow-300 motion-reduce:animate-none"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="h-4 w-4 animate-bounce rounded-full border-2 border-gray-800 bg-pink-300 motion-reduce:animate-none"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </main>
  );
}
