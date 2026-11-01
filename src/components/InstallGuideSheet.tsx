"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import {
  kakaoOpenExternalUrl,
  type InAppBrowser,
  type InstallGuideMode,
} from "@/lib/installGuide";

export type InstallSheetMode =
  | Exclude<InstallGuideMode, { kind: "none" }>
  /** Android Chrome offered `beforeinstallprompt`. */
  | { kind: "android-prompt" };

interface InstallGuideSheetProps {
  mode: InstallSheetMode;
  onClose: () => void;
  /** Shows the small "다시 보지 않기" link when given. */
  onNeverAgain?: () => void;
  /** android-prompt only: runs the browser's install prompt. */
  onAndroidInstall?: () => void;
  closeLabel?: string;
}

const APP_NAMES: Record<InAppBrowser, string> = {
  kakaotalk: "카카오톡",
  naver: "네이버 앱",
  instagram: "인스타그램",
  facebook: "페이스북",
  line: "라인",
};

const STROKE = "#1f2937";

// --- Little hand-drawn icons (48×48, thick outline like the cards). ---

function ShareIcon() {
  return (
    <svg viewBox="0 0 48 48" width="36" height="36" aria-hidden>
      <path
        d="M18 19h-4a2 2 0 0 0-2 2v17a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V21a2 2 0 0 0-2-2h-4"
        fill="#ffffff"
        stroke={STROKE}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24 29V7M17 14l7-7 7 7"
        fill="none"
        stroke="#2563eb"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AddToHomeIcon() {
  return (
    <svg viewBox="0 0 48 48" width="36" height="36" aria-hidden>
      <rect
        x="9"
        y="9"
        width="30"
        height="30"
        rx="8"
        fill="#ffffff"
        stroke={STROKE}
        strokeWidth="3.5"
      />
      <path
        d="M24 17v14M17 24h14"
        stroke="#db2777"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AppIcon() {
  return (
    <svg viewBox="0 0 48 48" width="36" height="36" aria-hidden>
      <rect
        x="5"
        y="9"
        width="32"
        height="32"
        rx="9"
        fill="#fbcfe8"
        stroke={STROKE}
        strokeWidth="3"
      />
      <circle cx="16" cy="23" r="2.2" fill={STROKE} />
      <circle cx="26" cy="23" r="2.2" fill={STROKE} />
      <path
        d="M15 29q6 5.5 12 0"
        fill="none"
        stroke={STROKE}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="37" cy="10" r="7.5" fill="#f87171" stroke={STROKE} strokeWidth="2.5" />
      <path
        d="M36 7.5l2-1.5v8"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 48 48" width="36" height="36" aria-hidden>
      <circle cx="24" cy="24" r="16" fill="#ffffff" stroke={STROKE} strokeWidth="3.5" />
      <circle cx="16" cy="24" r="2.8" fill={STROKE} />
      <circle cx="24" cy="24" r="2.8" fill={STROKE} />
      <circle cx="32" cy="24" r="2.8" fill={STROKE} />
    </svg>
  );
}

function SafariIcon() {
  return (
    <svg viewBox="0 0 48 48" width="36" height="36" aria-hidden>
      <circle cx="24" cy="24" r="16" fill="#ffffff" stroke={STROKE} strokeWidth="3.5" />
      <path d="M31 17l-9.5 4.5L17 31z" fill="#93c5fd" stroke={STROKE} strokeWidth="2" strokeLinejoin="round" />
      <path d="M31 17l-4.5 9.5L17 31z" fill="#f87171" stroke={STROKE} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function Step({
  n,
  icon,
  title,
  hint,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-yellow-50 p-3">
      <span className="relative shrink-0">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-gray-800 bg-sky-100">
          {icon}
        </span>
        <span className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-gray-800 bg-pink-300 font-jua text-sm text-pink-900">
          {n}
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-jua text-base leading-snug text-blue-900">
          {title}
        </span>
        {hint && (
          <span className="text-xs font-bold text-gray-600">{hint}</span>
        )}
      </span>
    </li>
  );
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older in-app web views: fall back to a hidden textarea.
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

const BUTTON =
  "rounded-2xl border-4 border-gray-800 py-2.5 font-jua text-lg transition-transform hover:scale-105 active:scale-95";

function VersionNote({ outdated }: { outdated: boolean }) {
  return outdated ? (
    <p className="rounded-2xl bg-red-50 p-3 text-xs font-bold text-red-600">
      지금 iOS 버전에서는 알림을 받을 수 없어요. 설정 → 일반 → 소프트웨어
      업데이트에서 iOS 16.4 이상으로 올려주세요 🙏
    </p>
  ) : (
    <p className="text-center text-xs font-bold text-gray-500">
      알림은 iOS 16.4 이상에서 받을 수 있어요
    </p>
  );
}

/**
 * The install guide card: illustrated "Add to Home Screen" steps for an iOS
 * browser tab, "open in Safari" for an in-app browser, or a one-tap install
 * when Android Chrome offers it. Rendered into <body> so a transformed
 * ancestor can't pin it; Escape or a tap outside closes it.
 */
export default function InstallGuideSheet({
  mode,
  onClose,
  onNeverAgain,
  onAndroidInstall,
  closeLabel = "나중에 할게요",
}: InstallGuideSheetProps) {
  const titleId = useId();
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pageUrl = typeof window === "undefined" ? "" : window.location.href;

  async function handleCopy() {
    setCopy((await copyText(pageUrl)) ? "copied" : "failed");
  }

  let title: string;
  let lead: string;
  let body: React.ReactNode;

  if (mode.kind === "install") {
    const safari = mode.browser === "safari";
    const ipad = mode.device === "ipad";
    title = ipad ? "아이패드에 설치해요 📲" : "아이폰에 설치해요 📲";
    lead = "홈 화면에 추가해야 친구가 놀이터에 나왔다는 알림을 받을 수 있어요!";
    body = (
      <>
        <ol className="flex flex-col gap-2">
          <Step
            n={1}
            icon={<ShareIcon />}
            title={
              safari
                ? ipad
                  ? "오른쪽 위 공유 버튼(□↑)을 눌러요"
                  : "아래쪽 공유 버튼(□↑)을 눌러요"
                : "공유 버튼(□↑)을 눌러요"
            }
            hint={
              safari
                ? ipad
                  ? "주소창 옆에 있어요"
                  : "안 보이면 오른쪽 아래 ··· 버튼을 먼저 눌러요"
                : "주소창 옆이나 ··· 메뉴 안에 있어요"
            }
          />
          <Step
            n={2}
            icon={<AddToHomeIcon />}
            title="'홈 화면에 추가'를 눌러요"
            hint="안 보이면 목록을 위로 밀어 보세요. 그다음 '추가'!"
          />
          <Step
            n={3}
            icon={<AppIcon />}
            title="홈 화면의 '나랑 놀자' 아이콘으로 열고 알림을 켜요"
            hint="앱 안의 설정 → 알림에서 켤 수 있어요"
          />
        </ol>
        <VersionNote outdated={mode.outdated} />
      </>
    );
  } else if (mode.kind === "open-in-safari") {
    const appName = APP_NAMES[mode.app];
    const menuAtTop = mode.app === "instagram" || mode.app === "facebook";
    title = "Safari로 열어주세요 🧭";
    lead = `${appName} 안에서는 홈 화면에 추가할 수 없어요. Safari로 열면 설치하고 알림도 받을 수 있어요!`;
    body = (
      <>
        {mode.app === "kakaotalk" && (
          <a
            href={kakaoOpenExternalUrl(pageUrl)}
            className={`${BUTTON} bg-sky-200 text-center text-sky-900`}
          >
            Safari로 열기
          </a>
        )}
        <ol className="flex flex-col gap-2">
          <Step
            n={1}
            icon={<MoreIcon />}
            title={`${menuAtTop ? "오른쪽 위" : "오른쪽 아래"} ··· 버튼을 눌러요`}
            hint={menuAtTop ? undefined : "위쪽에 있을 수도 있어요"}
          />
          <Step
            n={2}
            icon={<SafariIcon />}
            title="'Safari로 열기'를 눌러요"
            hint="'다른 브라우저로 열기'라고 되어 있을 수도 있어요"
          />
        </ol>
        <button
          type="button"
          onClick={handleCopy}
          className={`${BUTTON} bg-yellow-200 text-base text-yellow-900`}
        >
          {copy === "copied" ? "복사했어요! ✅" : "링크 복사하기"}
        </button>
        {copy === "copied" && (
          <p className="-mt-2 text-center text-xs font-bold text-gray-600">
            Safari 주소창에 붙여넣어 주세요
          </p>
        )}
        {copy === "failed" && (
          <p className="-mt-2 select-all break-all rounded-2xl bg-gray-50 p-2 text-center text-xs font-bold text-gray-600">
            {pageUrl}
          </p>
        )}
        <VersionNote outdated={false} />
      </>
    );
  } else {
    title = "홈 화면에 추가할까요? 📲";
    lead = "앱처럼 바로 열리고, 친구 알림도 놓치지 않아요!";
    body = (
      <button
        type="button"
        autoFocus
        onClick={onAndroidInstall}
        className={`${BUTTON} bg-pink-300 text-pink-900`}
      >
        홈 화면에 추가
      </button>
    );
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/30 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="animate-page-enter flex max-h-[calc(100dvh-2rem)] w-full max-w-sm flex-col gap-3 overflow-y-auto rounded-3xl border-4 border-gray-800 bg-white p-5 shadow-[4px_4px_0px_rgba(31,41,55,0.25)]"
      >
        <h2 id={titleId} className="text-center font-jua text-2xl text-pink-700">
          {title}
        </h2>
        <p className="text-center text-sm font-bold text-gray-600">{lead}</p>

        {body}

        <button
          type="button"
          autoFocus={mode.kind !== "android-prompt"}
          onClick={onClose}
          className={`${BUTTON} ${
            mode.kind === "android-prompt"
              ? "bg-gray-100 text-gray-600"
              : "bg-blue-200 text-blue-900"
          }`}
        >
          {closeLabel}
        </button>
        {onNeverAgain && (
          <button
            type="button"
            onClick={onNeverAgain}
            className="self-center text-sm font-bold text-gray-500 underline underline-offset-2 transition-transform hover:scale-105 active:scale-95"
          >
            다시 보지 않기
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}
