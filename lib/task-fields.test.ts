import { describe, it, expect } from 'vitest'
import { pickTaskFields, validateTaskInput } from './task-fields'

describe('pickTaskFields', () => {
  it('keeps only writable fields', () => {
    const result = pickTaskFields({
      titolo: 'Chiama Mario', due_date: '2026-08-01', id: 'hack', created_at: 'hack',
    })
    expect(result).toEqual({ titolo: 'Chiama Mario', due_date: '2026-08-01' })
  })

  it('drops undefined values but keeps explicit nulls', () => {
    const result = pickTaskFields({ titolo: undefined, due_date: null })
    expect(result).toEqual({ due_date: null })
  })
})

describe('validateTaskInput', () => {
  it('accepts a minimal valid payload', () => {
    expect(validateTaskInput({ titolo: 'Chiama Mario' })).toBeNull()
  })

  it('rejects an empty or whitespace-only title', () => {
    expect(validateTaskInput({ titolo: '   ' })).toBe('titolo obbligatorio')
  })

  it('rejects an unknown priority', () => {
    expect(validateTaskInput({ titolo: 'X', priorita: 'urgentissima' })).toBe('priorita non valida')
  })

  it('accepts the three known priorities', () => {
    for (const p of ['alta', 'media', 'bassa']) {
      expect(validateTaskInput({ titolo: 'X', priorita: p })).toBeNull()
    }
  })

  it('rejects an explicit null priority (column is NOT NULL)', () => {
    expect(validateTaskInput({ titolo: 'X', priorita: null })).toBe('priorita non valida')
  })

  it('rejects a malformed due_date', () => {
    expect(validateTaskInput({ titolo: 'X', due_date: '01/08/2026' })).toBe('due_date non valida')
  })

  it('accepts an ISO due_date and an explicit null', () => {
    expect(validateTaskInput({ titolo: 'X', due_date: '2026-08-01' })).toBeNull()
    expect(validateTaskInput({ titolo: 'X', due_date: null })).toBeNull()
  })

  it('skips the title check when the field is absent (partial update)', () => {
    expect(validateTaskInput({ done: true })).toBeNull()
  })
})
