import { describe, it, expect } from 'vitest'
import { computeLeadFields } from './index'
import type { Lead } from './index'

const baseLead: Lead = {
  id: '1', created_at: '2026-01-01', email: 'test@test.com',
  nome: null, cognome: null, azienda: null, tel: null, ruolo: null,
  tipo: null, richiesta: null, origine: null, industry: null,
  dipendenti: null, hanno_sito: null, company_web: null, esperienza_us: null,
  stadio_pipeline: 'Nuovo', stato_lead: null, stato: null, motivo_lost: null,
  valore: null, owner: null, data_apertura: null, appuntamento: null,
  ricontattare: null, data_ultimo_contatto: null,
  numero_messaggi: 0, risposto_ultima_mail: false, touchpoints: 0, note: null,
}

describe('computeLeadFields', () => {
  it('returns null when data_ultimo_contatto is null', () => {
    const result = computeLeadFields(baseLead)
    expect(result.giorni_ultimo_contatto).toBeNull()
  })

  it('computes giorni_ultimo_contatto correctly', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const lead = { ...baseLead, data_ultimo_contatto: yesterday.toISOString().split('T')[0] }
    const result = computeLeadFields(lead)
    expect(result.giorni_ultimo_contatto).toBe(1)
  })

  it('returns 0 when data_ultimo_contatto is today', () => {
    const today = new Date().toISOString().split('T')[0]
    const lead = { ...baseLead, data_ultimo_contatto: today }
    const result = computeLeadFields(lead)
    expect(result.giorni_ultimo_contatto).toBe(0)
  })
})
