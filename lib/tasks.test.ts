import { describe, it, expect } from 'vitest'
import { toDateString, addDays, isActiveLead, advancedStages, buildDaFareOra, buildInArrivo, buildProssimiChiusura, buildDormienti } from './tasks'
import type { Lead, LeadWithComputed, Task } from '@/types'
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

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1', created_at: '2026-07-01', titolo: 'Chiama Mario',
    note: null, due_date: null, lead_id: null, priorita: 'media',
    done: false, done_at: null, owner: null, ...overrides,
  }
}

describe('buildDaFareOra', () => {
  it('includes tasks due today and overdue, most overdue first', () => {
    const tasks = [
      makeTask({ id: 't-today', due_date: '2026-07-27', titolo: 'Oggi' }),
      makeTask({ id: 't-late', due_date: '2026-07-25', titolo: 'Scaduto' }),
    ]
    const items = buildDaFareOra([], tasks, REF, new Set(), new Set())
    expect(items.map(i => i.titolo)).toEqual(['Scaduto', 'Oggi'])
  })

  it('excludes tasks due in the future', () => {
    const tasks = [makeTask({ due_date: '2026-07-28' })]
    expect(buildDaFareOra([], tasks, REF, new Set(), new Set())).toEqual([])
  })

  it('excludes tasks without a due date', () => {
    const tasks = [makeTask({ due_date: null })]
    expect(buildDaFareOra([], tasks, REF, new Set(), new Set())).toEqual([])
  })

  it('includes leads to recontact today or earlier', () => {
    const leads = [makeLead({ id: 'l-1', ricontattare: '2026-07-26' })]
    const items = buildDaFareOra(leads, [], REF, new Set(), new Set())
    expect(items).toHaveLength(1)
    expect(items[0].kind).toBe('ricontatto')
    expect(items[0].leadLabel).toBe('Mario Rossi · ACME')
  })

  it('includes appointments dated today only', () => {
    const leads = [
      makeLead({ id: 'l-1', appuntamento: '2026-07-27T10:00:00Z' }),
      makeLead({ id: 'l-2', appuntamento: '2026-07-28T10:00:00Z' }),
    ]
    const items = buildDaFareOra(leads, [], REF, new Set(), new Set())
    expect(items.map(i => i.leadId)).toEqual(['l-1'])
    expect(items[0].kind).toBe('appuntamento')
  })

  it('skips derived items for leads in an excluded stage', () => {
    const leads = [makeLead({ id: 'l-1', stadio_pipeline: 'Cliente', ricontattare: '2026-07-20' })]
    expect(buildDaFareOra(leads, [], REF, new Set(), new Set())).toEqual([])
  })

  it('marks the closing-soon badge on rows whose lead is closing', () => {
    const leads = [makeLead({ id: 'l-1', ricontattare: '2026-07-27', valore: 12000 })]
    const items = buildDaFareOra(leads, [], REF, new Set(['l-1']), new Set())
    expect(items[0].closingSoon).toBe(true)
    expect(items[0].valore).toBe(12000)
  })

  it('records consumed lead ids in the used set', () => {
    const used = new Set<string>()
    const leads = [makeLead({ id: 'l-1', ricontattare: '2026-07-27' })]
    buildDaFareOra(leads, [makeTask({ due_date: '2026-07-27', lead_id: 'l-9' })], REF, new Set(), used)
    expect([...used].sort()).toEqual(['l-1', 'l-9'])
  })

  it('skips a derived item when the lead is already used', () => {
    const leads = [makeLead({ id: 'l-1', ricontattare: '2026-07-27' })]
    expect(buildDaFareOra(leads, [], REF, new Set(), new Set(['l-1']))).toEqual([])
  })
})

describe('buildInArrivo', () => {
  it('includes tasks due inside the window, earliest first', () => {
    const tasks = [
      makeTask({ id: 't-5', due_date: '2026-08-01', titolo: 'Fra 5 giorni' }),
      makeTask({ id: 't-1', due_date: '2026-07-28', titolo: 'Domani' }),
    ]
    const items = buildInArrivo([], tasks, REF, 7, new Set(), new Set())
    expect(items.map(i => i.titolo)).toEqual(['Domani', 'Fra 5 giorni'])
  })

  it('excludes tasks past the window and tasks due today', () => {
    const tasks = [
      makeTask({ id: 't-far', due_date: '2026-08-10' }),
      makeTask({ id: 't-today', due_date: '2026-07-27' }),
    ]
    expect(buildInArrivo([], tasks, REF, 7, new Set(), new Set())).toEqual([])
  })

  it('puts undated tasks last', () => {
    const tasks = [
      makeTask({ id: 't-none', due_date: null, titolo: 'Prima o poi' }),
      makeTask({ id: 't-soon', due_date: '2026-07-29', titolo: 'Mercoledì' }),
    ]
    const items = buildInArrivo([], tasks, REF, 7, new Set(), new Set())
    expect(items.map(i => i.titolo)).toEqual(['Mercoledì', 'Prima o poi'])
  })

  it('includes upcoming recontacts and appointments', () => {
    const leads = [
      makeLead({ id: 'l-1', ricontattare: '2026-07-30' }),
      makeLead({ id: 'l-2', appuntamento: '2026-07-31T09:00:00Z' }),
    ]
    const items = buildInArrivo(leads, [], REF, 7, new Set(), new Set())
    expect(items.map(i => i.kind)).toEqual(['ricontatto', 'appuntamento'])
  })

  it('respects the window boundary', () => {
    const leads = [
      makeLead({ id: 'l-in', ricontattare: '2026-08-03' }),  // oggi + 7
      makeLead({ id: 'l-out', ricontattare: '2026-08-04' }), // oggi + 8
    ]
    const items = buildInArrivo(leads, [], REF, 7, new Set(), new Set())
    expect(items.map(i => i.leadId)).toEqual(['l-in'])
  })

  it('skips leads already used by an earlier section', () => {
    const leads = [makeLead({ id: 'l-1', ricontattare: '2026-07-30' })]
    expect(buildInArrivo(leads, [], REF, 7, new Set(), new Set(['l-1']))).toEqual([])
  })
})

const STAGES = ['Lead In', 'Discovery', 'Proposal Sent', 'Chiuso (Vinto)', 'Chiuso (Perso)', 'Cliente', 'Studente']

describe('buildProssimiChiusura', () => {
  it('includes leads with a forecast date inside the window', () => {
    const leads = [
      makeLead({ id: 'l-in', data_chiusura_prevista: '2026-08-10' }),
      makeLead({ id: 'l-out', data_chiusura_prevista: '2026-10-01' }),
    ]
    const items = buildProssimiChiusura(leads, REF, 30, STAGES, 7, new Set())
    expect(items.map(i => i.leadId)).toEqual(['l-in'])
    expect(items[0].stimato).toBe(false)
  })

  it('falls back to advanced stage with recent activity, flagged as stimato', () => {
    const leads = [makeLead({ id: 'l-1', stadio_pipeline: 'Proposal Sent', data_ultimo_contatto: '2026-07-25' })]
    const items = buildProssimiChiusura(leads, REF, 30, STAGES, 7, new Set())
    expect(items).toHaveLength(1)
    expect(items[0].stimato).toBe(true)
  })

  it('excludes an advanced-stage lead gone silent past the follow-up threshold', () => {
    const leads = [makeLead({ id: 'l-1', stadio_pipeline: 'Proposal Sent', data_ultimo_contatto: '2026-07-01' })]
    expect(buildProssimiChiusura(leads, REF, 30, STAGES, 7, new Set())).toEqual([])
  })

  it('excludes early stages without a forecast date', () => {
    const leads = [makeLead({ id: 'l-1', stadio_pipeline: 'Discovery', data_ultimo_contatto: '2026-07-26' })]
    expect(buildProssimiChiusura(leads, REF, 30, STAGES, 7, new Set())).toEqual([])
  })

  it('sorts dated leads by date, then stimato ones by value desc', () => {
    const leads = [
      makeLead({ id: 'l-est-small', stadio_pipeline: 'Proposal Sent', data_ultimo_contatto: '2026-07-26', valore: 1000 }),
      makeLead({ id: 'l-est-big', stadio_pipeline: 'Proposal Sent', data_ultimo_contatto: '2026-07-26', valore: 9000 }),
      makeLead({ id: 'l-dated', data_chiusura_prevista: '2026-08-15' }),
    ]
    const items = buildProssimiChiusura(leads, REF, 30, STAGES, 7, new Set())
    expect(items.map(i => i.leadId)).toEqual(['l-dated', 'l-est-big', 'l-est-small'])
  })

  it('skips leads already used by earlier sections', () => {
    const leads = [makeLead({ id: 'l-1', data_chiusura_prevista: '2026-08-01' })]
    expect(buildProssimiChiusura(leads, REF, 30, STAGES, 7, new Set(['l-1']))).toEqual([])
  })

  it('excludes leads in excluded stages even with a forecast date', () => {
    const leads = [makeLead({ id: 'l-1', stadio_pipeline: 'Chiuso (Vinto)', data_chiusura_prevista: '2026-08-01' })]
    expect(buildProssimiChiusura(leads, REF, 30, STAGES, 7, new Set())).toEqual([])
  })
})

describe('buildDormienti', () => {
  it('includes leads silent for at least the threshold, longest silence first', () => {
    const leads = [
      makeLead({ id: 'l-30', data_ultimo_contatto: '2026-06-27' }), // 30 giorni
      makeLead({ id: 'l-21', data_ultimo_contatto: '2026-07-06' }), // 21 giorni
    ]
    const items = buildDormienti(leads, [], REF, 21, new Set(), new Set())
    expect(items.map(i => i.leadId)).toEqual(['l-30', 'l-21'])
    expect(items[0].giorniSilenzio).toBe(30)
  })

  it('excludes leads under the threshold', () => {
    const leads = [makeLead({ id: 'l-1', data_ultimo_contatto: '2026-07-20' })] // 7 giorni
    expect(buildDormienti(leads, [], REF, 21, new Set(), new Set())).toEqual([])
  })

  it('excludes leads never contacted', () => {
    const leads = [makeLead({ id: 'l-1', data_ultimo_contatto: null })]
    expect(buildDormienti(leads, [], REF, 21, new Set(), new Set())).toEqual([])
  })

  it('excludes leads with an open task', () => {
    const leads = [makeLead({ id: 'l-1', data_ultimo_contatto: '2026-06-01' })]
    const tasks = [makeTask({ lead_id: 'l-1', due_date: '2026-09-01' })]
    expect(buildDormienti(leads, tasks, REF, 21, new Set(), new Set())).toEqual([])
  })

  it('excludes leads with a future recontact date', () => {
    const leads = [makeLead({ id: 'l-1', data_ultimo_contatto: '2026-06-01', ricontattare: '2026-09-01' })]
    expect(buildDormienti(leads, [], REF, 21, new Set(), new Set())).toEqual([])
  })

  it('excludes leads already used by earlier sections', () => {
    const leads = [makeLead({ id: 'l-1', data_ultimo_contatto: '2026-06-01' })]
    expect(buildDormienti(leads, [], REF, 21, new Set(), new Set(['l-1']))).toEqual([])
  })

  it('excludes closed and client stages', () => {
    const leads = [makeLead({ id: 'l-1', stadio_pipeline: 'Cliente', data_ultimo_contatto: '2026-01-01' })]
    expect(buildDormienti(leads, [], REF, 21, new Set(), new Set())).toEqual([])
  })
})
