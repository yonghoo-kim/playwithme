export default function SettingsLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <span
          aria-hidden="true"
          className="h-12 w-12 animate-spin rounded-full border-4 border-pink-200 border-t-pink-500"
        />
        <p className="font-jua text-lg text-pink-700">불러오는 중… ⚙️</p>
      </div>
    </main>
  );
}
