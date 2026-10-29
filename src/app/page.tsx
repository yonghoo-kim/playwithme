import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <h1 className="on-sky text-4xl font-jua text-pink-700">나랑 놀자 🎈</h1>
      <p className="on-sky text-lg text-blue-900">친구들과 실시간으로 놀이 상태를 공유해요</p>

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
    </main>
  );
}
