import { describe, expect, it } from 'vitest'
import { PUSH_OPEN_MAX_AGE_MS, parsePendingOpen, sameOriginPath } from './pushOpen'

const ORIGIN = 'https://narangnol.vercel.app'

describe('sameOriginPath', () => {
  it('keeps path and query of relative and absolute same-origin URLs', () => {
    expect(sameOriginPath('/chat/direct/f1?child=m1', ORIGIN)).toBe('/chat/direct/f1?child=m1')
    expect(sameOriginPath(`${ORIGIN}/chat/g1`, ORIGIN)).toBe('/chat/g1')
  })

  it('rejects other origins and non-strings', () => {
    expect(sameOriginPath('https://evil.example/chat', ORIGIN)).toBeNull()
    expect(sameOriginPath(undefined, ORIGIN)).toBeNull()
    expect(sameOriginPath('', ORIGIN)).toBeNull()
  })
})

describe('parsePendingOpen', () => {
  const now = 1_000_000

  it('returns id and path for a fresh entry', () => {
    expect(
      parsePendingOpen({ id: 'a', url: `${ORIGIN}/chat/g1`, at: now - 1000 }, ORIGIN, now)
    ).toEqual({ id: 'a', path: '/chat/g1' })
  })

  it('ignores stale, malformed and foreign entries', () => {
    expect(
      parsePendingOpen({ id: 'a', url: '/chat/g1', at: now - PUSH_OPEN_MAX_AGE_MS - 1 }, ORIGIN, now)
    ).toBeNull()
    expect(parsePendingOpen({ url: '/chat/g1', at: now }, ORIGIN, now)).toBeNull()
    expect(parsePendingOpen({ id: 'a', url: 'https://evil.example/', at: now }, ORIGIN, now)).toBeNull()
    expect(parsePendingOpen(null, ORIGIN, now)).toBeNull()
  })
})
