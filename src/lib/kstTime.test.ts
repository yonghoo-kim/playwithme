import { describe, it, expect } from 'vitest'
import { isQuietHour, kstHour, startOfKstDay } from './kstTime'

// KST = UTC+9, so 13:00Z is 22:00 KST and 22:00Z is 07:00 KST.
const at = (iso: string) => new Date(iso)

describe('kstHour', () => {
  it('converts UTC to the KST hour across the date line', () => {
    expect(kstHour(at('2026-11-01T00:00:00Z'))).toBe(9)
    expect(kstHour(at('2026-11-01T15:00:00Z'))).toBe(0)
    expect(kstHour(at('2026-11-01T14:59:59Z'))).toBe(23)
  })

  it('accepts epoch milliseconds', () => {
    expect(kstHour(Date.parse('2026-11-01T03:30:00Z'))).toBe(12)
  })
})

describe('isQuietHour', () => {
  it('starts at exactly 22:00 KST', () => {
    expect(isQuietHour(at('2026-11-01T12:59:59Z'))).toBe(false) // 21:59:59
    expect(isQuietHour(at('2026-11-01T13:00:00Z'))).toBe(true) // 22:00
  })

  it('stays quiet through midnight', () => {
    expect(isQuietHour(at('2026-11-01T15:00:00Z'))).toBe(true) // 00:00
    expect(isQuietHour(at('2026-11-01T18:30:00Z'))).toBe(true) // 03:30
  })

  it('ends at exactly 07:00 KST', () => {
    expect(isQuietHour(at('2026-11-01T21:59:59Z'))).toBe(true) // 06:59:59
    expect(isQuietHour(at('2026-11-01T22:00:00Z'))).toBe(false) // 07:00
  })

  it('is not quiet during the day', () => {
    expect(isQuietHour(at('2026-11-01T03:00:00Z'))).toBe(false) // 12:00
    expect(isQuietHour(at('2026-11-01T09:00:00Z'))).toBe(false) // 18:00
  })

  it('does not depend on the local time zone of the Date', () => {
    // Same instant written with an offset: still 22:30 KST.
    expect(isQuietHour(new Date('2026-11-01T09:30:00-04:00'))).toBe(true)
  })
})

describe('startOfKstDay', () => {
  it('is 15:00Z of the previous UTC day for a KST morning', () => {
    expect(startOfKstDay(at('2026-11-01T01:00:00Z'))).toBe(
      Date.parse('2026-10-31T15:00:00Z')
    )
  })

  it('is 15:00Z of the same UTC day for a KST late night', () => {
    expect(startOfKstDay(at('2026-11-01T16:00:00Z'))).toBe(
      Date.parse('2026-11-01T15:00:00Z')
    )
  })

  it('is the instant itself at exactly midnight KST', () => {
    expect(startOfKstDay(at('2026-11-01T15:00:00Z'))).toBe(
      Date.parse('2026-11-01T15:00:00Z')
    )
  })
})
