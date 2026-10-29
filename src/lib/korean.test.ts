import { describe, it, expect } from 'vitest'
import { withDirectionParticle } from './korean'

describe('withDirectionParticle', () => {
  it('uses 로 after an open syllable', () => {
    expect(withDirectionParticle('가재울놀이터')).toBe('가재울놀이터로')
    expect(withDirectionParticle('마트')).toBe('마트로')
  })

  it('uses 으로 after a final consonant', () => {
    expect(withDirectionParticle('병원')).toBe('병원으로')
    expect(withDirectionParticle('집')).toBe('집으로')
  })

  it('uses 로 after a final ㄹ', () => {
    expect(withDirectionParticle('교실')).toBe('교실로')
  })

  it('uses 로 for non-Hangul endings', () => {
    expect(withDirectionParticle('Kids Cafe')).toBe('Kids Cafe로')
  })
})
