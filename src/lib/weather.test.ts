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

const ncst = (pty: string, t1h = '9.7', rn1 = '0') => [
  { category: 'PTY', obsrValue: pty },
  { category: 'T1H', obsrValue: t1h },
  { category: 'REH', obsrValue: '85' },
  { category: 'RN1', obsrValue: rn1 },
]
const fcst = (sky: string) => [
  { category: 'SKY', fcstTime: '2300', fcstValue: sky },
  { category: 'SKY', fcstTime: '0000', fcstValue: '1' },
]

describe('summarizeKma', () => {
  it('reads rain and snow from the nowcast precipitation type', () => {
    expect(summarizeKma(ncst('1', '9.7', '1.5'), fcst('1'))).toEqual({
      temp: 10,
      condition: 'rain',
      level: 'light',
    })
    expect(summarizeKma(ncst('5'), fcst('1')).condition).toBe('rain')
    expect(summarizeKma(ncst('3', '-1.6', '0.4'), fcst('4'))).toEqual({
      temp: -2,
      condition: 'snow',
      level: 'light',
    })
    expect(summarizeKma(ncst('7'), fcst('4')).condition).toBe('snow')
  })

  it('grades rain by the hourly amount (KMA: <3 약한, 3-15 보통, 15+ 강한)', () => {
    expect(summarizeKma(ncst('1', '9', '2.9'), []).level).toBe('light')
    expect(summarizeKma(ncst('1', '9', '3'), []).level).toBe('moderate')
    expect(summarizeKma(ncst('1', '9', '14.9'), []).level).toBe('moderate')
    expect(summarizeKma(ncst('1', '9', '15'), []).level).toBe('heavy')
    // 빗방울 is always light, whatever the amount.
    expect(summarizeKma(ncst('5', '9', '4'), []).level).toBe('light')
  })

  it('grades snow as light below 1mm and heavy (함박눈) from 1mm', () => {
    expect(summarizeKma(ncst('3', '-1', '0.9'), []).level).toBe('light')
    expect(summarizeKma(ncst('3', '-1', '1'), []).level).toBe('heavy')
    // 눈날림 is always light.
    expect(summarizeKma(ncst('7', '-1', '2'), []).level).toBe('light')
  })

  it('reads amounts KMA sends as text ("강수없음", "1mm 미만")', () => {
    expect(summarizeKma(ncst('1', '9', '강수없음'), []).level).toBe('light')
    expect(summarizeKma(ncst('1', '9', '50.0mm 이상'), []).level).toBe('heavy')
  })

  it('uses the nearest forecast sky when it is not raining or snowing', () => {
    expect(summarizeKma(ncst('0'), fcst('1'))).toEqual({
      temp: 10,
      condition: 'clear',
      level: null,
    })
    expect(summarizeKma(ncst('0'), fcst('3')).condition).toBe('partly')
    expect(summarizeKma(ncst('0'), fcst('4')).condition).toBe('cloudy')
  })

  it('degrades to clear with no temperature when data is missing', () => {
    expect(summarizeKma([], [])).toEqual({ temp: null, condition: 'clear', level: null })
  })
})
