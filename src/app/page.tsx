import Link from "next/link";
import PlaygroundKids from "@/components/PlaygroundKids";

export default function Home() {
  return (
    <main className="relative flex h-[100dvh] flex-col overflow-hidden items-center justify-center gap-10 px-4 pb-[var(--pg-hill-h)]">
      <PlaygroundKids />
      <h1 className="on-sky animate-title-bounce text-6xl font-jua text-pink-700 sm:text-7xl">나랑 놀자</h1>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link
          href="/signup"
          className="w-full rounded-2xl border-4 border-gray-800 bg-pink-300 py-2 text-center font-jua text-lg text-pink-900 shadow-md shadow-pink-200 transition-transform hover:scale-105 active:scale-95"
        >
          가입하기 ✨
        </Link>
        <Link
          href="/login"
          className="w-full rounded-2xl border-4 border-gray-800 bg-blue-300 py-2 text-center font-jua text-lg text-blue-900 shadow-md shadow-blue-200 transition-transform hover:scale-105 active:scale-95"
        >
          로그인 🚪
        </Link>
      </div>

      {/* Pinned just above the hill, out of the centred column's flow, so
          the screen still fits 100dvh without scrolling. */}
      <nav className="absolute inset-x-0 bottom-[calc(var(--pg-hill-h)+0.5rem)] flex justify-center gap-3 text-[11px] leading-none">
        <Link href="/terms" className="on-sky text-gray-600 underline">
          이용약관
        </Link>
        <Link href="/privacy" className="on-sky font-bold text-gray-600 underline">
          개인정보처리방침
        </Link>
      </nav>
    </main>
  );
}
