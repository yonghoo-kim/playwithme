import { afterEach, describe, expect, it } from 'vitest'
import {
  detectInAppBrowser,
  detectIOSBrowser,
  detectIOSDevice,
  installGuideMode,
  installGuideNeverAgain,
  installGuideSeenThisSession,
  iosVersion,
  isInstallGuidePath,
  isIOSVersionTooOld,
  kakaoOpenExternalUrl,
  markInstallGuideSeen,
  setInstallGuideNeverAgain,
} from './installGuide'

const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  iphoneSafariOld:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Mobile/15E148 Safari/604.1',
  ipadSafari:
    'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  // iPadOS Safari "Request Desktop Website" (the default) — same as a Mac.
  ipadDesktopSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  iosChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.88 Mobile/15E148 Safari/604.1',
  iosFirefox:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/125.0 Mobile/15E148 Safari/605.1.15',
  iosEdge:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 EdgiOS/124.0.2478.89 Mobile/15E148 Safari/605.1.15',
  iosKakao:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.7.5',
  iosNaver:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 NAVER(inapp; search; 2000; 12.5.3; 15PRO)',
  iosInstagram:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.0.0 (iPhone15,2; iOS 17_4; ko_KR; ko; scale=3.00; 1179x2556; 600000000)',
  iosFacebook:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/460.0.0.0;FBBV/1;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/17.4]',
  iosLine:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/14.5.0',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  androidKakao:
    'Mozilla/5.0 (Linux; Android 14; SM-S918N Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36;KAKAOTALK 2410750',
  macSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  windowsChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  whale:
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Whale/3.25.232.19 Mobile Safari/537.36',
}

describe('installGuideMode', () => {
  it('shows install steps in iPhone Safari', () => {
    expect(installGuideMode({ userAgent: UA.iphoneSafari, maxTouchPoints: 5 })).toEqual({
      kind: 'install',
      device: 'iphone',
      browser: 'safari',
      outdated: false,
    })
  })

  it('shows nothing once opened from the Home Screen', () => {
    expect(
      installGuideMode({ userAgent: UA.iphoneSafari, maxTouchPoints: 5, standalone: true })
    ).toEqual({ kind: 'none' })
  })

  it('treats a touch "Mac" (iPad desktop-mode Safari) as an iPad', () => {
    expect(installGuideMode({ userAgent: UA.ipadDesktopSafari, maxTouchPoints: 5 })).toEqual({
      kind: 'install',
      device: 'ipad',
      browser: 'safari',
      outdated: false,
    })
    expect(installGuideMode({ userAgent: UA.ipadSafari, maxTouchPoints: 5 })).toMatchObject({
      kind: 'install',
      device: 'ipad',
    })
  })

  it('shows install steps in iOS Chrome / Firefox / Edge (share menu, iOS 16.4+)', () => {
    expect(installGuideMode({ userAgent: UA.iosChrome, maxTouchPoints: 5 })).toMatchObject({
      kind: 'install',
      browser: 'chrome',
    })
    expect(installGuideMode({ userAgent: UA.iosFirefox, maxTouchPoints: 5 })).toMatchObject({
      kind: 'install',
      browser: 'firefox',
    })
    expect(installGuideMode({ userAgent: UA.iosEdge, maxTouchPoints: 5 })).toMatchObject({
      kind: 'install',
      browser: 'edge',
    })
  })

  it('flags iOS below 16.4 as outdated', () => {
    expect(installGuideMode({ userAgent: UA.iphoneSafariOld, maxTouchPoints: 5 })).toMatchObject({
      kind: 'install',
      outdated: true,
    })
  })

  it('asks to open Safari from the KakaoTalk in-app browser', () => {
    expect(installGuideMode({ userAgent: UA.iosKakao, maxTouchPoints: 5 })).toEqual({
      kind: 'open-in-safari',
      device: 'iphone',
      app: 'kakaotalk',
    })
  })

  it('shows nothing on Android or desktop', () => {
    expect(installGuideMode({ userAgent: UA.androidChrome, maxTouchPoints: 5 })).toEqual({
      kind: 'none',
    })
    expect(installGuideMode({ userAgent: UA.androidKakao, maxTouchPoints: 5 })).toEqual({
      kind: 'none',
    })
    expect(installGuideMode({ userAgent: UA.macSafari, maxTouchPoints: 0 })).toEqual({
      kind: 'none',
    })
    expect(installGuideMode({ userAgent: UA.windowsChrome, maxTouchPoints: 0 })).toEqual({
      kind: 'none',
    })
  })
})

describe('detectInAppBrowser', () => {
  it('recognises the common Korean in-app browsers', () => {
    expect(detectInAppBrowser(UA.iosKakao)).toBe('kakaotalk')
    expect(detectInAppBrowser(UA.androidKakao)).toBe('kakaotalk')
    expect(detectInAppBrowser(UA.iosNaver)).toBe('naver')
    expect(detectInAppBrowser(UA.iosInstagram)).toBe('instagram')
    expect(detectInAppBrowser(UA.iosFacebook)).toBe('facebook')
    expect(detectInAppBrowser(UA.iosLine)).toBe('line')
  })

  it('leaves real browsers alone', () => {
    for (const ua of [UA.iphoneSafari, UA.iosChrome, UA.androidChrome, UA.windowsChrome, UA.whale]) {
      expect(detectInAppBrowser(ua)).toBeNull()
    }
  })
})

describe('detectIOSDevice', () => {
  it('needs touch to call a Mac UA an iPad', () => {
    expect(detectIOSDevice({ userAgent: UA.macSafari })).toBeNull()
    expect(detectIOSDevice({ userAgent: UA.macSafari, maxTouchPoints: 1 })).toBeNull()
    expect(detectIOSDevice({ userAgent: UA.macSafari, maxTouchPoints: 5 })).toBe('ipad')
  })

  it('reads iPhone / iPad from the UA', () => {
    expect(detectIOSDevice({ userAgent: UA.iphoneSafari })).toBe('iphone')
    expect(detectIOSDevice({ userAgent: UA.ipadSafari })).toBe('ipad')
    expect(detectIOSDevice({ userAgent: UA.androidChrome, maxTouchPoints: 5 })).toBeNull()
  })
})

describe('detectIOSBrowser', () => {
  it('tells Safari from other iOS browsers', () => {
    expect(detectIOSBrowser(UA.iphoneSafari)).toBe('safari')
    expect(detectIOSBrowser(UA.ipadDesktopSafari)).toBe('safari')
    expect(detectIOSBrowser(UA.iosChrome)).toBe('chrome')
    expect(detectIOSBrowser(UA.iosFirefox)).toBe('firefox')
    expect(detectIOSBrowser(UA.iosEdge)).toBe('edge')
    // Web views carry no "Version/… Safari/" pair.
    expect(detectIOSBrowser(UA.iosKakao)).toBe('other')
  })
})

describe('iosVersion', () => {
  it('parses iPhone and iPad UAs', () => {
    expect(iosVersion(UA.iphoneSafari)).toEqual([17, 4])
    expect(iosVersion(UA.ipadSafari)).toEqual([17, 0])
    expect(iosVersion(UA.iphoneSafariOld)).toEqual([16, 3])
  })

  it('is unknown for desktop-mode iPads and other systems', () => {
    expect(iosVersion(UA.ipadDesktopSafari)).toBeNull()
    expect(iosVersion(UA.androidChrome)).toBeNull()
  })

  it('treats only known versions below 16.4 as too old', () => {
    expect(isIOSVersionTooOld(UA.iphoneSafariOld)).toBe(true)
    expect(isIOSVersionTooOld(UA.iphoneSafari)).toBe(false)
    expect(isIOSVersionTooOld(UA.iphoneSafari.replace('17_4', '16_4'))).toBe(false)
    expect(isIOSVersionTooOld(UA.iphoneSafari.replace('17_4', '15_8'))).toBe(true)
    expect(isIOSVersionTooOld(UA.ipadDesktopSafari)).toBe(false)
  })
})

describe('kakaoOpenExternalUrl', () => {
  it('encodes the page URL', () => {
    expect(kakaoOpenExternalUrl('https://narangnol.vercel.app/dashboard?x=1&y=2')).toBe(
      'kakaotalk://web/openExternal?url=https%3A%2F%2Fnarangnol.vercel.app%2Fdashboard%3Fx%3D1%26y%3D2'
    )
  })
})

describe('isInstallGuidePath', () => {
  it('is true for the signed-in app screens', () => {
    expect(isInstallGuidePath('/dashboard')).toBe(true)
    expect(isInstallGuidePath('/settings')).toBe(true)
    expect(isInstallGuidePath('/chat/abc')).toBe(true)
    expect(isInstallGuidePath('/chat/direct/xyz')).toBe(true)
  })

  it('is false for the landing, auth and look-alike paths', () => {
    expect(isInstallGuidePath('/')).toBe(false)
    expect(isInstallGuidePath('/login')).toBe(false)
    expect(isInstallGuidePath('/signup')).toBe(false)
    expect(isInstallGuidePath('/dashboards')).toBe(false)
    expect(isInstallGuidePath(null)).toBe(false)
  })
})

describe('storage helpers', () => {
  afterEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  it('remembers "다시 보지 않기" and once-per-session', () => {
    expect(installGuideNeverAgain()).toBe(false)
    setInstallGuideNeverAgain()
    expect(installGuideNeverAgain()).toBe(true)

    expect(installGuideSeenThisSession()).toBe(false)
    markInstallGuideSeen()
    expect(installGuideSeenThisSession()).toBe(true)
  })
})
