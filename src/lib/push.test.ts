import { describe, it, expect, vi } from 'vitest'
import { formatPushPayload, sendGroupPush, excludeToken, hasBatchim } from './push'

describe('formatPushPayload', () => {
  it('titles the notification with the group name and uses 이 after a final consonant', () => {
    expect(formatPushPayload('고이현', '단지 내 놀이터', ['가재울어린이집'])).toEqual({
      title: '가재울어린이집',
      body: '고이현이 단지 내 놀이터에 나왔어요! 같이 놀아요! 🎈',
    })
  })

  it('uses 가 after an open syllable and announces going home', () => {
    expect(formatPushPayload('김하나', null, ['말띠모임'])).toEqual({
      title: '말띠모임',
      body: '김하나가 집에 갔어요 🏠',
    })
  })

  it('announces 가는 중 with 로/으로 picked by the place name', () => {
    expect(formatPushPayload('고이현', '놀이터', ['가재울어린이집'], true).body).toBe(
      '고이현이 놀이터로 가는 중이에요 🚶'
    )
    expect(formatPushPayload('김하나', '학원', [], true).body).toBe(
      '김하나가 학원으로 가는 중이에요 🚶'
    )
  })

  it('announces going home (no place) as 집으로 가는 중', () => {
    expect(formatPushPayload('김하나', null, ['말띠모임'], true)).toEqual({
      title: '말띠모임',
      body: '김하나가 집으로 가는 중이에요 🚶',
    })
  })

  it('keeps the arrival wording when going is false', () => {
    expect(formatPushPayload('고이현', '놀이터', [], false).body).toBe(
      '고이현이 놀이터에 나왔어요! 같이 놀아요! 🎈'
    )
  })

  it('joins several shared groups and falls back to the app name with none', () => {
    expect(formatPushPayload('지훈', null, ['어린이집', '아파트']).title).toBe('어린이집 · 아파트')
    expect(formatPushPayload('지훈', null, []).title).toBe('나랑 놀자')
  })
})

describe('hasBatchim', () => {
  it('is true for a name ending in a final consonant', () => {
    expect(hasBatchim('지훈')).toBe(true)
    expect(hasBatchim('서윤')).toBe(true)
  })

  it('is false for a name ending in an open syllable', () => {
    expect(hasBatchim('민호')).toBe(false)
    expect(hasBatchim('하나')).toBe(false)
  })

  it('is false for non-Hangul endings and empty strings', () => {
    expect(hasBatchim('Mia')).toBe(false)
    expect(hasBatchim('')).toBe(false)
  })
})

describe('sendGroupPush', () => {
  it('returns success/failed tokens split from a multicast response, pruning failures', async () => {
    const messaging = {
      sendEachForMulticast: vi.fn().mockResolvedValue({
        responses: [{ success: true }, { success: false }],
      }),
    }
    const result = await sendGroupPush(messaging, ['tok-ok', 'tok-dead'], {
      title: 't', body: 'b',
    })
    expect(result.successTokens).toEqual(['tok-ok'])
    expect(result.failedTokens).toEqual(['tok-dead'])
  })

  it('sends a data-only message so the service worker shows exactly one notification', async () => {
    const messaging = {
      sendEachForMulticast: vi.fn().mockResolvedValue({ responses: [{ success: true }] }),
    }
    await sendGroupPush(messaging, ['tok'], { title: 't', body: 'b' }, { tag: 'child-1' })
    const message = messaging.sendEachForMulticast.mock.calls[0][0]
    expect(message).not.toHaveProperty('notification')
    expect(message).toEqual({
      tokens: ['tok'],
      data: { title: 't', body: 'b', tag: 'child-1', url: '/dashboard' },
    })
  })
})

describe('excludeToken', () => {
  it('removes exactly the given device token', () => {
    expect(excludeToken(['a', 'b', 'c'], 'b')).toEqual(['a', 'c'])
  })

  it('returns all tokens unchanged when no device token is given', () => {
    expect(excludeToken(['a', 'b'], null)).toEqual(['a', 'b'])
  })
})
