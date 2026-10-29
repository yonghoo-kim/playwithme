"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type Timer = ReturnType<typeof setTimeout>;

// Thin pastel-pink bar across the top of the viewport during client-side
// route changes. Starts when an in-app link to a different pathname is
// clicked and completes once the new pathname has rendered. A safety
// timeout finishes it if the navigation never lands (e.g. it was cancelled).
export default function NavigationProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  const activeRef = useRef(false);
  const trickleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const safetyRef = useRef<Timer | null>(null);
  const hideRef = useRef<Timer | null>(null);
  const resetRef = useRef<Timer | null>(null);

  const clearTimers = useCallback(() => {
    if (trickleRef.current) clearInterval(trickleRef.current);
    if (safetyRef.current) clearTimeout(safetyRef.current);
    if (hideRef.current) clearTimeout(hideRef.current);
    if (resetRef.current) clearTimeout(resetRef.current);
    trickleRef.current = null;
    safetyRef.current = null;
    hideRef.current = null;
    resetRef.current = null;
  }, []);

  const done = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    clearTimers();
    setProgress(100);
    hideRef.current = setTimeout(() => {
      setVisible(false);
      resetRef.current = setTimeout(() => setProgress(0), 250);
    }, 200);
  }, [clearTimers]);

  const start = useCallback(() => {
    clearTimers();
    activeRef.current = true;
    setVisible(true);
    setProgress(10);
    trickleRef.current = setInterval(() => {
      // Ease toward 90% without ever reaching it until the route lands.
      setProgress((p) => p + (90 - p) * 0.12);
    }, 200);
    safetyRef.current = setTimeout(done, 10000);
  }, [clearTimers, done]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const target = e.target as Element | null;
      const anchor = target?.closest?.("a[href]");
      if (!anchor) return;
      const linkTarget = anchor.getAttribute("target");
      if (linkTarget && linkTarget !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;

      start();
    }

    // Capture phase: next/link calls preventDefault() in its own handler,
    // so a bubbling listener would not be able to tell real navigations apart.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [start]);

  // The new route has rendered: finish the bar.
  useEffect(() => {
    done();
  }, [pathname, done]);

  useEffect(() => clearTimers, [clearTimers]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px]"
    >
      <div
        className="h-full rounded-r-full bg-pink-400 shadow-[0_0_8px_rgba(244,114,182,0.7)] transition-[width,opacity] duration-200 ease-out motion-reduce:transition-none"
        style={{ width: `${progress}%`, opacity: visible ? 1 : 0 }}
      />
    </div>
  );
}
