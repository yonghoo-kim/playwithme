import { describe, it, expect } from 'vitest'
import {
  addIncomingMessage,
  conversationKeyForRow,
  directConversationKey,
  formatUnreadCount,
  groupConversationKey,
  toUnreadMap,
  totalUnread,
} from './unread'

const A = '0b6f9c1e-0000-4000-8000-000000000001'
const B = 'f3a1d2c4-0000-4000-8000-000000000002'

describe('conversation keys', () => {
  it('builds a group key', () => {
    expect(groupConversationKey('ABC')).toBe('g:abc')
  })

  it('builds the same direct key from either side, smaller id first', () => {
    expect(directConversationKey(A, B)).toBe(`d:${A}:${B}`)
    expect(directConversationKey(B, A)).toBe(`d:${A}:${B}`)
  })

  it('keys realtime rows', () => {
    expect(conversationKeyForRow('group_messages', { group_id: A })).toBe(`g:${A}`)
    expect(
      conversationKeyForRow('direct_messages', { child_low: A, child_high: B })
    ).toBe(`d:${A}:${B}`)
    expect(conversationKeyForRow('group_messages', {})).toBeNull()
    expect(conversationKeyForRow('direct_messages', { child_low: A })).toBeNull()
  })
})

describe('formatUnreadCount', () => {
  it('hides zero and missing counts', () => {
    expect(formatUnreadCount(0)).toBeNull()
    expect(formatUnreadCount(undefined)).toBeNull()
    expect(formatUnreadCount(null)).toBeNull()
    expect(formatUnreadCount(-3)).toBeNull()
  })

  it('shows 1..9 and caps at 9+', () => {
    expect(formatUnreadCount(1)).toBe('1')
    expect(formatUnreadCount(9)).toBe('9')
    expect(formatUnreadCount(10)).toBe('9+')
    expect(formatUnreadCount(250)).toBe('9+')
  })
})

describe('toUnreadMap', () => {
  it('is null when the rows are missing (RPC failed)', () => {
    expect(toUnreadMap(null)).toBeNull()
    expect(toUnreadMap(undefined)).toBeNull()
  })

  it('maps rows, coercing bigint strings and dropping zeros', () => {
    expect(
      toUnreadMap([
        { conversation: 'g:1', unread: 3 },
        { conversation: 'd:1:2', unread: '12' },
        { conversation: 'g:2', unread: 0 },
      ])
    ).toEqual({ 'g:1': 3, 'd:1:2': 12 })
  })
})

describe('addIncomingMessage', () => {
  it('counts messages from others', () => {
    expect(addIncomingMessage({ 'g:1': 2 }, 'g:1', 'them', 'me')).toEqual({ 'g:1': 3 })
    expect(addIncomingMessage({}, 'g:2', 'them', 'me')).toEqual({ 'g:2': 1 })
  })

  it('ignores my own messages and unknown conversations (same object back)', () => {
    const map = { 'g:1': 2 }
    expect(addIncomingMessage(map, 'g:1', 'me', 'me')).toBe(map)
    expect(addIncomingMessage(map, null, 'them', 'me')).toBe(map)
    expect(addIncomingMessage(map, 'g:1', undefined, 'me')).toBe(map)
  })
})

describe('totalUnread', () => {
  it('sums every conversation', () => {
    expect(totalUnread({ 'g:1': 3, 'd:1:2': 12 })).toBe(15)
    expect(totalUnread({})).toBe(0)
    expect(totalUnread(null)).toBe(0)
  })
})
