import { describe, it, expect } from 'vitest'
import { dayPhase } from './dayPhase'

describe('dayPhase', () => {
  it('is morning from 5 to before 9', () => {
    expect(dayPhase(5)).toBe('morning')
    expect(dayPhase(8)).toBe('morning')
  })

  it('is day from 9 to before 17', () => {
    expect(dayPhase(9)).toBe('day')
    expect(dayPhase(16)).toBe('day')
  })

  it('is evening from 17 to before 20', () => {
    expect(dayPhase(17)).toBe('evening')
    expect(dayPhase(19)).toBe('evening')
  })

  it('is night from 20 through 4', () => {
    expect(dayPhase(20)).toBe('night')
    expect(dayPhase(23)).toBe('night')
    expect(dayPhase(0)).toBe('night')
    expect(dayPhase(4)).toBe('night')
  })
})
