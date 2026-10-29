"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Settings } from "lucide-react";

/**
 * Fixed top bar for the signed-in screens: "나랑 놀자" pinned top-left, and
 * one floating round button top-right that flips between 설정 (on home) and
 * 홈 (on settings). Pages using it leave `pt-20` of room under it.
 */
export default function AppHeader() {
  const onSettings = usePathname().startsWith("/settings");

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40">
      <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 pt-4">
        <Link
          href="/dashboard"
          className="pointer-events-auto rounded-full bg-white/80 px-4 py-1.5 font-jua text-xl text-pink-700 shadow-sm backdrop-blur"
        >
          나랑 놀자 🎈
        </Link>
        <Link
          href={onSettings ? "/dashboard" : "/settings"}
          aria-label={onSettings ? "홈으로" : "설정"}
          className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border-4 border-gray-800 bg-white shadow-[4px_4px_0px_rgba(31,41,55,0.25)] transition-transform hover:scale-105 active:scale-95"
        >
          {onSettings ? (
            <Home size={22} strokeWidth={2.5} className="text-pink-700" />
          ) : (
            <Settings size={22} strokeWidth={2.5} className="text-blue-900" />
          )}
        </Link>
      </div>
    </header>
  );
}
