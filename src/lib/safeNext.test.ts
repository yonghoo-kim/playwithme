import { describe, it, expect } from 'vitest'
import { safeNextPath } from './safeNext'

describe('safeNextPath', () => {
  it('keeps same-origin relative paths', () => {
    expect(safeNextPath('/guardian-invite/abc')).toBe('/guardian-invite/abc')
    expect(safeNextPath('/dashboard?x=1')).toBe('/dashboard?x=1')
  })

  it('drops empty and absolute or protocol-relative values', () => {
    expect(safeNextPath(null)).toBeNull()
    expect(safeNextPath(undefined)).toBeNull()
    expect(safeNextPath('')).toBeNull()
    expect(safeNextPath('https://evil.com')).toBeNull()
    expect(safeNextPath('//evil.com')).toBeNull()
    expect(safeNextPath('dashboard')).toBeNull()
  })

  it('drops backslash and control/whitespace tricks', () => {
    expect(safeNextPath('/\\evil.com')).toBeNull()
    expect(safeNextPath('/\t/evil.com')).toBeNull()
    expect(safeNextPath('/ /evil.com')).toBeNull()
    expect(safeNextPath('/\u0000x')).toBeNull()
  })
})
