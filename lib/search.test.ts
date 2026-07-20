import { describe, it, expect } from 'vitest'
import { sanitizeSearchTerm } from './search'

describe('sanitizeSearchTerm', () => {
  it('strips PostgREST filter-breakout characters', () => {
    expect(sanitizeSearchTerm('acme,email.ilike.%@%')).toBe('acme email.ilike. @')
    expect(sanitizeSearchTerm('foo)or(id.gt.0')).toBe('foo or id.gt.0')
  })

  it('removes wildcards, backslash and quotes', () => {
    expect(sanitizeSearchTerm('a%b*c\\d"e\'f')).toBe('a b c d e f')
  })

  it('collapses whitespace and trims', () => {
    expect(sanitizeSearchTerm('  hello   world  ')).toBe('hello world')
  })

  it('handles null/undefined/empty', () => {
    expect(sanitizeSearchTerm(null)).toBe('')
    expect(sanitizeSearchTerm(undefined)).toBe('')
    expect(sanitizeSearchTerm('')).toBe('')
  })

  it('caps length at 100 chars', () => {
    expect(sanitizeSearchTerm('x'.repeat(200))).toHaveLength(100)
  })
})
