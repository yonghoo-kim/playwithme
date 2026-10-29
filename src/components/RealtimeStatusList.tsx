"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Baby, Eye, Users } from "lucide-react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createBrowserClient } from "@/lib/supabase/client";
import StatusCard from "@/components/StatusCard";
import type { CurrentStatus, Place } from "@/types/db";

export interface ChildStatusView {
  childId: string;
  childName: string;
  placeId: string | null;
  updatedAt: string | null;
}

interface LiveStatus {
  placeId: string | null;
  updatedAt: string | null;
}

type StatusMap = Record<string, LiveStatus>;

function toStatusMap(children: ChildStatusView[]): StatusMap {
  const map: StatusMap = {};
  for (const child of children) {
    map[child.childId] = {
      placeId: child.placeId,
      updatedAt: child.updatedAt,
    };
  }
  return map;
}

const FLASH_MS = 700;

/**
 * Live status for a fixed set of children. Initialized from server-fetched
 * props, then subscribed to Supabase Realtime `postgres_changes` on
 * `current_statuses` filtered to exactly these child ids (one status per
 * child, shared across all of its groups). The channel is removed when the
 * child set changes or on unmount.
 *
 * `children` must be referentially stable between renders (server props or
 * a `useMemo`) — a fresh array resets local state to it.
 *
 * An event pointing at a place not in `places` (a place created after the
 * page rendered) triggers one `router.refresh()` so the server re-fetches it.
 */
export function useLiveStatuses(children: ChildStatusView[], places: Place[]) {
  const router = useRouter();
  const [statuses, setStatuses] = useState<StatusMap>(() =>
    toStatusMap(children)
  );
  const [flashing, setFlashing] = useState<Record<string, boolean>>({});

  // Fresh server data (child switch, router.refresh()) replaces local state
  // wholesale — it is at least as new as anything merged locally.
  useEffect(() => {
    setStatuses(toStatusMap(children));
  }, [children]);

  // Latest-value refs so the realtime handler always sees the current
  // places/children without resubscribing.
  const knownPlaceIdsRef = useRef<Set<string>>(new Set());
  const knownChildIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    knownPlaceIdsRef.current = new Set(places.map((place) => place.id));
    knownChildIdsRef.current = new Set(children.map((child) => child.childId));
  }, [places, children]);

  // Refresh at most once per unknown place id, so a burst of events about a
  // just-created place doesn't trigger a burst of refreshes.
  const refreshedForRef = useRef<Set<string>>(new Set());
  const refreshOnceFor = useCallback(
    (placeId: string) => {
      if (refreshedForRef.current.has(placeId)) {
        return;
      }
      refreshedForRef.current.add(placeId);
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
      if (!knownChildIdsRef.current.has(childId)) {
        return;
      }
      if (placeId && !knownPlaceIdsRef.current.has(placeId)) {
        refreshOnceFor(placeId);
      }
      setStatuses((current) => ({
        ...current,
        [childId]: { placeId, updatedAt },
      }));
      flash(childId);
    },
    [flash, refreshOnceFor]
  );

  // Stable key for the subscribed child set: resubscribe only when the set
  // itself changes, not on every server refresh.
  const idsKey = useMemo(
    () =>
      Array.from(new Set(children.map((child) => child.childId)))
        .sort()
        .join(","),
    [children]
  );

  useEffect(() => {
    if (!idsKey) {
      return;
    }
    const ids = idsKey.split(",");
    const filter =
      ids.length === 1
        ? "child_id=eq." + ids[0]
        : "child_id=in.(" + ids.join(",") + ")";

    const supabase = createBrowserClient();

    const handleChange = (
      payload: RealtimePostgresChangesPayload<CurrentStatus>
    ) => {
      if (payload.eventType === "DELETE") {
        // Realtime can't filter DELETEs by column — only act on children
        // shown here.
        const childId = payload.old.child_id;
        if (childId) {
          applyStatus(childId, null, null);
        }
        return;
      }
      const row = payload.new;
      if (!row.child_id) {
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
      // Unique topic per mount: the browser client is shared, and two
      // channels with the same topic would collide.
      const topic =
        "statuses-" +
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2, 8);
      channel = supabase
        .channel(topic)
        .on<CurrentStatus>(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "current_statuses",
            filter,
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
  }, [idsKey, applyStatus]);

  const placesById = useMemo(
    () => new Map(places.map((place) => [place.id, place])),
    [places]
  );

  /** Current status of a child, resolved to its place (if known). */
  const resolve = useCallback(
    (child: ChildStatusView) => {
      const status = statuses[child.childId] ?? {
        placeId: child.placeId,
        updatedAt: child.updatedAt,
      };
      const place = status.placeId ? placesById.get(status.placeId) : undefined;
      return {
        placeId: status.placeId,
        updatedAt: status.updatedAt,
        // A place we haven't fetched yet (refresh in flight) — show a
        // placeholder rather than flipping the card to "집에 있어요".
        placeName: place?.name ?? (status.placeId ? "불러오는 중…" : null),
        iconName: place?.icon_name ?? null,
        isFlashing: !!flashing[child.childId],
      };
    },
    [statuses, placesById, flashing]
  );

  return { resolve, applyStatus };
}

/** The pink "just changed" pulse around a status card. */
export function FlashFrame({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl transition-all duration-300 ease-out ${
        active
          ? "scale-[1.03] opacity-90 ring-4 ring-pink-300/70"
          : "scale-100 opacity-100 ring-0"
      }`}
    >
      {children}
    </div>
  );
}

interface RealtimeStatusListProps {
  /** My child(ren) in this group — compact, read-only lines. */
  myChildren: ChildStatusView[];
  /** Every other child in the group — read-only, never a PlaceSelector. */
  friends: ChildStatusView[];
  /** Places referenced by the statuses above (any family's). */
  places: Place[];
}

/**
 * A group page's live roster: "우리 아이" (compact lines) then "친구들".
 * Everything here is read-only — a child's status is changed only from the
 * dashboard by its own guardians.
 */
export default function RealtimeStatusList({
  myChildren,
  friends,
  places,
}: RealtimeStatusListProps) {
  const allChildren = useMemo(
    () => [...myChildren, ...friends],
    [myChildren, friends]
  );
  const { resolve } = useLiveStatuses(allChildren, places);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2" aria-labelledby="my-children">
        <h2
          id="my-children"
          className="flex items-center gap-2 font-jua text-xl text-pink-700"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-200 shadow-md shadow-blue-200">
            <Baby size={16} strokeWidth={2.5} className="text-blue-800" />
          </span>
          우리 아이
        </h2>

        {myChildren.map((child) => {
          const view = resolve(child);
          return (
            <FlashFrame key={child.childId} active={view.isFlashing}>
              <StatusCard
                compact
                childName={child.childName}
                placeName={view.placeName}
                iconName={view.iconName}
                updatedAt={view.updatedAt}
              />
            </FlashFrame>
          );
        })}
        <p className="px-1 text-xs font-bold text-gray-500">
          상태는 첫 화면에서 바꿀 수 있어요
        </p>
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
          friends.map((child) => {
            const view = resolve(child);
            return (
              <FlashFrame key={child.childId} active={view.isFlashing}>
                <StatusCard
                  childName={child.childName}
                  placeName={view.placeName}
                  iconName={view.iconName}
                  updatedAt={view.updatedAt}
                />
              </FlashFrame>
            );
          })
        )}
      </section>
    </div>
  );
}
