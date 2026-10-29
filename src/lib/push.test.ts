import { describe, it, expect, vi } from 'vitest'
import { formatPushPayload, sendGroupPush, excludeToken, hasBatchim } from './push'

describe('formatPushPayload', () => {
  it('formats the exact spec copy, with a static app-name title', () => {
    expect(formatPushPayload('지훈', '단지 내 놀이터')).toEqual({
      title: '나랑 놀자 🎈',
      body: '지훈이가 단지 내 놀이터에 나왔어요! 같이 놀아요! 🎈',
    })
  })

  it('uses bare 가 (no 이 inserted) for a name with no final consonant', () => {
    expect(formatPushPayload('민호', '마트')).toEqual({
      title: '나랑 놀자 🎈',
      body: '민호가 마트에 나왔어요! 같이 놀아요! 🎈',
    })
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
})

describe('excludeToken', () => {
  it('removes exactly the given device token', () => {
    expect(excludeToken(['a', 'b', 'c'], 'b')).toEqual(['a', 'c'])
  })

  it('returns all tokens unchanged when no device token is given', () => {
    expect(excludeToken(['a', 'b'], null)).toEqual(['a', 'b'])
  })
})
