import { describe, it, expect } from 'vitest'
import { withDirectionParticle, withObjectParticle } from './korean'

describe('withDirectionParticle', () => {
  it('uses 로 after an open syllable', () => {
    expect(withDirectionParticle('가재울놀이터')).toBe('가재울놀이터로')
    expect(withDirectionParticle('마트')).toBe('마트로')
  })

  it('uses 으로 after a final consonant', () => {
    expect(withDirectionParticle('병원')).toBe('병원으로')
    expect(withDirectionParticle('집')).toBe('집으로')
    expect(withDirectionParticle('학원')).toBe('학원으로')
    expect(withDirectionParticle('공원')).toBe('공원으로')
  })

  it('uses 로 for 놀이터 and an empty string', () => {
    expect(withDirectionParticle('놀이터')).toBe('놀이터로')
    expect(withDirectionParticle('')).toBe('로')
  })

  it('uses 로 after a final ㄹ', () => {
    expect(withDirectionParticle('교실')).toBe('교실로')
  })

  it('uses 로 for non-Hangul endings', () => {
    expect(withDirectionParticle('Kids Cafe')).toBe('Kids Cafe로')
  })
})

describe('withObjectParticle', () => {
  it('uses 을 after a final consonant, including ㄹ', () => {
    expect(withObjectParticle('지훈')).toBe('지훈을')
    expect(withObjectParticle('하늘')).toBe('하늘을')
  })

  it('uses 를 after an open syllable', () => {
    expect(withObjectParticle('하나')).toBe('하나를')
    expect(withObjectParticle('서아')).toBe('서아를')
  })

  it('uses 을(를) for non-Hangul endings and an empty string', () => {
    expect(withObjectParticle('Amy')).toBe('Amy을(를)')
    expect(withObjectParticle('')).toBe('을(를)')
  })
})
