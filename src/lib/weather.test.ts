import { describe, it, expect } from 'vitest'
import { kmaBaseTimes, latLonToKmaGrid, summarizeKma } from './weather'

describe('latLonToKmaGrid', () => {
  it('maps Seoul neighborhoods to their KMA grid cells', () => {
    expect(latLonToKmaGrid(37.5786, 126.889)).toEqual({ nx: 58, ny: 127 })
    expect(latLonToKmaGrid(37.577, 126.919)).toEqual({ nx: 59, ny: 127 })
    expect(latLonToKmaGrid(37.5665, 126.978)).toEqual({ nx: 60, ny: 127 })
  })
})

describe('kmaBaseTimes', () => {
  // 2026-10-29 23:50 KST = 14:50 UTC
  it('uses this hour once the nowcast (:40) and forecast (:45) are out', () => {
    expect(kmaBaseTimes(new Date('2026-10-29T14:50:00Z'))).toEqual({
      ncst: { date: '20261029', time: '2300' },
      fcst: { date: '20261029', time: '2330' },
    })
  })

  it('falls back to the previous hour before they are out, across midnight', () => {
    // 2026-10-30 00:10 KST
    expect(kmaBaseTimes(new Date('2026-10-29T15:10:00Z'))).toEqual({
      ncst: { date: '20261029', time: '2300' },
      fcst: { date: '20261029', time: '2330' },
    })
  })

  it('splits the two when only the nowcast is out (:42)', () => {
    expect(kmaBaseTimes(new Date('2026-10-29T05:42:00Z'))).toEqual({
      ncst: { date: '20261029', time: '1400' },
      fcst: { date: '20261029', time: '1330' },
    })
  })
})

const ncst = (pty: string, t1h = '9.7') => [
  { category: 'PTY', obsrValue: pty },
  { category: 'T1H', obsrValue: t1h },
  { category: 'REH', obsrValue: '85' },
]
const fcst = (sky: string) => [
  { category: 'SKY', fcstTime: '2300', fcstValue: sky },
  { category: 'SKY', fcstTime: '0000', fcstValue: '1' },
]

describe('summarizeKma', () => {
  it('reads rain and snow from the nowcast precipitation type', () => {
    expect(summarizeKma(ncst('1'), fcst('1'))).toEqual({ temp: 10, condition: 'rain' })
    expect(summarizeKma(ncst('5'), fcst('1')).condition).toBe('rain')
    expect(summarizeKma(ncst('3', '-1.6'), fcst('4'))).toEqual({ temp: -2, condition: 'snow' })
    expect(summarizeKma(ncst('7'), fcst('4')).condition).toBe('snow')
  })

  it('uses the nearest forecast sky when it is not raining or snowing', () => {
    expect(summarizeKma(ncst('0'), fcst('1')).condition).toBe('clear')
    expect(summarizeKma(ncst('0'), fcst('3')).condition).toBe('partly')
    expect(summarizeKma(ncst('0'), fcst('4')).condition).toBe('cloudy')
  })

  it('degrades to clear with no temperature when data is missing', () => {
    expect(summarizeKma([], [])).toEqual({ temp: null, condition: 'clear' })
  })
})
