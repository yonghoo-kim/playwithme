import { describe, it, expect } from 'vitest'
import { chatPushPayload, familyLabel, normalizeMessage, pickSenderChild } from './chat'

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
