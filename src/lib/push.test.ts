import { describe, it, expect, vi } from 'vitest'
import { formatPushPayload, sendGroupPush } from './push'

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

describe('sendGroupPush', () => {
  it('returns success/failed tokens split from a multicast response, pruning failures', async () => {
    const messaging = {
      sendEachForMulticast: vi.fn().mockResolvedValue({
        responses: [{ success: true }, { success: false }],
      }),
    }
    const result = await sendGroupPush(messaging as any, ['tok-ok', 'tok-dead'], {
      title: 't', body: 'b',
    })
    expect(result.successTokens).toEqual(['tok-ok'])
    expect(result.failedTokens).toEqual(['tok-dead'])
  })
})
