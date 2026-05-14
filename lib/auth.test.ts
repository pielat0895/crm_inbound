// lib/auth.test.ts
import { describe, it, expect } from 'vitest'
import { verifyAuthToken } from './auth'

describe('verifyAuthToken', () => {
  it('returns false for undefined token', () => {
    expect(verifyAuthToken(undefined)).toBe(false)
  })

  it('returns false for wrong token', () => {
    process.env.AUTH_SECRET = 'correctsecret'
    expect(verifyAuthToken('wrongtoken')).toBe(false)
  })

  it('returns true for correct token', () => {
    process.env.AUTH_SECRET = 'correctsecret'
    expect(verifyAuthToken('correctsecret')).toBe(true)
  })
})
