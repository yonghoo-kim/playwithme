"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import InstallGuideSheet, {
  type InstallSheetMode,
} from "@/components/InstallGuideSheet";
import {
  installGuideMode,
  installGuideNeverAgain,
  installGuideSeenThisSession,
  isInstallGuidePath,
  markInstallGuideSeen,
  readInstallEnv,
  setInstallGuideNeverAgain,
} from "@/lib/installGuide";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Let the screen draw first so the card doesn't land on a blank page.
const SHOW_DELAY_MS = 700;

/**
 * Mounted once in the root layout. On the signed-in screens (dashboard,
 * settings, chat) it pops the install guide once per browser session when
 * an iPhone/iPad isn't running the Home Screen app — there, web push can't
 * work. "다시 보지 않기" turns it off for good on this device. On Android,
 * when Chrome offers `beforeinstallprompt`, it offers a one-tap install
 * instead. Renders nothing elsewhere (the landing page is untouched).
 */
export default function InstallGuide() {
  const pathname = usePathname();
  const [mode, setMode] = useState<InstallSheetMode | null>(null);
  const [androidReady, setAndroidReady] = useState(false);
  const installEvent = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function onBeforeInstall(event: Event) {
      // Turned off on this device: leave Chrome's own install UI alone.
      if (installGuideNeverAgain()) return;
      event.preventDefault();
      installEvent.current = event as BeforeInstallPromptEvent;
      setAndroidReady(true);
    }
    function onInstalled() {
      installEvent.current = null;
      setAndroidReady(false);
      setMode(null);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const onAppPage = isInstallGuidePath(pathname);

  useEffect(() => {
    if (!onAppPage) {
      setMode(null);
      return;
    }
    if (installGuideNeverAgain() || installGuideSeenThisSession()) return;

    const timer = setTimeout(() => {
      const detected = installGuideMode(readInstallEnv());
      const next: InstallSheetMode | null =
        detected.kind !== "none"
          ? detected
          : androidReady && installEvent.current
            ? { kind: "android-prompt" }
            : null;
      if (!next) return;
      markInstallGuideSeen();
      setMode(next);
    }, SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [onAppPage, androidReady]);

  const close = useCallback(() => setMode(null), []);

  const neverAgain = useCallback(() => {
    setInstallGuideNeverAgain();
    setMode(null);
  }, []);

  const androidInstall = useCallback(async () => {
    const event = installEvent.current;
    setMode(null);
    if (!event) return;
    // A prompt event can only be used once.
    installEvent.current = null;
    setAndroidReady(false);
    try {
      await event.prompt();
      await event.userChoice;
    } catch {
      // Prompt refused by the browser: nothing else to do.
    }
  }, []);

  if (!mode) return null;

  return (
    <InstallGuideSheet
      mode={mode}
      onClose={close}
      onNeverAgain={neverAgain}
      onAndroidInstall={androidInstall}
    />
  );
}
