import { describe, expect, it } from 'vitest'
import {
  MAX_NOTIFY_GROUP_IDS,
  notifyGroupIdsToSend,
  notifyRecipientGroupIds,
  parseNotifyGroupIds,
  selectNotifyGroupIds,
} from './notifyGroups'

describe('parseNotifyGroupIds', () => {
  it('treats a missing value as "every group"', () => {
    expect(parseNotifyGroupIds(undefined)).toBeNull()
  })

  it('accepts an array of strings, deduped', () => {
    expect(parseNotifyGroupIds(['a', 'b', 'a'])).toEqual(['a', 'b'])
    expect(parseNotifyGroupIds([])).toEqual([])
  })

  it('rejects non-arrays, non-string items and oversized lists', () => {
    expect(parseNotifyGroupIds(null)).toBe('invalid')
    expect(parseNotifyGroupIds('a')).toBe('invalid')
    expect(parseNotifyGroupIds(['a', 1])).toBe('invalid')
    expect(
      parseNotifyGroupIds(Array.from({ length: MAX_NOTIFY_GROUP_IDS + 1 }, (_, i) => `g${i}`))
    ).toBe('invalid')
    expect(
      parseNotifyGroupIds(Array.from({ length: MAX_NOTIFY_GROUP_IDS }, (_, i) => `g${i}`))
    ).toHaveLength(MAX_NOTIFY_GROUP_IDS)
  })
})

describe('selectNotifyGroupIds', () => {
  const own = ['daycare', 'apt', 'church']

  it('selects every group of the child when nothing was requested', () => {
    expect(selectNotifyGroupIds(own, null)).toEqual(own)
  })

  it("keeps only requested groups the child is in, in the child's order", () => {
    expect(selectNotifyGroupIds(own, ['church', 'someone-else', 'daycare'])).toEqual([
      'daycare',
      'church',
    ])
  })

  it('selects nothing for an empty request', () => {
    expect(selectNotifyGroupIds(own, [])).toEqual([])
  })
})

describe('notifyRecipientGroupIds', () => {
  const childGroups = [
    { child_id: 'kid', group_id: 'daycare' },
    { child_id: 'kid', group_id: 'apt' },
    { child_id: 'friendA', group_id: 'daycare' },
    { child_id: 'friendB', group_id: 'apt' },
    { child_id: 'friendB', group_id: 'daycare' },
    { child_id: 'friendC', group_id: 'apt' },
  ]
  const guardians = [
    { child_id: 'kid', user_id: 'mom' },
    { child_id: 'kid', user_id: 'dad' },
    { child_id: 'friendA', user_id: 'a-parent' },
    { child_id: 'friendB', user_id: 'b-parent' },
    { child_id: 'friendC', user_id: 'c-parent' },
  ]

  it('notifies everyone connected when all groups are selected', () => {
    const result = notifyRecipientGroupIds('kid', childGroups, guardians, ['daycare', 'apt'])
    expect(Object.fromEntries(result)).toEqual({
      mom: ['daycare', 'apt'],
      dad: ['daycare', 'apt'],
      'a-parent': ['daycare'],
      'b-parent': ['daycare', 'apt'],
      'c-parent': ['apt'],
    })
  })

  it('leaves out guardians only connected through unselected groups', () => {
    const result = notifyRecipientGroupIds('kid', childGroups, guardians, ['daycare'])
    expect(Object.fromEntries(result)).toEqual({
      mom: ['daycare'],
      dad: ['daycare'],
      'a-parent': ['daycare'],
      // Shares both groups, but only hears about (and sees named) the selected one.
      'b-parent': ['daycare'],
    })
  })

  it('lists a recipient once even when connected through several children', () => {
    const result = notifyRecipientGroupIds(
      'kid',
      childGroups,
      [
        { child_id: 'friendA', user_id: 'p' },
        { child_id: 'friendC', user_id: 'p' },
      ],
      ['daycare', 'apt']
    )
    expect(Array.from(result.keys())).toEqual(['p'])
    expect(result.get('p')).toEqual(['daycare', 'apt'])
  })

  it('notifies nobody when no group is selected', () => {
    expect(notifyRecipientGroupIds('kid', childGroups, guardians, []).size).toBe(0)
  })

  it("keeps the old behaviour for a child in no group (own guardians only)", () => {
    const result = notifyRecipientGroupIds('kid', [], [{ child_id: 'kid', user_id: 'mom' }], [])
    expect(Object.fromEntries(result)).toEqual({ mom: [] })
  })
})

describe('notifyGroupIdsToSend', () => {
  it('sends nothing (all groups) for a child with no groups', () => {
    expect(notifyGroupIdsToSend([], [])).toBeUndefined()
  })

  it('lets a single group be switched off', () => {
    expect(notifyGroupIdsToSend(['g'], [])).toEqual([])
    expect(notifyGroupIdsToSend(['g'], ['g'])).toBeUndefined()
  })

  it('sends nothing (all groups) when every group is selected', () => {
    expect(notifyGroupIdsToSend(['a', 'b'], ['b', 'a'])).toBeUndefined()
  })

  it('sends the selected subset, in group order', () => {
    expect(notifyGroupIdsToSend(['a', 'b', 'c'], ['c', 'a'])).toEqual(['a', 'c'])
  })

  it('sends an empty list when everything is deselected', () => {
    expect(notifyGroupIdsToSend(['a', 'b'], [])).toEqual([])
  })
})
