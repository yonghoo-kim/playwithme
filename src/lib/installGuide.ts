/**
 * "Add to Home Screen" guide for iPhone/iPad. On iOS, web push only works
 * in a web app opened from the Home Screen (iOS 16.4+), so a parent using
 * the app in a Safari tab never gets friends' notifications. This module
 * decides which guide (if any) a browser should see; it is pure apart from
 * the small storage / environment readers at the bottom.
 */

export type IOSDevice = "iphone" | "ipad";

/** Browser on iOS. Since iOS 16.4 all of them can add to the Home Screen. */
export type IOSBrowser = "safari" | "chrome" | "firefox" | "edge" | "other";

/** In-app browsers (web views inside an app) — no Add to Home Screen. */
export type InAppBrowser =
  | "kakaotalk"
  | "naver"
  | "instagram"
  | "facebook"
  | "line";

export interface InstallEnv {
  userAgent: string;
  /** `navigator.maxTouchPoints` — iPadOS Safari in desktop mode says "Mac". */
  maxTouchPoints?: number;
  /** Opened from the Home Screen (`navigator.standalone` / display-mode). */
  standalone?: boolean;
}

export type InstallGuideMode =
  | {
      kind: "install";
      device: IOSDevice;
      browser: IOSBrowser;
      /** The UA's iOS version is known and below 16.4 (no web push yet). */
      outdated: boolean;
    }
  | { kind: "open-in-safari"; device: IOSDevice; app: InAppBrowser }
  | { kind: "none" };

const IN_APP_PATTERNS: [InAppBrowser, RegExp][] = [
  ["kakaotalk", /KAKAOTALK/i],
  // Upper-case only: the Whale browser never says NAVER, the app always does.
  ["naver", /NAVER/],
  ["instagram", /Instagram/],
  ["facebook", /FBAN|FBAV|FBIOS/],
  ["line", /\bLine\//],
];

export function detectInAppBrowser(userAgent: string): InAppBrowser | null {
  for (const [app, pattern] of IN_APP_PATTERNS) {
    if (pattern.test(userAgent)) return app;
  }
  return null;
}

/** iPhone / iPad (including iPadOS Safari reporting as a Mac), else null. */
export function detectIOSDevice(env: InstallEnv): IOSDevice | null {
  const ua = env.userAgent;
  if (/iPhone|iPod/.test(ua)) return "iphone";
  if (/iPad/.test(ua)) return "ipad";
  // iPadOS 13+ requests desktop sites with a Mac UA; real Macs have no touch.
  if (/Macintosh/.test(ua) && (env.maxTouchPoints ?? 0) > 1) return "ipad";
  return null;
}

export function detectIOSBrowser(userAgent: string): IOSBrowser {
  if (/CriOS\//.test(userAgent)) return "chrome";
  if (/FxiOS\//.test(userAgent)) return "firefox";
  if (/EdgiOS\//.test(userAgent)) return "edge";
  if (
    /Version\/[\d.]+.*Safari\//.test(userAgent) &&
    !/Whale\/|OPT\/|DuckDuckGo\/|YaBrowser\/|GSA\//.test(userAgent)
  ) {
    return "safari";
  }
  return "other";
}

/**
 * iOS version from an iPhone/iPad UA ("CPU iPhone OS 17_4 like Mac OS X"),
 * or null when it can't be read (desktop-mode iPad, non-iOS).
 */
export function iosVersion(userAgent: string): [number, number] | null {
  if (!/iPhone|iPad|iPod/.test(userAgent)) return null;
  const match = /OS (\d+)(?:_(\d+))?/.exec(userAgent);
  if (!match) return null;
  return [Number(match[1]), Number(match[2] ?? 0)];
}

/** Web push on iOS needs 16.4+. Unknown versions are given the benefit. */
export function isIOSVersionTooOld(userAgent: string): boolean {
  const version = iosVersion(userAgent);
  if (!version) return false;
  const [major, minor] = version;
  return major < 16 || (major === 16 && minor < 4);
}

/**
 * Which guide this browser should see: install steps (iOS browser tab),
 * "open in Safari" (iOS in-app browser), or nothing (already on the Home
 * Screen, Android, desktop).
 */
export function installGuideMode(env: InstallEnv): InstallGuideMode {
  if (env.standalone) return { kind: "none" };
  const device = detectIOSDevice(env);
  if (!device) return { kind: "none" };
  const app = detectInAppBrowser(env.userAgent);
  if (app) return { kind: "open-in-safari", device, app };
  return {
    kind: "install",
    device,
    browser: detectIOSBrowser(env.userAgent),
    outdated: isIOSVersionTooOld(env.userAgent),
  };
}

/** KakaoTalk's in-app browser hands this URL to the default browser. */
export function kakaoOpenExternalUrl(url: string): string {
  return `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
}

const APP_PATH_PREFIXES = ["/dashboard", "/settings", "/chat"];

/** Signed-in app screens where the guide may pop up by itself. */
export function isInstallGuidePath(pathname: string | null): boolean {
  if (!pathname) return false;
  return APP_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

// --- Browser-only helpers (each degrades silently without storage). ---

const NEVER_KEY = "playwithme_install_guide_never";
const SEEN_KEY = "playwithme_install_guide_seen";

/** "다시 보지 않기" was chosen on this device. */
export function installGuideNeverAgain(): boolean {
  try {
    return window.localStorage.getItem(NEVER_KEY) === "1";
  } catch {
    return false;
  }
}

export function setInstallGuideNeverAgain(): void {
  try {
    window.localStorage.setItem(NEVER_KEY, "1");
  } catch {
    // Without storage it may show again next session; harmless.
  }
}

/** Already popped up once in this browser session. */
export function installGuideSeenThisSession(): boolean {
  try {
    return window.sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markInstallGuideSeen(): void {
  try {
    window.sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Same as above.
  }
}

/** The current browser's environment (call after mount). */
export function readInstallEnv(): InstallEnv {
  const nav = navigator as Navigator & { standalone?: boolean };
  let standalone = nav.standalone === true;
  try {
    standalone =
      standalone ||
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches;
  } catch {
    // No matchMedia: navigator.standalone alone decides.
  }
  return {
    userAgent: nav.userAgent,
    maxTouchPoints: nav.maxTouchPoints ?? 0,
    standalone,
  };
}
