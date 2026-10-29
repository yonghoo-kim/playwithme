import { describe, it, expect } from 'vitest'
import { hasSameGroupName, normalizeGroupName } from './groups'

describe('normalizeGroupName', () => {
  it('trims and collapses inner whitespace', () => {
    expect(normalizeGroupName('  가재울   어린이집 ')).toBe('가재울 어린이집')
  })
})

describe('hasSameGroupName', () => {
  it('matches names that differ only by spacing or case', () => {
    expect(hasSameGroupName(['테스트그룹', '말띠모임'], ' 테스트그룹 ')).toBe(true)
    expect(hasSameGroupName(['Kids Club'], 'kids  club')).toBe(true)
  })

  it('is false for a new name', () => {
    expect(hasSameGroupName(['테스트그룹'], '테스트그룹2')).toBe(false)
    expect(hasSameGroupName([], '아무거나')).toBe(false)
  })
})
