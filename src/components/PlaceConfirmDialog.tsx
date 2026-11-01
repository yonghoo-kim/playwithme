"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import {
  deselectedGroupIds,
  initialNotifySelection,
  notifyGroupIdsToSend,
  readNotifyOff,
  saveNotifyOff,
} from "@/lib/notifyGroups";

export interface NotifyGroup {
  id: string;
  name: string;
}

interface PlaceConfirmDialogProps {
  /** "○○로 가시겠습니까?" */
  message: string;
  /** The child whose status changes (keys the remembered selection). */
  childId: string;
  /** The child's groups, in join order. */
  groups: NotifyGroup[];
  /**
   * `going` = 가는 중이에요 instead of 네, 갈래요!; `notifyGroupIds` is what
   * to send to `/api/status/update` (`undefined` = every group).
   */
  onConfirm: (going: boolean, notifyGroupIds: string[] | undefined) => void;
  onCancel: () => void;
}

/**
 * The place confirm dialog: 아니요 / 네, 갈래요! / 가는 중이에요, plus — when
 * the child is in 2+ groups — "알림 보낼 그룹" chips choosing which groups get
 * the push (the status itself is visible to every group regardless). The
 * last choice per child is remembered on this phone; all groups start
 * selected the first time. Escape or a tap outside cancels.
 */
export default function PlaceConfirmDialog({
  message,
  childId,
  groups,
  onConfirm,
  onCancel,
}: PlaceConfirmDialogProps) {
  const groupIds = groups.map((group) => group.id);
  const showChips = groups.length > 1;
  // Only ever rendered after a tap (never on the server), so the remembered
  // choice can be read straight away — no flash of "all selected".
  const [selected, setSelected] = useState<string[]>(() =>
    showChips
      ? initialNotifySelection(groupIds, readNotifyOff(childId))
      : groupIds
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((other) => other !== id)
        : [...current, id]
    );
  }

  function confirm(going: boolean) {
    if (showChips) saveNotifyOff(childId, deselectedGroupIds(groupIds, selected));
    onConfirm(going, notifyGroupIdsToSend(groupIds, selected));
  }

  const noneSelected = showChips && selected.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 px-6"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="place-confirm-message"
        onClick={(event) => event.stopPropagation()}
        className="animate-page-enter flex max-h-[calc(100dvh-2rem)] w-full max-w-xs flex-col gap-4 overflow-y-auto rounded-3xl border-4 border-gray-800 bg-white p-5 shadow-[4px_4px_0px_rgba(31,41,55,0.25)]"
      >
        <p
          id="place-confirm-message"
          className="text-center font-jua text-xl text-blue-900"
        >
          {message}
        </p>

        {showChips && (
          <div
            role="group"
            aria-labelledby="place-confirm-notify"
            className="flex flex-col gap-2"
          >
            <p
              id="place-confirm-notify"
              className="font-jua text-sm text-gray-600"
            >
              알림 보낼 그룹
            </p>
            <div className="flex flex-wrap gap-2">
              {groups.map((group) => {
                const on = selected.includes(group.id);
                return (
                  <button
                    key={group.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(group.id)}
                    className={`flex max-w-full items-center gap-1 rounded-full border-2 px-3 py-1 font-jua text-sm transition-transform hover:scale-105 active:scale-95 ${
                      on
                        ? "border-gray-800 bg-yellow-200 text-yellow-900"
                        : "border-gray-300 bg-white text-gray-400"
                    }`}
                  >
                    {on && (
                      <Check
                        aria-hidden
                        size={14}
                        strokeWidth={3}
                        className="shrink-0"
                      />
                    )}
                    <span className="truncate">{group.name}</span>
                  </button>
                );
              })}
            </div>
            <p
              aria-live="polite"
              className={`text-xs font-bold ${
                noneSelected ? "text-pink-700" : "text-gray-500"
              }`}
            >
              {noneSelected
                ? "알림 없이 바꿔요"
                : "상태는 모든 그룹에 보이고, 알림만 골라 보내요"}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl border-4 border-gray-800 bg-gray-100 py-2 font-jua text-gray-600 transition-transform hover:scale-105 active:scale-95"
          >
            아니요
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => confirm(false)}
            className="flex-1 rounded-2xl border-4 border-gray-800 bg-pink-300 py-2 font-jua text-pink-900 transition-transform hover:scale-105 active:scale-95"
          >
            네, 갈래요!
          </button>
        </div>
        <button
          type="button"
          onClick={() => confirm(true)}
          className="-mt-2 rounded-2xl border-4 border-gray-800 bg-sky-200 py-2 font-jua text-sky-900 transition-transform hover:scale-105 active:scale-95"
        >
          가는 중이에요 🚶
        </button>
      </div>
    </div>
  );
}
