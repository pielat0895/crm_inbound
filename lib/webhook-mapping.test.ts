import { describe, it, expect } from 'vitest'
import { mapInboundPayload } from './webhook-mapping'

describe('mapInboundPayload', () => {
  it('maps known fields', () => {
    const result = mapInboundPayload({ nome: 'Mario', email: 'mario@test.it', unknown_field: 'x' })
    expect(result).toEqual({ nome: 'Mario', email: 'mario@test.it' })
  })

  it('ignores unknown fields', () => {
    const result = mapInboundPayload({ foo: 'bar', baz: 123 })
    expect(result).toEqual({})
  })

  it('preserves email as required field', () => {
    const result = mapInboundPayload({ email: 'test@test.com', nome: 'Test' })
    expect(result.email).toBe('test@test.com')
  })
})
