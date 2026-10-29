"use client";

import { useState } from "react";
import { Baby, Check, Copy, KeyRound } from "lucide-react";

interface MyChildCardProps {
  childId: string;
  name: string;
  /** Groups this child is in (only the group names — no other children). */
  groups: { id: string; name: string }[];
}

/**
 * One child the signed-in user guards: its groups as chips, and a
 * "보호자 초대 링크 만들기" button that issues a single-use, 7-day guardian
 * invite link (`POST /api/children/guardian-invites`) to copy and send to a
 * co-guardian.
 */
export default function MyChildCard({ childId, name, groups }: MyChildCardProps) {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createGuardianLink() {
    setError(null);
    setCopied(false);
    setCreating(true);
    try {
      const res = await fetch("/api/children/guardian-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok || typeof body?.url !== "string") {
        setError(body?.error ?? "초대 링크를 만들지 못했어요.");
        return;
      }

      setInviteUrl(body.url);
    } catch {
      setError("초대 링크를 만들지 못했어요.");
    } finally {
      setCreating(false);
    }
  }

  async function copyLink() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (e.g. insecure context); the link
      // text itself is still visible and selectable to copy by hand.
    }
  }

  return (
    <div className="rounded-2xl border-4 border-gray-800 bg-white p-4 shadow-[4px_4px_0px_rgba(31,41,55,0.25)]">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-200 shadow-md shadow-blue-200">
          <Baby size={20} strokeWidth={2.5} className="text-blue-800" />
        </span>
        <h3 className="min-w-0 flex-1 truncate font-jua text-lg text-pink-700">
          {name}
        </h3>
      </div>

      {groups.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {groups.map((group) => (
            <span
              key={group.id}
              className="max-w-full truncate rounded-full border-2 border-gray-800 bg-yellow-200 px-3 py-0.5 text-xs font-bold text-yellow-900"
            >
              {group.name}
            </span>
          ))}
        </div>
      ) : (
        <p className="mb-4 text-sm font-bold text-gray-500">아직 그룹이 없어요</p>
      )}

      {inviteUrl ? (
        <div className="flex flex-col gap-2 rounded-2xl border-2 border-gray-800 bg-pink-50 p-3">
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 break-all text-xs text-gray-700 select-all">
              {inviteUrl}
            </p>
            <button
              type="button"
              onClick={copyLink}
              aria-label={`${name} 보호자 초대 링크 복사`}
              className="flex shrink-0 items-center gap-1 rounded-2xl border-4 border-gray-800 bg-pink-300 px-3 py-1.5 font-jua text-sm text-pink-900 shadow-[4px_4px_0px_rgba(31,41,55,0.25)] transition-transform hover:scale-105 active:scale-95"
            >
              {copied ? (
                <>
                  <Check size={16} strokeWidth={3} />
                  복사됨
                </>
              ) : (
                <>
                  <Copy size={16} strokeWidth={3} />
                  복사하기
                </>
              )}
            </button>
          </div>
          <p className="text-xs font-bold text-pink-700">
            한 번만 쓸 수 있고 7일 뒤에 만료돼요. 배우자처럼 함께 돌볼
            사람에게만 보내주세요
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={createGuardianLink}
          disabled={creating}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-4 border-gray-800 bg-green-300 py-2 font-jua text-green-900 shadow-[4px_4px_0px_rgba(31,41,55,0.25)] transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
        >
          <KeyRound size={18} strokeWidth={2.5} />
          보호자 초대 링크 만들기
        </button>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
