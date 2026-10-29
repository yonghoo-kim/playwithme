import { describe, it, expect } from 'vitest'
import { toKoreanAuthError, GENERIC_ERROR } from './errorMessages'

describe('toKoreanAuthError', () => {
  it('maps wrong credentials and unconfirmed email', () => {
    expect(toKoreanAuthError('Invalid login credentials')).toBe(
      '이메일 또는 비밀번호가 맞지 않아요.'
    )
    expect(toKoreanAuthError('Email not confirmed')).toContain('메일 인증')
  })

  it('matches case-insensitively on substrings', () => {
    expect(toKoreanAuthError('AuthApiError: INVALID LOGIN CREDENTIALS')).toBe(
      '이메일 또는 비밀번호가 맞지 않아요.'
    )
  })

  it('maps signup errors', () => {
    expect(toKoreanAuthError('User already registered')).toContain(
      '이미 가입된 이메일'
    )
    expect(toKoreanAuthError('Signups not allowed for this instance')).toContain(
      '가입'
    )
    expect(toKoreanAuthError('Email signups are disabled')).toContain('가입')
  })

  it('keeps the minimum length in password length errors', () => {
    expect(
      toKoreanAuthError('Password should be at least 6 characters.')
    ).toBe('비밀번호는 6자 이상이어야 해요.')
    expect(
      toKoreanAuthError('Password should be at least 8 characters')
    ).toBe('비밀번호는 8자 이상이어야 해요.')
  })

  it('maps weak and unchanged passwords', () => {
    expect(
      toKoreanAuthError(
        'Password is known to be weak and easy to guess, please choose a different one.'
      )
    ).toContain('비밀번호')
    expect(
      toKoreanAuthError(
        'Password should contain at least one character of each: abcdefghijklmnopqrstuvwxyz, 0123456789'
      )
    ).toContain('비밀번호')
    expect(
      toKoreanAuthError('New password should be different from the old password.')
    ).toContain('이전 비밀번호')
  })

  it('maps invalid email formats', () => {
    expect(
      toKoreanAuthError('Unable to validate email address: invalid format')
    ).toBe('이메일 형식이 올바르지 않아요.')
    expect(toKoreanAuthError('Email address "a@b" is invalid')).toBe(
      '이메일 형식이 올바르지 않아요.'
    )
  })

  it('maps rate limits, keeping the wait time when given', () => {
    expect(
      toKoreanAuthError(
        'For security purposes, you can only request this after 45 seconds.'
      )
    ).toBe('보안을 위해 45초 후에 다시 시도해주세요.')
    expect(toKoreanAuthError('Email rate limit exceeded')).toContain('메일')
    expect(toKoreanAuthError('Request rate limit reached')).toContain(
      '잠시 후'
    )
    expect(toKoreanAuthError('Too many requests')).toContain('잠시 후')
  })

  it('maps network failures', () => {
    expect(toKoreanAuthError('Failed to fetch')).toContain('인터넷')
    expect(toKoreanAuthError('fetch failed')).toContain('인터넷')
    expect(toKoreanAuthError('NetworkError when attempting to fetch resource.')).toContain('인터넷')
    expect(toKoreanAuthError('Load failed')).toContain('인터넷')
  })

  it('maps expired or invalid links and codes', () => {
    expect(toKoreanAuthError('Token has expired or is invalid')).toContain(
      '만료'
    )
    expect(toKoreanAuthError('Email link is invalid or has expired')).toContain(
      '만료'
    )
    expect(toKoreanAuthError('otp_expired')).toContain('만료')
  })

  it('never passes unknown English through', () => {
    expect(toKoreanAuthError('Database error saving new user')).toBe(
      GENERIC_ERROR
    )
    expect(toKoreanAuthError('')).toBe(GENERIC_ERROR)
    expect(toKoreanAuthError(null)).toBe(GENERIC_ERROR)
    expect(toKoreanAuthError(undefined)).toBe(GENERIC_ERROR)
  })
})
