"use client";

import { useCallback, useMemo, useRef } from "react";
import StatusCard from "@/components/StatusCard";
import PlaceSelector from "@/components/PlaceSelector";
import StaleStatusCheckIn from "./StaleStatusCheckIn";
import ArrivedButton from "./ArrivedButton";
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
 * change shows up without a refresh) above the place controls. A child
 * left at the same non-home place for 5h+ gets a "아직도 ○○에 있나요?"
 * check-in here (own child only — friends' cards never show it). While the
 * status is "가는 중", a "도착했어요" button re-posts the place as arrived.
 */
export default function ActiveChildStatus({
  child,
  places,
}: ActiveChildStatusProps) {
  const children = useMemo(() => [child], [child]);
  const { resolve, applyStatus } = useLiveStatuses(children, places);
  const view = resolve(child);
  const selectorRef = useRef<HTMLDivElement>(null);

  const focusSelector = useCallback(() => {
    const selector = selectorRef.current;
    if (!selector) return;
    selector.scrollIntoView({ behavior: "smooth", block: "center" });
    // The first place button (not the 도착/가는 중 toggle above them).
    selector
      .querySelector<HTMLButtonElement>("[data-place-buttons] button")
      ?.focus({ preventScroll: true });
  }, []);

  return (
    <FlashFrame active={view.isFlashing}>
      <div className="flex flex-col gap-3 rounded-3xl border-4 border-gray-800 bg-white/90 p-3 shadow-[4px_4px_0px_rgba(31,41,55,0.25)]">
        <StaleStatusCheckIn
          childId={child.childId}
          placeId={view.placeId}
          // Only a place we actually know (not the "불러오는 중…" placeholder).
          placeName={view.iconName !== null ? view.placeName : null}
          updatedAt={view.updatedAt}
          going={view.going}
          onStillThere={(updatedAt) =>
            applyStatus(child.childId, view.placeId, updatedAt, false)
          }
          onChangePlace={focusSelector}
        />
        <div className="flex flex-wrap items-center gap-2">
          {/* The name is already on the selected pill above. */}
          <div className="min-w-0 flex-1">
            <StatusCard
              childName={child.childName}
              placeName={view.placeName}
              iconName={view.iconName}
              updatedAt={view.updatedAt}
              going={view.going}
              compact
              hideName
              bare
            />
          </div>
          {view.going && (
            <ArrivedButton
              childId={child.childId}
              placeId={view.placeId}
              onArrived={(updatedAt) =>
                applyStatus(child.childId, view.placeId, updatedAt, false)
              }
            />
          )}
        </div>
        <div ref={selectorRef}>
          <PlaceSelector
            childId={child.childId}
            places={places}
            onSelected={(placeId, going) =>
              applyStatus(
                child.childId,
                placeId,
                new Date().toISOString(),
                going
              )
            }
          />
        </div>
      </div>
    </FlashFrame>
  );
}
