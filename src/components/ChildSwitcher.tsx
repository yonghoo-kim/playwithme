"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export interface SwitcherChild {
  id: string;
  name: string;
}

interface ChildSwitcherProps {
  myChildren: SwitcherChild[];
  activeChildId: string;
}

/**
 * Top-of-dashboard row of bouncy pills — one per child the signed-in user
 * guards, names only. Tapping a non-active pill POSTs
 * `/api/users/active-child` and then refreshes the Server Component tree
 * (inside a transition, so the pill shows a spinner until that child's
 * status and groups have arrived). Adding children lives in Settings.
 */
export default function ChildSwitcher({
  myChildren,
  activeChildId,
}: ChildSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshStartedRef = useRef(false);

  // The server re-rendered with the newly active child — switching is done.
  useEffect(() => {
    setPendingId(null);
  }, [activeChildId]);

  // Safety net: once the refresh transition settles, clear the spinner even
  // if the active child didn't change (e.g. the server fell back).
  useEffect(() => {
    if (!isPending && refreshStartedRef.current) {
      refreshStartedRef.current = false;
      setPendingId(null);
    }
  }, [isPending]);

  const busy = pendingId !== null || isPending;

  async function selectChild(childId: string) {
    if (childId === activeChildId || busy) {
      return;
    }

    setPendingId(childId);
    setError(null);
    try {
      const res = await fetch("/api/users/active-child", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(data.error ?? "전환에 실패했어요. 다시 시도해주세요.");
        setPendingId(null);
        return;
      }

      refreshStartedRef.current = true;
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError("전환에 실패했어요. 다시 시도해주세요.");
      setPendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div
        role="tablist"
        aria-label="아이 선택"
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 pt-1"
      >
        {myChildren.map((child) => {
          const active = child.id === activeChildId;
          const pending = child.id === pendingId;

          return (
            <button
              key={child.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-busy={pending}
              onClick={() => selectChild(child.id)}
              disabled={busy && !active}
              className={`flex shrink-0 items-center gap-2 rounded-full border-4 px-4 py-1.5 transition-transform hover:scale-105 active:scale-95 disabled:cursor-wait ${
                active
                  ? "border-gray-800 bg-pink-300 shadow-[4px_4px_0px_rgba(31,41,55,0.25)]"
                  : "border-gray-300 bg-white"
              } ${busy && !active && !pending ? "opacity-60" : ""}`}
            >
              {pending && (
                <Loader2
                  size={16}
                  strokeWidth={3}
                  className="animate-spin text-pink-700"
                  aria-hidden
                />
              )}
              <span
                className={`font-jua text-base ${
                  active ? "text-pink-900" : "text-blue-900"
                }`}
              >
                {child.name}
              </span>
            </button>
          );
        })}
      </div>

      {pendingId && (
        <p role="status" className="text-xs font-bold text-pink-700">
          전환하는 중이에요… 🛝
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs font-bold text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
