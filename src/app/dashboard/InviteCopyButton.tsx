"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Share2 } from "lucide-react";

interface InviteCopyButtonProps {
  groupName: string;
  inviteUrl: string;
  /** Sticker size, for the group card's top edge. */
  compact?: boolean;
}

/**
 * Small "초대하기" pill on a dashboard group card. Opens the phone's share
 * sheet (KakaoTalk, 문자, …) where the browser has one, otherwise copies the
 * link. The invite URL is computed on the server (`buildInviteUrl`).
 */
export default function InviteCopyButton({
  groupName,
  inviteUrl,
  compact = false,
}: InviteCopyButtonProps) {
  const iconSize = compact ? 12 : 14;
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  async function shareLink() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "나랑 놀자",
          text: `'${groupName}' 그룹에 초대해요! 같이 놀아요 🎈`,
          url: inviteUrl,
        });
        return;
      } catch (error) {
        // Closing the sheet is not a failure; anything else falls back to copy.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copyLink();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — show the link
      // so it can be copied by hand.
      window.prompt("초대 링크를 복사해주세요", inviteUrl);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void shareLink()}
      aria-label={`${groupName} 초대 링크 보내기`}
      className={`flex shrink-0 items-center gap-1 rounded-full border-gray-800 bg-pink-300 font-jua text-pink-900 transition-transform hover:scale-105 active:scale-95 ${
        compact
          ? "border-2 px-2 py-0.5 text-xs"
          : "border-4 px-3 py-1 text-sm shadow-[4px_4px_0px_rgba(31,41,55,0.25)]"
      }`}
    >
      {copied ? (
        <>
          <Check size={iconSize} strokeWidth={3} />
          복사됨
        </>
      ) : (
        <>
          <Share2 size={iconSize} strokeWidth={3} />
          초대하기
        </>
      )}
    </button>
  );
}
