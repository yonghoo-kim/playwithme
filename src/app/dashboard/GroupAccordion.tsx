"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Eye, Users } from "lucide-react";
import StatusCard from "@/components/StatusCard";
import {
  FlashFrame,
  useLiveStatuses,
  type ChildStatusView,
} from "@/components/RealtimeStatusList";
import InviteCopyButton from "./InviteCopyButton";
import type { Place } from "@/types/db";

export interface AccordionGroup {
  id: string;
  name: string;
  /** Every child in the group (mine included). */
  childCount: number;
  /** Absolute invite link, built on the server (`buildInviteUrl`). */
  inviteUrl: string;
  /** Children in the group I don't guard, in join order. */
  friendIds: string[];
}

interface GroupAccordionProps {
  /** The active child's groups, in the order the child joined them. */
  groups: AccordionGroup[];
  /** Every friend across those groups, once each (server props — stable). */
  friends: ChildStatusView[];
  /** Places referenced by the friends' statuses (any family's). */
  places: Place[];
  /** Groups open on first render. */
  initialOpenIds: string[];
  /** `?group=<id>` when it is one of these groups — opened and scrolled to. */
  focusGroupId: string | null;
}

/**
 * "○○의 그룹" as an accordion: tapping a group card opens that group's
 * friends right under it (read-only, never a PlaceSelector) plus its invite
 * button. Several groups can be open at once. One realtime subscription
 * covers every friend across all the groups, so a friend who is in two of
 * them updates in both.
 */
export default function GroupAccordion({
  groups,
  friends,
  places,
  initialOpenIds,
  focusGroupId,
}: GroupAccordionProps) {
  const { resolve } = useLiveStatuses(friends, places);

  const friendsById = useMemo(
    () => new Map(friends.map((friend) => [friend.childId, friend])),
    [friends]
  );

  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(initialOpenIds)
  );

  // A new `?group=` (just created / just joined) opens that group and brings
  // it into view.
  useEffect(() => {
    if (!focusGroupId) {
      return;
    }
    setOpenIds((current) =>
      current.has(focusGroupId) ? current : new Set(current).add(focusGroupId)
    );
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    document
      .getElementById(`group-${focusGroupId}`)
      ?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
  }, [focusGroupId]);

  function toggle(groupId: string) {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }

  return (
    <ul className="flex flex-col gap-3">
      {groups.map((group) => {
        const open = openIds.has(group.id);
        const buttonId = `group-toggle-${group.id}`;
        const panelId = `group-panel-${group.id}`;
        const groupFriends = group.friendIds
          .map((id) => friendsById.get(id))
          .filter((friend): friend is ChildStatusView => !!friend);

        return (
          <li
            key={group.id}
            id={`group-${group.id}`}
            className="flex scroll-mt-4 flex-col"
          >
            <button
              type="button"
              id={buttonId}
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => toggle(group.id)}
              className="flex w-full items-center gap-3 rounded-2xl border-4 border-gray-800 bg-white p-4 text-left shadow-[4px_4px_0px_rgba(31,41,55,0.25)] transition-transform hover:scale-105 active:scale-95"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-200 shadow-md shadow-green-200">
                <Users size={20} strokeWidth={2.5} className="text-green-900" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-jua text-lg text-blue-900">
                  {group.name}
                </span>
                <span className="text-xs font-bold text-gray-500">
                  아이 {group.childCount}명
                </span>
              </span>
              <ChevronDown
                size={22}
                strokeWidth={3}
                aria-hidden
                className={`shrink-0 text-gray-500 transition-transform duration-300 ease-out motion-reduce:transition-none ${
                  open ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>

            {/* grid-rows 0fr ↔ 1fr animates to the content's real height;
                `visibility` flips at the end of a collapse, so closed panels
                leave the tab order and the accessibility tree. */}
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={`grid transition-[grid-template-rows,visibility] duration-300 ease-out motion-reduce:transition-none ${
                open ? "visible grid-rows-[1fr]" : "invisible grid-rows-[0fr]"
              }`}
            >
              <div className="min-h-0 overflow-hidden">
                {/* Room on every side for the cards' shadow and flash ring. */}
                <div className="ml-4 mt-3 flex flex-col gap-3 border-l-4 border-dashed border-gray-300 pb-3 pl-3 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-jua text-lg text-pink-700">
                      친구들
                    </span>
                    <span className="flex items-center gap-1 rounded-full border-2 border-gray-300 bg-white px-2 py-0.5 text-[11px] font-bold text-gray-500">
                      <Eye size={12} strokeWidth={3} aria-hidden />
                      보기 전용
                    </span>
                    <span className="ml-auto">
                      <InviteCopyButton
                        groupName={group.name}
                        inviteUrl={group.inviteUrl}
                      />
                    </span>
                  </div>

                  {groupFriends.length === 0 ? (
                    <p className="rounded-2xl border-4 border-dashed border-gray-300 bg-white/60 p-4 text-center text-sm font-bold text-gray-600">
                      아직 친구가 없어요 — 초대해보세요 🎈
                    </p>
                  ) : (
                    groupFriends.map((friend) => {
                      const view = resolve(friend);
                      return (
                        <FlashFrame
                          key={friend.childId}
                          active={view.isFlashing}
                        >
                          <StatusCard
                            childName={friend.childName}
                            placeName={view.placeName}
                            iconName={view.iconName}
                            updatedAt={view.updatedAt}
                          />
                        </FlashFrame>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
