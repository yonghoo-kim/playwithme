import { describe, it, expect } from 'vitest'
import {
  STALE_STATUS_MS,
  buildStatusUpsertRow,
  goingLabel,
  isHomeStatus,
  isRepeatStatus,
  isStatusStale,
} from './status'

describe('buildStatusUpsertRow', () => {
  it('builds a per-child row (no group) with the given place_id', () => {
    const row = buildStatusUpsertRow('child-1', 'place-1')
    expect(row).toMatchObject({ child_id: 'child-1', place_id: 'place-1' })
    expect(row).not.toHaveProperty('group_id')
  })

  it('builds a cleared row (place_id null) for going home', () => {
    const row = buildStatusUpsertRow('child-1', null)
    expect(row.place_id).toBeNull()
  })

  it('always writes going (false by default, so an arrival clears 가는 중)', () => {
    expect(buildStatusUpsertRow('child-1', 'place-1').going).toBe(false)
    expect(buildStatusUpsertRow('child-1', 'place-1', true).going).toBe(true)
    expect(buildStatusUpsertRow('child-1', null, true)).toMatchObject({
      place_id: null,
      going: true,
    })
  })
})

describe('isRepeatStatus', () => {
  it('is a repeat for the same place and the same going flag', () => {
    expect(isRepeatStatus({ place_id: 'p1', going: false }, 'p1', false)).toBe(true)
    expect(isRepeatStatus({ place_id: 'p1', going: true }, 'p1', true)).toBe(true)
  })

  it('is a real change when only going flips', () => {
    expect(isRepeatStatus({ place_id: 'p1', going: true }, 'p1', false)).toBe(false)
    expect(isRepeatStatus({ place_id: 'p1', going: false }, 'p1', true)).toBe(false)
    expect(isRepeatStatus({ place_id: null, going: true }, null, false)).toBe(false)
  })

  it('is a real change for a different place', () => {
    expect(isRepeatStatus({ place_id: 'p1', going: false }, 'p2', false)).toBe(false)
    expect(isRepeatStatus({ place_id: 'p1', going: false }, null, false)).toBe(false)
  })

  it('treats no row as home and arrived', () => {
    expect(isRepeatStatus(null, null, false)).toBe(true)
    expect(isRepeatStatus(null, null, true)).toBe(false)
    expect(isRepeatStatus(null, 'p1', false)).toBe(false)
  })

  it('treats a row without going (before migration 0012) as arrived', () => {
    expect(isRepeatStatus({ place_id: 'p1' }, 'p1', false)).toBe(true)
    expect(isRepeatStatus({ place_id: 'p1' }, 'p1', true)).toBe(false)
  })
})

describe('goingLabel', () => {
  it('picks 로/으로 by the place name', () => {
    expect(goingLabel('놀이터')).toBe('놀이터로 가는 중')
    expect(goingLabel('학원')).toBe('학원으로 가는 중')
    expect(goingLabel('공원')).toBe('공원으로 가는 중')
  })

  it('says 집으로 for home (no place)', () => {
    expect(goingLabel(null)).toBe('집으로 가는 중')
  })
})

describe('isHomeStatus', () => {
  it('treats no place (집으로) as home', () => {
    expect(isHomeStatus(null)).toBe(true)
    expect(isHomeStatus(null, null)).toBe(true)
  })

  it('treats a family place named 집 as home', () => {
    expect(isHomeStatus('p1', '집')).toBe(true)
    expect(isHomeStatus('p1', ' 집 ')).toBe(true)
  })

  it('treats any other place as not home', () => {
    expect(isHomeStatus('p1', '놀이터')).toBe(false)
    expect(isHomeStatus('p1', '할머니 집')).toBe(false)
    expect(isHomeStatus('p1')).toBe(false)
  })
})

describe('isStatusStale', () => {
  const now = Date.parse('2026-10-31T18:00:00.000Z')
  const ago = (ms: number) => new Date(now - ms).toISOString()

  it('is stale at exactly 5 hours at a non-home place', () => {
    expect(isStatusStale('p1', '놀이터', ago(STALE_STATUS_MS), now)).toBe(true)
  })

  it('is stale well past 5 hours', () => {
    expect(isStatusStale('p1', '놀이터', ago(26 * 60 * 60 * 1000), now)).toBe(true)
  })

  it('is not stale just under 5 hours', () => {
    expect(isStatusStale('p1', '놀이터', ago(STALE_STATUS_MS - 60_000), now)).toBe(false)
  })

  it('is never stale at home, however old', () => {
    expect(isStatusStale(null, null, ago(48 * 60 * 60 * 1000), now)).toBe(false)
    expect(isStatusStale('p1', '집', ago(48 * 60 * 60 * 1000), now)).toBe(false)
  })

  it('is not stale without a usable timestamp', () => {
    expect(isStatusStale('p1', '놀이터', null, now)).toBe(false)
    expect(isStatusStale('p1', '놀이터', 'not-a-date', now)).toBe(false)
  })

  it('is not stale for a timestamp in the future (clock skew)', () => {
    expect(isStatusStale('p1', '놀이터', ago(-60_000), now)).toBe(false)
  })

  it('is never stale while 가는 중, however old', () => {
    expect(isStatusStale('p1', '놀이터', ago(STALE_STATUS_MS), now, true)).toBe(false)
    expect(isStatusStale('p1', '놀이터', ago(26 * 60 * 60 * 1000), now, true)).toBe(false)
  })

  it('applies the 5h rule once arrived (going false)', () => {
    expect(isStatusStale('p1', '놀이터', ago(STALE_STATUS_MS), now, false)).toBe(true)
  })
})
