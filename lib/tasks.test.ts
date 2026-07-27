import { describe, it, expect } from 'vitest'
import { toDateString, addDays, isActiveLead, advancedStages } from './tasks'
import type { Lead, LeadWithComputed } from '@/types'
import { computeLeadFields } from '@/types'

export const REF = new Date(2026, 6, 27) // lunedì 27 luglio 2026, mezzanotte locale

export const baseLead: Lead = {
  id: 'lead-1', created_at: '2026-01-01', email: 'a@b.it',
  nome: 'Mario', cognome: 'Rossi', azienda: 'ACME', tel: null, ruolo: null,
  tipo: null, richiesta: null, origine: null, industry: null,
  dipendenti: null, hanno_sito: null, company_web: null, esperienza_us: null,
  stadio_pipeline: 'Discovery', stato_lead: null, stato: null, motivo_lost: null,
  valore: null, owner: null, data_apertura: null, appuntamento: null,
  ricontattare: null, data_ultimo_contatto: null, data_chiusura: null,
  data_chiusura_prevista: null, contattato: false, numero_messaggi: 0,
  risposto_ultima_mail: false, touchpoints: 0, note: null,
}

export function makeLead(overrides: Partial<Lead> = {}): LeadWithComputed {
  return computeLeadFields({ ...baseLead, ...overrides }, REF)
}

describe('toDateString', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    expect(toDateString(new Date(2026, 6, 27))).toBe('2026-07-27')
  })

  it('pads single-digit months and days', () => {
    expect(toDateString(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('addDays', () => {
  it('adds days across a month boundary', () => {
    expect(addDays('2026-07-30', 3)).toBe('2026-08-02')
  })

  it('subtracts with a negative delta', () => {
    expect(addDays('2026-07-01', -1)).toBe('2026-06-30')
  })
})

describe('isActiveLead', () => {
  it('accepts an open stage', () => {
    expect(isActiveLead(makeLead({ stadio_pipeline: 'Discovery' }))).toBe(true)
  })

  it('rejects closed stages', () => {
    expect(isActiveLead(makeLead({ stadio_pipeline: 'Chiuso (Vinto)' }))).toBe(false)
    expect(isActiveLead(makeLead({ stadio_pipeline: 'Chiuso (Perso)' }))).toBe(false)
  })

  it('rejects Cliente and Studente', () => {
    expect(isActiveLead(makeLead({ stadio_pipeline: 'Cliente' }))).toBe(false)
    expect(isActiveLead(makeLead({ stadio_pipeline: 'Studente' }))).toBe(false)
  })
})

describe('advancedStages', () => {
  it('returns the last third of the active stages', () => {
    const stages = ['Lead In', 'Discovery', 'Proposal Sent', 'Chiuso (Vinto)', 'Chiuso (Perso)', 'Cliente', 'Studente']
    expect(advancedStages(stages)).toEqual(['Proposal Sent'])
  })

  it('scales with a longer pipeline', () => {
    const stages = ['A', 'B', 'C', 'D', 'E', 'F', 'Chiuso (Vinto)']
    expect(advancedStages(stages)).toEqual(['E', 'F'])
  })

  it('returns at least one stage', () => {
    expect(advancedStages(['Solo', 'Chiuso (Perso)'])).toEqual(['Solo'])
  })
})
