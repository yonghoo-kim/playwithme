"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { currentPosition, readHome, saveHome } from "@/lib/location";

/**
 * Settings "우리 집 위치": saves where home is, on this phone only. With it,
 * opening the app near home while a child is still "at the playground"
 * suggests switching to 집으로 (never switches by itself — the phone is the
 * parent's, not the child's).
 */
export default function HomeSpot() {
  const [saved, setSaved] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSaved(!!readHome());
  }, []);

  async function saveHere() {
    setBusy(true);
    setError(null);
    try {
      saveHome(await currentPosition());
      setSaved(true);
    } catch {
      setError("위치를 가져오지 못했어요. 위치 권한을 허용해주세요.");
    } finally {
      setBusy(false);
    }
  }

  if (saved === null) return null;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border-4 border-gray-800 bg-white p-3 shadow-[4px_4px_0px_rgba(31,41,55,0.25)]">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-200 shadow-md shadow-orange-200">
          <MapPin size={20} strokeWidth={2.5} className="text-orange-800" />
        </span>
        <p className="flex-1 text-sm font-bold text-blue-900">
          {saved
            ? "우리 집 위치가 저장돼 있어요 ✅"
            : "집에서 눌러두면, 집 근처에서 앱을 열 때 '집으로 바꿀까요?'를 물어봐요"}
        </p>
      </div>
      <div className="flex justify-end gap-2">
        {saved && (
          <button
            type="button"
            onClick={() => {
              saveHome(null);
              setSaved(false);
            }}
            className="rounded-full border-2 border-gray-300 bg-white px-3 py-1 text-xs font-bold text-gray-600 transition-transform hover:scale-105 active:scale-95"
          >
            지우기
          </button>
        )}
        <button
          type="button"
          onClick={saveHere}
          disabled={busy}
          className="rounded-full border-2 border-gray-800 bg-orange-100 px-3 py-1 font-jua text-sm text-orange-900 transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
        >
          {busy ? "위치 찾는 중…" : saved ? "지금 위치로 다시 저장" : "지금 위치를 우리 집으로"}
        </button>
      </div>
      <p className="text-[11px] font-bold text-gray-400">
        위치는 이 폰에만 저장되고 서버로 보내지 않아요
      </p>
      {error && (
        <p role="alert" className="text-xs font-bold text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
