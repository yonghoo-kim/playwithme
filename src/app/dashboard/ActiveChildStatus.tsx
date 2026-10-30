"use client";

import { useMemo } from "react";
import StatusCard from "@/components/StatusCard";
import PlaceSelector from "@/components/PlaceSelector";
import HomeSuggestion from "./HomeSuggestion";
import {
  FlashFrame,
  useLiveStatuses,
  type ChildStatusView,
} from "@/components/RealtimeStatusList";
import type { Place } from "@/types/db";

interface ActiveChildStatusProps {
  /** The active child — one the signed-in user guards. */
  child: ChildStatusView;
  /** That child's family places. */
  places: Place[];
}

/**
 * The dashboard's own-child block, one card: the live status line
 * (realtime on `current_statuses` for this one child, so a co-guardian's
 * change shows up without a refresh) above the place controls.
 */
export default function ActiveChildStatus({
  child,
  places,
}: ActiveChildStatusProps) {
  const children = useMemo(() => [child], [child]);
  const { resolve, applyStatus } = useLiveStatuses(children, places);
  const view = resolve(child);

  return (
    <FlashFrame active={view.isFlashing}>
      <div className="flex flex-col gap-3 rounded-3xl border-4 border-gray-800 bg-white/90 p-3 shadow-[4px_4px_0px_rgba(31,41,55,0.25)]">
        <HomeSuggestion
          childId={child.childId}
          childName={child.childName}
          placeId={view.placeId}
          updatedAt={view.updatedAt}
          onWentHome={() =>
            applyStatus(child.childId, null, new Date().toISOString())
          }
        />
        {/* The name is already on the selected pill above. */}
        <StatusCard
          childName={child.childName}
          placeName={view.placeName}
          iconName={view.iconName}
          updatedAt={view.updatedAt}
          compact
          hideName
          bare
        />
        <PlaceSelector
          childId={child.childId}
          places={places}
          onSelected={(placeId) =>
            applyStatus(child.childId, placeId, new Date().toISOString())
          }
        />
      </div>
    </FlashFrame>
  );
}
