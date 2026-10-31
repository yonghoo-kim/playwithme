import { Home } from "lucide-react";
import { getPlaceVisual } from "@/lib/icons";
import { goingLabel } from "@/lib/status";

interface StatusCardProps {
  childName: string;
  placeName: string | null;
  iconName: string | null;
  updatedAt: string | null;
  /** On the way to the place (or home when `placeName` is null): shows
   * "놀이터로 가는 중 🚶" instead of being there. */
  going?: boolean;
  /** One-line variant (a group page's "우리 아이" row). */
  compact?: boolean;
  /** Compact only: leave the name out (it is already on screen). */
  hideName?: boolean;
  /** Compact only: no border/background, to sit inside another card. */
  bare?: boolean;
  /** Small control shown just left of the time badge (e.g. a 1:1 chat chip). */
  action?: React.ReactNode;
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

function TimeBadge({ updatedAt }: { updatedAt: string }) {
  return (
    <span
      // Relative time is computed from Date.now(), which can differ by a
      // minute between the server render and client hydration.
      suppressHydrationWarning
      className="shrink-0 rounded-full border-2 border-gray-800 bg-yellow-200 px-2 py-1 text-xs font-bold text-yellow-900"
    >
      {formatRelativeTime(updatedAt)}
    </span>
  );
}

/**
 * Read-only display of one child's current place (or "집에 있어요"), or —
 * with `going` — where the child is headed ("놀이터로 가는 중 🚶").
 */
export default function StatusCard({
  childName,
  placeName,
  iconName,
  updatedAt,
  going = false,
  compact = false,
  hideName = false,
  bare = false,
  action,
}: StatusCardProps) {
  const goingText = going ? `${goingLabel(placeName)} 🚶` : null;

  if (compact) {
    const visual = placeName ? getPlaceVisual(iconName ?? "") : null;
    return (
      <div
        className={`flex items-center gap-2 ${
          bare ? "" : "rounded-2xl border-2 border-gray-800 bg-white px-3 py-2"
        }`}
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            going ? "bg-sky-200" : visual ? "bg-green-200" : "bg-gray-100"
          }`}
        >
          {!visual ? (
            <Home size={16} strokeWidth={2.5} className="text-gray-500" />
          ) : visual.type === "emoji" ? (
            <span aria-hidden className="text-[16px] leading-none">
              {visual.emoji}
            </span>
          ) : (
            <visual.Icon size={16} strokeWidth={3} className="text-green-900" />
          )}
        </span>
        <p className="min-w-0 flex-1 truncate text-sm">
          {hideName ? (
            <span className="font-jua text-lg text-blue-900">
              {goingText ??
                (placeName ? `${placeName}에 있어요` : "집에 있어요 🏠")}
            </span>
          ) : (
            <>
              <span className="font-jua text-base text-blue-900">{childName}</span>{" "}
              <span className="font-bold text-pink-700">
                {goingText
                  ? `· ${goingText}`
                  : placeName
                    ? `· ${placeName}`
                    : "· 집에 있어요 🏠"}
              </span>
            </>
          )}
        </p>
        {action}
        {(placeName || going) && updatedAt && (
          <TimeBadge updatedAt={updatedAt} />
        )}
      </div>
    );
  }

  if (!placeName) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border-2 border-gray-300 bg-white/60 p-4">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
            going ? "bg-sky-200" : "bg-gray-100"
          }`}
        >
          <Home size={22} strokeWidth={2.5} className="text-gray-500" />
        </span>
        <div className="flex-1">
          <p className="font-jua text-lg text-gray-700">{childName}</p>
          <p className="text-sm text-gray-500">
            {goingText ?? "집에 있어요 🏠"}
          </p>
        </div>
        {action}
        {going && updatedAt && <TimeBadge updatedAt={updatedAt} />}
      </div>
    );
  }

  const visual = getPlaceVisual(iconName ?? "");

  return (
    <div className="flex items-center gap-3 rounded-2xl border-4 border-gray-800 bg-white p-4 shadow-[4px_4px_0px_rgba(31,41,55,0.25)]">
      <span
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full shadow-md ${
          going ? "bg-sky-200 shadow-sky-200" : "bg-green-200 shadow-green-200"
        }`}
      >
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
        <p className="text-sm font-bold text-pink-700">
          {goingText ?? placeName}
        </p>
      </div>

      {action}
      {updatedAt && <TimeBadge updatedAt={updatedAt} />}
    </div>
  );
}
