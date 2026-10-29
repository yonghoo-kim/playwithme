import { describe, it, expect } from 'vitest'
import { statusRecipientUserIds } from './childAccess'

describe('statusRecipientUserIds', () => {
  it("includes the child's own guardians even when the child is in no group", () => {
    expect(
      statusRecipientUserIds('kid', [], [
        { child_id: 'kid', user_id: 'mom' },
        { child_id: 'kid', user_id: 'dad' },
      ])
    ).toEqual(['mom', 'dad'])
  })

  it('includes guardians of every child sharing any group with the child', () => {
    const childGroups = [
      { child_id: 'kid', group_id: 'g1' },
      { child_id: 'kid', group_id: 'g2' },
      { child_id: 'friendA', group_id: 'g1' },
      { child_id: 'friendB', group_id: 'g2' },
    ]
    const guardians = [
      { child_id: 'kid', user_id: 'mom' },
      { child_id: 'friendA', user_id: 'a-parent' },
      { child_id: 'friendB', user_id: 'b-parent' },
    ]
    expect(statusRecipientUserIds('kid', childGroups, guardians).sort()).toEqual(
      ['a-parent', 'b-parent', 'mom'].sort()
    )
  })

  it('dedupes a user connected through several groups and several children', () => {
    const childGroups = [
      { child_id: 'kid', group_id: 'g1' },
      { child_id: 'kid', group_id: 'g2' },
      { child_id: 'kid', group_id: 'g3' },
      { child_id: 'sib1', group_id: 'g1' },
      { child_id: 'sib1', group_id: 'g2' },
      { child_id: 'sib2', group_id: 'g3' },
    ]
    const guardians = [
      { child_id: 'kid', user_id: 'mom' },
      { child_id: 'sib1', user_id: 'other' },
      { child_id: 'sib2', user_id: 'other' },
      { child_id: 'sib1', user_id: 'mom' },
    ]
    const result = statusRecipientUserIds('kid', childGroups, guardians)
    expect(result.sort()).toEqual(['mom', 'other'])
  })

  it('ignores guardians of children in groups the child is not in', () => {
    const childGroups = [
      { child_id: 'kid', group_id: 'g1' },
      { child_id: 'friend', group_id: 'g1' },
      { child_id: 'friend', group_id: 'g9' },
      { child_id: 'stranger', group_id: 'g9' },
    ]
    const guardians = [
      { child_id: 'kid', user_id: 'mom' },
      { child_id: 'friend', user_id: 'f-parent' },
      { child_id: 'stranger', user_id: 's-parent' },
    ]
    expect(statusRecipientUserIds('kid', childGroups, guardians).sort()).toEqual(
      ['f-parent', 'mom']
    )
  })
})
