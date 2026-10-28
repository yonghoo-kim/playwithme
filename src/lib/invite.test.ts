import { describe, it, expect, vi } from 'vitest'
import { generateInviteCode, createUniqueInviteCode } from './invite'

describe('generateInviteCode', () => {
  it('returns an 8-character alphanumeric code', () => {
    const code = generateInviteCode()
    expect(code).toMatch(/^[A-Za-z0-9]{8}$/)
  })
})

describe('createUniqueInviteCode', () => {
  it('retries when the first code already exists', async () => {
    const exists = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false)
    const code = await createUniqueInviteCode(exists)
    expect(exists).toHaveBeenCalledTimes(2)
    expect(code).toMatch(/^[A-Za-z0-9]{8}$/)
  })
})
