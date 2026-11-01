"use client";

import { useState } from "react";
import { Moon } from "lucide-react";

/**
 * 밤 시간 알림 끄기 (default on): no pushes 22:00–07:00 KST — status, group
 * chat and 1:1 chat. Saved per user (not per device) via
 * /api/users/notification-prefs; flips right away and reverts on failure.
 */
export default function QuietHoursToggle({
  initialEnabled,
}: {
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !enabled;
    setEnabled(next);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/users/notification-prefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quietHours: next }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "설정을 바꾸지 못했어요. 다시 시도해주세요.");
      }
    } catch (err) {
      setEnabled(!next);
      setError(
        err instanceof Error && err.message
          ? err.message
          : "설정을 바꾸지 못했어요. 다시 시도해주세요."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border-4 border-gray-800 bg-indigo-100 p-4 shadow-[4px_4px_0px_rgba(31,41,55,0.25)]">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-200 shadow-md shadow-indigo-200">
          <Moon size={20} strokeWidth={2.5} className="text-indigo-800" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span id="quiet-hours-label" className="font-jua text-lg text-blue-900">
            밤 시간 알림 끄기
          </span>
          <span className="text-xs font-bold text-gray-600">
            밤 10시 ~ 아침 7시에는 알림이 오지 않아요 🌙
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-labelledby="quiet-hours-label"
          onClick={toggle}
          disabled={busy}
          className={`shrink-0 rounded-full border-4 border-gray-800 px-3 py-1 text-sm font-bold transition-transform hover:scale-105 active:scale-95 disabled:opacity-60 ${
            enabled ? "bg-green-200 text-green-900" : "bg-white text-gray-600"
          }`}
        >
          {enabled ? "켜짐" : "꺼짐"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs font-bold text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
