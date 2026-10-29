import { Home } from "lucide-react";
import { getPlaceVisual } from "@/lib/icons";

interface StatusCardProps {
  childName: string;
  placeName: string | null;
  iconName: string | null;
  updatedAt: string | null;
}

/**
 * Small Korean relative-time label ("방금 전", "5분 전", "2시간 전", "3일 전").
 * Not derived from any stored mood/data field — purely a display helper for
 * `current_statuses.updated_at`.
 */
function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;

  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}일 전`;
}

export default function StatusCard({
  childName,
  placeName,
  iconName,
  updatedAt,
}: StatusCardProps) {
  if (!placeName) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border-2 border-gray-300 bg-white/60 p-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100">
          <Home size={22} strokeWidth={2.5} className="text-gray-500" />
        </span>
        <div>
          <p className="font-jua text-lg text-gray-700">{childName}</p>
          <p className="text-sm text-gray-500">집에 있어요 🏠</p>
        </div>
      </div>
    );
  }

  const visual = getPlaceVisual(iconName ?? "");

  return (
    <div className="flex items-center gap-3 rounded-2xl border-4 border-gray-800 bg-white p-4 shadow-[4px_4px_0px_rgba(31,41,55,0.25)] transition-transform hover:scale-110 hover:-translate-y-1 active:scale-90 active:rotate-3">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green-200 shadow-md shadow-green-200">
        {visual.type === "emoji" ? (
          <span aria-hidden className="text-[26px] leading-none">
            {visual.emoji}
          </span>
        ) : (
          <visual.Icon size={26} strokeWidth={3} className="text-green-900" />
        )}
      </span>

      <div className="flex-1">
        <p className="font-jua text-lg text-blue-900">
          {childName} <span aria-hidden>🏃‍♂️</span>
        </p>
        <p className="text-sm font-bold text-pink-700">{placeName}</p>
      </div>

      {updatedAt && (
        <span
          // Relative time is computed from Date.now(), which can differ by a
          // minute between the server render and client hydration.
          suppressHydrationWarning
          className="shrink-0 rounded-full border-2 border-gray-800 bg-yellow-200 px-2 py-1 text-xs font-bold text-yellow-900"
        >
          {formatRelativeTime(updatedAt)}
        </span>
      )}
    </div>
  );
}
