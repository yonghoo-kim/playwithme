"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Baby, Eye, Users } from "lucide-react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createBrowserClient } from "@/lib/supabase/client";
import StatusCard from "@/components/StatusCard";
import PlaceSelector from "@/components/PlaceSelector";
import type { CurrentStatus, Place } from "@/types/db";

export interface ChildStatusView {
  childId: string;
  childName: string;
  placeId: string | null;
  updatedAt: string | null;
}

interface RealtimeStatusListProps {
  groupId: string;
  /** Children in this group that the signed-in user guards (with controls). */
  myChildren: ChildStatusView[];
  /** Every other child in this group (read-only, never a PlaceSelector). */
  friends: ChildStatusView[];
  /** My other children in this group, not shown — ignore their events. */
  hiddenChildIds: string[];
  groupPlaces: Place[];
}

interface LiveStatus {
  placeId: string | null;
  updatedAt: string | null;
}

type StatusMap = Record<string, LiveStatus>;

function toStatusMap(...lists: ChildStatusView[][]): StatusMap {
  const map: StatusMap = {};
  for (const list of lists) {
    for (const child of list) {
      map[child.childId] = {
        placeId: child.placeId,
        updatedAt: child.updatedAt,
      };
    }
  }
  return map;
}

const FLASH_MS = 700;

/**
 * Owns the dashboard's "내 아이" / "친구들" sections so status can update
 * live. Initialized from server-fetched props, then subscribed to Supabase
 * Realtime `postgres_changes` on `current_statuses` filtered to THIS group
 * only; the channel is removed whenever `groupId` changes or on unmount, so
 * a previously viewed group can never push into the current view.
 */
export default function RealtimeStatusList({
  groupId,
  myChildren,
  friends,
  hiddenChildIds,
  groupPlaces,
}: RealtimeStatusListProps) {
  const router = useRouter();
  const [statuses, setStatuses] = useState<StatusMap>(() =>
    toStatusMap(myChildren, friends)
  );
  const [flashing, setFlashing] = useState<Record<string, boolean>>({});

  // Fresh server data (child/group switch, router.refresh()) replaces local
  // state wholesale — it is at least as new as anything we merged locally.
  useEffect(() => {
    setStatuses(toStatusMap(myChildren, friends));
  }, [myChildren, friends]);

  // Latest-value refs so the realtime handler (subscribed once per groupId)
  // always sees the current places/children without resubscribing.
  const knownPlaceIdsRef = useRef<Set<string>>(new Set());
  const knownChildIdsRef = useRef<Set<string>>(new Set());
  const hiddenChildIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    knownPlaceIdsRef.current = new Set(groupPlaces.map((place) => place.id));
    knownChildIdsRef.current = new Set(
      [...myChildren, ...friends].map((child) => child.childId)
    );
    hiddenChildIdsRef.current = new Set(hiddenChildIds);
  }, [groupPlaces, myChildren, friends, hiddenChildIds]);

  // Refresh at most once per unknown place/child id, so a burst of events
  // about a just-created place doesn't trigger a burst of refreshes.
  const refreshedForRef = useRef<Set<string>>(new Set());
  const refreshOnceFor = useCallback(
    (key: string) => {
      if (refreshedForRef.current.has(key)) {
        return;
      }
      refreshedForRef.current.add(key);
      router.refresh();
    },
    [router]
  );

  const flashTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );
  const flash = useCallback((childId: string) => {
    setFlashing((current) => ({ ...current, [childId]: true }));
    clearTimeout(flashTimersRef.current[childId]);
    flashTimersRef.current[childId] = setTimeout(() => {
      setFlashing((current) => {
        const next = { ...current };
        delete next[childId];
        return next;
      });
    }, FLASH_MS);
  }, []);

  useEffect(() => {
    const timers = flashTimersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const applyStatus = useCallback(
    (childId: string, placeId: string | null, updatedAt: string | null) => {
      if (hiddenChildIdsRef.current.has(childId)) {
        return;
      }
      if (!knownChildIdsRef.current.has(childId)) {
        // A child added to this group after the page rendered.
        refreshOnceFor(`child:${childId}`);
        return;
      }
      if (placeId && !knownPlaceIdsRef.current.has(placeId)) {
        // A place created on the fly — fetch it (and the new status) fresh.
        refreshOnceFor(`place:${placeId}`);
      }
      setStatuses((current) => ({
        ...current,
        [childId]: { placeId, updatedAt },
      }));
      flash(childId);
    },
    [flash, refreshOnceFor]
  );

  useEffect(() => {
    const supabase = createBrowserClient();

    const handleChange = (
      payload: RealtimePostgresChangesPayload<CurrentStatus>
    ) => {
      if (payload.eventType === "DELETE") {
        // Realtime can't filter DELETEs by column, so only act on children
        // already shown here — never refresh for another group's row.
        const childId = payload.old.child_id;
        if (childId && knownChildIdsRef.current.has(childId)) {
          applyStatus(childId, null, null);
        }
        return;
      }

      const row = payload.new;
      if (!row.child_id || row.group_id !== groupId) {
        return;
      }
      applyStatus(row.child_id, row.place_id ?? null, row.updated_at ?? null);
    };

    // Realtime checks RLS as the subscriber, so the socket must carry the
    // signed-in user's token before joining — otherwise it joins as anon,
    // every row is filtered out, and no event ever arrives.
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) {
        return;
      }
      if (session) {
        supabase.realtime.setAuth(session.access_token);
      }
      channel = supabase
        .channel("status-" + groupId)
        .on<CurrentStatus>(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "current_statuses",
            filter: "group_id=eq." + groupId,
          },
          handleChange
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [groupId, applyStatus]);

  const placesById = new Map(groupPlaces.map((place) => [place.id, place]));

  function renderCard(child: ChildStatusView) {
    const status = statuses[child.childId] ?? {
      placeId: child.placeId,
      updatedAt: child.updatedAt,
    };
    const place = status.placeId ? placesById.get(status.placeId) : undefined;
    const isFlashing = !!flashing[child.childId];

    return (
      <div
        className={`rounded-2xl transition-all duration-300 ease-out ${
          isFlashing
            ? "scale-[1.03] opacity-90 ring-4 ring-pink-300/70"
            : "scale-100 opacity-100 ring-0"
        }`}
      >
        <StatusCard
          childName={child.childName}
          placeName={place?.name ?? null}
          iconName={place?.icon_name ?? null}
          updatedAt={status.updatedAt}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3" aria-labelledby="my-children">
        <h2
          id="my-children"
          className="flex items-center gap-2 font-jua text-xl text-pink-700"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-200 shadow-md shadow-blue-200">
            <Baby size={16} strokeWidth={2.5} className="text-blue-800" />
          </span>
          내 아이
        </h2>

        {myChildren.map((child) => (
          <div key={child.childId} className="flex flex-col gap-3">
            {renderCard(child)}
            <PlaceSelector
              childId={child.childId}
              groupId={groupId}
              places={groupPlaces}
              onSelected={(placeId) =>
                applyStatus(child.childId, placeId, new Date().toISOString())
              }
            />
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="friends">
        <h2
          id="friends"
          className="flex items-center gap-2 font-jua text-xl text-pink-700"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-200 shadow-md shadow-green-200">
            <Users size={16} strokeWidth={2.5} className="text-green-800" />
          </span>
          친구들
          <span className="ml-auto flex items-center gap-1 rounded-full border-2 border-gray-300 bg-white px-2 py-0.5 font-sans text-[11px] font-bold text-gray-500">
            <Eye size={12} strokeWidth={3} aria-hidden />
            보기 전용
          </span>
        </h2>

        {friends.length === 0 ? (
          <p className="rounded-2xl border-4 border-dashed border-gray-300 bg-white/60 p-4 text-center text-sm font-bold text-gray-600">
            아직 친구가 없어요 — 초대해보세요 🎈
          </p>
        ) : (
          friends.map((child) => (
            <div key={child.childId}>{renderCard(child)}</div>
          ))
        )}
      </section>
    </div>
  );
}
