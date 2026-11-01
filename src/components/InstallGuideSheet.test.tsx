import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import InstallGuideSheet from './InstallGuideSheet'

afterEach(cleanup)

describe('InstallGuideSheet', () => {
  it('shows the three iPhone steps and closes / never-agains', () => {
    const onClose = vi.fn()
    const onNeverAgain = vi.fn()
    render(
      <InstallGuideSheet
        mode={{ kind: 'install', device: 'iphone', browser: 'safari', outdated: false }}
        onClose={onClose}
        onNeverAgain={onNeverAgain}
      />
    )
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('아래쪽 공유 버튼(□↑)을 눌러요')).toBeTruthy()
    expect(screen.getByText("'홈 화면에 추가'를 눌러요")).toBeTruthy()
    expect(screen.getByText("홈 화면의 '나랑 놀자' 아이콘으로 열고 알림을 켜요")).toBeTruthy()
    fireEvent.click(screen.getByText('나중에 할게요'))
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByText('다시 보지 않기'))
    expect(onNeverAgain).toHaveBeenCalledTimes(1)
  })

  it('puts the iPad share button at the top right and warns old iOS', () => {
    render(
      <InstallGuideSheet
        mode={{ kind: 'install', device: 'ipad', browser: 'safari', outdated: true }}
        onClose={() => undefined}
      />
    )
    expect(screen.getByText('오른쪽 위 공유 버튼(□↑)을 눌러요')).toBeTruthy()
    expect(screen.getByText(/소프트웨어/)).toBeTruthy()
    expect(screen.queryByText('다시 보지 않기')).toBeNull()
  })

  it('says just "공유 버튼" in iOS Chrome', () => {
    render(
      <InstallGuideSheet
        mode={{ kind: 'install', device: 'iphone', browser: 'chrome', outdated: false }}
        onClose={() => undefined}
      />
    )
    expect(screen.getByText('공유 버튼(□↑)을 눌러요')).toBeTruthy()
  })

  it('offers the KakaoTalk external-open link and link copy in-app', () => {
    render(
      <InstallGuideSheet
        mode={{ kind: 'open-in-safari', device: 'iphone', app: 'kakaotalk' }}
        onClose={() => undefined}
      />
    )
    const open = screen.getByText('Safari로 열기') as HTMLAnchorElement
    expect(open.getAttribute('href')).toMatch(/^kakaotalk:\/\/web\/openExternal\?url=http/)
    expect(screen.getByText('링크 복사하기')).toBeTruthy()
  })

  it('has no Kakao link in other in-app browsers', () => {
    render(
      <InstallGuideSheet
        mode={{ kind: 'open-in-safari', device: 'iphone', app: 'instagram' }}
        onClose={() => undefined}
      />
    )
    expect(screen.queryByText('Safari로 열기')).toBeNull()
    expect(screen.getByText('오른쪽 위 ··· 버튼을 눌러요')).toBeTruthy()
  })

  it('runs the Android install prompt', () => {
    const onAndroidInstall = vi.fn()
    render(
      <InstallGuideSheet
        mode={{ kind: 'android-prompt' }}
        onClose={() => undefined}
        onAndroidInstall={onAndroidInstall}
      />
    )
    fireEvent.click(screen.getByText('홈 화면에 추가'))
    expect(onAndroidInstall).toHaveBeenCalledTimes(1)
  })
})
