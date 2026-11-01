"use client";

import { useCallback, useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import InstallGuideSheet, {
  type InstallSheetMode,
} from "@/components/InstallGuideSheet";
import { installGuideMode, readInstallEnv } from "@/lib/installGuide";

// Where the guide doesn't apply on its own (Android, desktop, or already on
// the Home Screen), `always` still shows the plain iPhone Safari steps.
const IPHONE_SAFARI: InstallSheetMode = {
  kind: "install",
  device: "iphone",
  browser: "safari",
  outdated: false,
};

interface InstallGuideLinkProps {
  /** Show the link on every device, not only an iPhone/iPad browser tab. */
  always?: boolean;
  className?: string;
}

/**
 * Small "아이폰에 설치하는 방법" link that reopens the install guide (e.g. in
 * the 설정 알림 area). Self-contained: renders its own guide card. By
 * default it only appears in an iPhone/iPad browser tab or in-app browser —
 * nothing on Android, desktop, or inside the Home Screen app. Renders
 * nothing until mounted, so there is no hydration mismatch.
 */
export default function InstallGuideLink({
  always = false,
  className = "",
}: InstallGuideLinkProps) {
  const [mode, setMode] = useState<InstallSheetMode | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const detected = installGuideMode(readInstallEnv());
    if (detected.kind !== "none") setMode(detected);
    else if (always) setMode(IPHONE_SAFARI);
  }, [always]);

  const close = useCallback(() => setOpen(false), []);

  if (!mode) return null;

  const label =
    mode.kind === "install" && mode.device === "ipad"
      ? "아이패드에 설치하는 방법"
      : "아이폰에 설치하는 방법";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 text-sm font-bold text-blue-700 underline underline-offset-2 transition-transform hover:scale-105 active:scale-95 ${className}`}
      >
        <Smartphone size={16} strokeWidth={2.5} aria-hidden />
        {label}
      </button>
      {open && (
        <InstallGuideSheet mode={mode} onClose={close} closeLabel="알겠어요" />
      )}
    </>
  );
}
