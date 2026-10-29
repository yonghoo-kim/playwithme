"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Settings } from "lucide-react";

/**
 * Signed-in screen frame: a reserved header band with "나랑 놀자" pinned
 * top-left and one floating round button top-right that flips between 설정
 * (on home) and 홈 (on settings). The page content scrolls in its own area
 * below the band, so it never slides up under the logo.
 */
export default function AppHeader({ children }: { children: React.ReactNode }) {
  const onSettings = usePathname().startsWith("/settings");

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 h-[76px]">
        <div className="mx-auto flex h-full w-full max-w-md items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="rounded-full bg-white/80 px-4 py-1.5 font-jua text-xl text-pink-700 shadow-sm backdrop-blur"
          >
            나랑 놀자 🎈
          </Link>
          <Link
            href={onSettings ? "/dashboard" : "/settings"}
            aria-label={onSettings ? "홈으로" : "설정"}
            className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-gray-800 bg-white shadow-[4px_4px_0px_rgba(31,41,55,0.25)] transition-transform hover:scale-105 active:scale-95"
          >
            {onSettings ? (
              <Home size={22} strokeWidth={2.5} className="text-pink-700" />
            ) : (
              <Settings size={22} strokeWidth={2.5} className="text-blue-900" />
            )}
          </Link>
        </div>
      </header>

      {/* Soft fade at the top edge instead of a hard cut. */}
      <main className="app-scroll fixed inset-x-0 bottom-0 top-[76px] overflow-y-auto overscroll-contain px-4 pb-32 pt-3">
        {children}
      </main>
    </>
  );
}
