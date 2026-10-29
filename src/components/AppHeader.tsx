"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Settings } from "lucide-react";
import WeatherChip from "@/components/WeatherChip";

/**
 * Signed-in screen frame: the weather chip top-left, one round button
 * top-right that flips between 설정 (on home) and 홈 (on settings), then the
 * page content. Scrolls with the page (nothing is pinned).
 */
export default function AppHeader({
  aside,
  children,
}: {
  /** Shown left of the button, e.g. the "알림을 켜주세요" nudge. */
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  const onSettings = usePathname().startsWith("/settings");

  return (
    <main className="min-h-screen px-4 pb-32 pt-4">
      <div className="mx-auto mb-2 flex w-full max-w-md flex-wrap items-center justify-end gap-2">
        <span className="mr-auto">
          <WeatherChip />
        </span>
        {aside}
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
      {children}
    </main>
  );
}
