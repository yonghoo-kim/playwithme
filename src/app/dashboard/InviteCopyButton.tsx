"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Share2 } from "lucide-react";

interface InviteCopyButtonProps {
  groupName: string;
  inviteUrl: string;
}

/**
 * Small "초대하기" pill next to the active group's name. The invite URL is
 * computed on the server (`buildInviteUrl`); this only copies it.
 */
export default function InviteCopyButton({
  groupName,
  inviteUrl,
}: InviteCopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — the full link
      // is still available on the Settings page.
    }
  }

  return (
    <button
      type="button"
      onClick={copyLink}
      aria-label={`${groupName} 초대 링크 복사`}
      className="flex shrink-0 items-center gap-1 rounded-full border-4 border-gray-800 bg-pink-300 px-3 py-1 font-jua text-sm text-pink-900 shadow-[4px_4px_0px_rgba(31,41,55,0.25)] transition-transform hover:scale-110 hover:-translate-y-1 active:scale-90 active:rotate-3"
    >
      {copied ? (
        <>
          <Check size={14} strokeWidth={3} />
          복사됨
        </>
      ) : (
        <>
          <Share2 size={14} strokeWidth={3} />
          초대하기
        </>
      )}
    </button>
  );
}
