"use client";

import { useState } from "react";
import { Check, Share2, Users } from "lucide-react";

interface GroupWithInvite {
  id: string;
  name: string;
  inviteUrl: string;
}

interface GroupListWithInvitesProps {
  groups: GroupWithInvite[];
}

/**
 * Lists every group the signed-in user belongs to, one row per group, each
 * with its own one-tap "copy invite link" button.
 */
export default function GroupListWithInvites({
  groups,
}: GroupListWithInvitesProps) {
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);

  async function copyLink(group: GroupWithInvite) {
    try {
      await navigator.clipboard.writeText(group.inviteUrl);
      setCopiedGroupId(group.id);
      setTimeout(
        () =>
          setCopiedGroupId((current) => (current === group.id ? null : current)),
        2000
      );
    } catch {
      // Clipboard API can be unavailable (e.g. insecure context); the link
      // text itself is still visible and selectable to copy by hand.
    }
  }

  if (groups.length === 0) {
    return (
      <p className="rounded-2xl border-4 border-gray-800 bg-white p-4 text-center text-sm font-bold text-blue-900 shadow-[4px_4px_0px_rgba(31,41,55,0.25)]">
        아직 그룹이 없어요! 초대 링크를 받거나 새 그룹을 만들어보세요 🎈
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {groups.map((group) => {
        const copied = copiedGroupId === group.id;

        return (
          <li
            key={group.id}
            className="flex items-center gap-3 rounded-2xl border-4 border-gray-800 bg-yellow-100 p-3 shadow-[4px_4px_0px_rgba(31,41,55,0.25)]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-300 shadow-md shadow-yellow-200">
              <Users size={20} strokeWidth={2.5} className="text-yellow-900" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate font-jua text-lg text-pink-700">
                {group.name}
              </p>
              <p className="truncate text-xs text-gray-600">
                {group.inviteUrl}
              </p>
            </div>

            <button
              type="button"
              onClick={() => copyLink(group)}
              aria-label={`${group.name} 초대 링크 복사`}
              className="flex shrink-0 items-center gap-1 rounded-2xl border-4 border-gray-800 bg-pink-300 px-3 py-1.5 font-jua text-sm text-pink-900 shadow-md shadow-pink-200 transition-transform hover:scale-110 hover:-translate-y-1 active:scale-90 active:rotate-3"
            >
              {copied ? (
                <>
                  <Check size={16} strokeWidth={3} />
                  복사됨
                </>
              ) : (
                <>
                  <Share2 size={16} strokeWidth={3} />
                  초대하기
                </>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
