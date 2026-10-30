import { describe, it, expect } from 'vitest'
import { distanceMeters } from './location'

describe('distanceMeters', () => {
  it('is zero for the same point', () => {
    expect(distanceMeters({ lat: 37.578, lon: 126.889 }, { lat: 37.578, lon: 126.889 })).toBe(0)
  })

  it('measures short distances in meters', () => {
    // 0.001° of latitude ≈ 111m
    const d = distanceMeters({ lat: 37.578, lon: 126.889 }, { lat: 37.579, lon: 126.889 })
    expect(d).toBeGreaterThan(105)
    expect(d).toBeLessThan(117)
  })

  it('handles a few kilometers (상암동 → 남가좌동 ≈ 2.6km)', () => {
    const d = distanceMeters({ lat: 37.5786, lon: 126.889 }, { lat: 37.577, lon: 126.919 })
    expect(d).toBeGreaterThan(2400)
    expect(d).toBeLessThan(2800)
  })
})
