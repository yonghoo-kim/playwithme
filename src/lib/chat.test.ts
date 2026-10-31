import { describe, it, expect } from 'vitest'
import {
  chatPushPayload,
  directChatCandidates,
  directChatTitle,
  directChatUrl,
  directPair,
  directPushPayload,
  familyLabel,
  mergeMessages,
  normalizeMessage,
  pickSenderChild,
  toChatMessage,
  type ChatMessage,
} from './chat'

function msg(id: string, createdAt: string, body = id): ChatMessage {
  return { id, userId: 'u', childId: 'c', body, createdAt }
}

describe('mergeMessages', () => {
  it('appends new messages and keeps each id once', () => {
    const current = [msg('a', '2026-10-31T01:00:00Z'), msg('b', '2026-10-31T01:01:00Z')]
    const merged = mergeMessages(current, [
      msg('b', '2026-10-31T01:01:00Z', 'dup'),
      msg('c', '2026-10-31T01:02:00Z'),
    ])
    expect(merged.map((m) => m.id)).toEqual(['a', 'b', 'c'])
    expect(merged[1].body).toBe('b') // the copy already shown wins
  })

  it('returns the same array when nothing is new (no re-render)', () => {
    const current = [msg('a', '2026-10-31T01:00:00Z')]
    expect(mergeMessages(current, [msg('a', '2026-10-31T01:00:00Z')])).toBe(current)
    expect(mergeMessages(current, [])).toBe(current)
  })

  it('puts messages missed while away in time order, across timestamp formats', () => {
    // Realtime arrived first (c); the refetch brings the missed b.
    const current = [msg('a', '2026-10-31T01:00:00+00:00'), msg('c', '2026-10-31T10:05:00.123456+09:00')]
    const merged = mergeMessages(current, [
      msg('a', '2026-10-31T01:00:00+00:00'),
      msg('b', '2026-10-31T01:03:00.5Z'),
      msg('c', '2026-10-31T10:05:00.123456+09:00'),
    ])
    expect(merged.map((m) => m.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('toChatMessage', () => {
  it('maps a database row to the screen shape', () => {
    expect(
      toChatMessage({ id: '1', user_id: 'u', child_id: null, body: 'hi', created_at: 't' })
    ).toEqual({ id: '1', userId: 'u', childId: null, body: 'hi', createdAt: 't' })
  })
})

describe('directPair', () => {
  const x = '11111111-1111-4111-8111-111111111111'
  const y = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

  it('puts the smaller id first whichever side asks', () => {
    expect(directPair(x, y)).toEqual({ low: x, high: y })
    expect(directPair(y, x)).toEqual({ low: x, high: y })
  })

  it('normalizes case so both families get the same key', () => {
    expect(directPair(y.toUpperCase(), x)).toEqual({ low: x, high: y })
  })
})

describe('directChatCandidates', () => {
  const rows = [
    { child_id: 'mine1', group_id: 'g1' },
    { child_id: 'mine2', group_id: 'g2' },
    { child_id: 'friend', group_id: 'g1' },
    { child_id: 'friend', group_id: 'g3' },
    { child_id: 'other', group_id: 'g2' },
  ]

  it('keeps only my children that share a group with the friend', () => {
    expect(directChatCandidates(['mine1', 'mine2'], 'friend', rows)).toEqual(['mine1'])
  })

  it('is empty when nothing is shared or the friend is in no group', () => {
    expect(directChatCandidates(['mine2'], 'friend', rows)).toEqual([])
    expect(directChatCandidates(['mine1'], 'nobody', rows)).toEqual([])
  })

  it('never offers a chat with my own child', () => {
    expect(directChatCandidates(['friend', 'mine1'], 'friend', rows)).toEqual(['mine1'])
  })
})

describe('direct chat labels', () => {
  it('titles the screen with the friend family', () => {
    expect(directChatTitle('지훈')).toBe('지훈이네와 채팅')
    expect(directChatTitle('하나')).toBe('하나네와 채팅')
  })

  it('titles the push with the sending family and a one-line body', () => {
    expect(directPushPayload('지훈이네', '언제\n와?')).toEqual({
      title: '지훈이네 💬',
      body: '언제 와?',
    })
  })

  it('links to the friend with my child in the query', () => {
    expect(directChatUrl('f1', 'm1')).toBe('/chat/direct/f1?child=m1')
  })
})

describe('familyLabel', () => {
  it('adds 이네 after a final consonant and 네 otherwise', () => {
    expect(familyLabel('지훈')).toBe('지훈이네')
    expect(familyLabel('하나')).toBe('하나네')
  })
})

describe('normalizeMessage', () => {
  it('trims and keeps normal text', () => {
    expect(normalizeMessage('  언제 와?  ')).toBe('언제 와?')
  })

  it('rejects empty or whitespace-only text', () => {
    expect(normalizeMessage('   ')).toBeNull()
    expect(normalizeMessage('')).toBeNull()
  })

  it('squeezes long runs of blank lines and caps at 500 characters', () => {
    expect(normalizeMessage('a\n\n\n\n\nb')).toBe('a\n\nb')
    expect(normalizeMessage('가'.repeat(600))).toHaveLength(500)
  })
})

describe('chatPushPayload', () => {
  it('titles with the group and prefixes the family label', () => {
    expect(chatPushPayload('가재울어린이집', '지훈이네', '언제 와?')).toEqual({
      title: '가재울어린이집',
      body: '지훈이네: 언제 와?',
    })
  })

  it('shortens long messages to one line', () => {
    const { body } = chatPushPayload('g', '하나네', '줄\n바꿈 ' + '가'.repeat(100))
    expect(body.startsWith('하나네: 줄 바꿈')).toBe(true)
    expect(body.endsWith('…')).toBe(true)
    expect(body.length).toBeLessThanOrEqual('하나네: '.length + 81)
  })
})

describe('pickSenderChild', () => {
  it('prefers the active child when it is in the group', () => {
    expect(pickSenderChild(['a', 'b'], 'b')).toBe('b')
  })

  it('falls back to the first of my children in the group', () => {
    expect(pickSenderChild(['a', 'b'], 'z')).toBe('a')
    expect(pickSenderChild(['a'], null)).toBe('a')
  })

  it('is null when none of my children are in the group', () => {
    expect(pickSenderChild([], 'a')).toBeNull()
  })
})
