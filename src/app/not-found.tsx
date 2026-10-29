import Link from "next/link";
import { CircleAlert } from "lucide-react";

// Replaces Next's English "404 | This page could not be found." page.
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border-4 border-gray-800 bg-white p-6 text-center shadow-[4px_4px_0px_rgba(31,41,55,0.25)]">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-pink-200 shadow-md shadow-pink-200">
          <CircleAlert size={28} strokeWidth={2.5} className="text-pink-700" />
        </span>
        <h1 className="mb-2 text-2xl font-jua text-pink-700">
          페이지를 찾을 수 없어요 😢
        </h1>
        <p className="mb-5 text-sm text-gray-600">
          주소를 다시 확인해주세요.
        </p>
        <Link
          href="/"
          className="block w-full rounded-2xl border-4 border-gray-800 bg-blue-300 py-2 font-jua text-lg text-blue-900 shadow-md shadow-blue-200 transition-transform hover:scale-105 active:scale-95"
        >
          처음으로 가기
        </Link>
      </div>
    </main>
  );
}
