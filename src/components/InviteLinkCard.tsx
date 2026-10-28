"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

interface InviteLinkCardProps {
  inviteUrl: string;
}

/**
 * Shows the group's shareable invite link with a one-tap copy button.
 * Rendered whenever the signed-in user has a group — with or without a
 * child yet — since inviting another family doesn't depend on that.
 */
export default function InviteLinkCard({ inviteUrl }: InviteLinkCardProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (e.g. insecure context); the
      // link text itself is still visible and selectable to copy by hand.
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border-4 border-gray-800 bg-yellow-100 p-3 shadow-[4px_4px_0px_rgba(31,41,55,1)]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-300 shadow-md shadow-yellow-200">
        <Share2 size={20} strokeWidth={2.5} className="text-yellow-900" />
      </span>

      <p className="flex-1 truncate text-sm font-bold text-blue-900">
        {inviteUrl}
      </p>

      <button
        type="button"
        onClick={copyLink}
        className="flex shrink-0 items-center gap-1 rounded-2xl border-4 border-gray-800 bg-pink-300 px-3 py-1.5 font-jua text-sm text-pink-900 shadow-md shadow-pink-200 transition-transform hover:scale-110 hover:-translate-y-1 active:scale-90 active:rotate-3"
      >
        {copied ? (
          <>
            <Check size={16} strokeWidth={3} />
            복사됨
          </>
        ) : (
          "초대하기"
        )}
      </button>
    </div>
  );
}
