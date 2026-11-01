import { describe, it, expect } from 'vitest'
import {
  decideChildRemoval,
  hasOtherGuardians,
  nextActiveChildId,
  groupsEmptiedBy,
  deleteChildMessage,
} from './childRemoval'

describe('decideChildRemoval', () => {
  it('keeps the child while another guardian remains', () => {
    expect(decideChildRemoval(['u2'])).toBe('keep_child')
    expect(decideChildRemoval(['u2', 'u3'])).toBe('keep_child')
  })

  it('deletes the child once nobody guards it', () => {
    expect(decideChildRemoval([])).toBe('delete_child')
  })
})

describe('hasOtherGuardians', () => {
  it('is false when I am the only guardian', () => {
    expect(hasOtherGuardians(['me'], 'me')).toBe(false)
    expect(hasOtherGuardians([], 'me')).toBe(false)
  })

  it('is true when someone else guards the child', () => {
    expect(hasOtherGuardians(['me', 'u2'], 'me')).toBe(true)
  })
})

describe('nextActiveChildId', () => {
  it('keeps an active child that is still mine', () => {
    expect(nextActiveChildId('c2', 'c1', ['c2', 'c3'])).toBe('c2')
  })

  it('moves to the first remaining child when the active one is removed', () => {
    expect(nextActiveChildId('c1', 'c1', ['c2', 'c3'])).toBe('c2')
  })

  it('ignores the removed child even if still listed', () => {
    expect(nextActiveChildId('c1', 'c1', ['c1', 'c2'])).toBe('c2')
  })

  it('falls back to the first child when active is null or dangling', () => {
    expect(nextActiveChildId(null, 'c1', ['c2', 'c3'])).toBe('c2')
    expect(nextActiveChildId('gone', 'c1', ['c2'])).toBe('c2')
  })

  it('is null when no child is left', () => {
    expect(nextActiveChildId('c1', 'c1', [])).toBeNull()
    expect(nextActiveChildId(null, 'c1', [])).toBeNull()
  })
})

describe('groupsEmptiedBy', () => {
  it('returns only groups where the child is the sole member', () => {
    const rows = [
      { child_id: 'c1', group_id: 'g1' },
      { child_id: 'c1', group_id: 'g2' },
      { child_id: 'c2', group_id: 'g2' },
      { child_id: 'c3', group_id: 'g3' },
    ]
    expect(groupsEmptiedBy('c1', rows)).toEqual(['g1'])
  })

  it('is empty when the child is in no group', () => {
    expect(groupsEmptiedBy('c1', [{ child_id: 'c2', group_id: 'g1' }])).toEqual([])
  })
})

describe('deleteChildMessage', () => {
  it('warns that everything goes when I am the only guardian', () => {
    expect(deleteChildMessage('지훈', false)).toBe(
      '지훈을 지울까요? 상태와 그룹 기록이 모두 사라져요'
    )
    expect(deleteChildMessage('하나', false)).toBe(
      '하나를 지울까요? 상태와 그룹 기록이 모두 사라져요'
    )
  })

  it('says the child stays for the other guardian', () => {
    expect(deleteChildMessage('하나', true)).toBe(
      '하나를 내 목록에서 지울까요? 다른 보호자에게는 그대로 남아요'
    )
  })
})
