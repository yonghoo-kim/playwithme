"use client";

import { useMemo } from "react";
import StatusCard from "@/components/StatusCard";
import PlaceSelector from "@/components/PlaceSelector";
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
 * The dashboard's own-child block: live status card (realtime on
 * `current_statuses` for this one child, so a co-guardian's change shows up
 * without a refresh) plus the place controls.
 */
export default function ActiveChildStatus({
  child,
  places,
}: ActiveChildStatusProps) {
  const children = useMemo(() => [child], [child]);
  const { resolve, applyStatus } = useLiveStatuses(children, places);
  const view = resolve(child);

  return (
    <div className="flex flex-col gap-3">
      <FlashFrame active={view.isFlashing}>
        <StatusCard
          childName={child.childName}
          placeName={view.placeName}
          iconName={view.iconName}
          updatedAt={view.updatedAt}
        />
      </FlashFrame>
      <PlaceSelector
        childId={child.childId}
        places={places}
        onSelected={(placeId) =>
          applyStatus(child.childId, placeId, new Date().toISOString())
        }
      />
    </div>
  );
}
