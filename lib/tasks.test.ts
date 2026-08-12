import { describe, it, expect } from 'vitest'
import { toDateString, addDays, isActiveLead, advancedStages, buildDaFareOra, buildInArrivo, buildProssimiChiusura, buildDormienti, buildTaskFeed, leadARischio } from './tasks'
import type { Task, Settings } from '@/types'
import { REF, makeLead } from './test-fixtures'

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
  it('treats a lead with no stato as active (not yet closed)', () => {
    expect(isActiveLead(makeLead({ stato: null }))).toBe(true)
  })

  it('accepts open stato values', () => {
    expect(isActiveLead(makeLead({ stato: 'In corso' }))).toBe(true)
    expect(isActiveLead(makeLead({ stato: 'In chiusura' }))).toBe(true)
    expect(isActiveLead(makeLead({ stato: 'Rimandato' }))).toBe(true)
  })

  it('rejects terminal stato values', () => {
    expect(isActiveLead(makeLead({ stato: 'Vinto' }))).toBe(false)
    expect(isActiveLead(makeLead({ stato: 'Perso' }))).toBe(false)
    expect(isActiveLead(makeLead({ stato: 'Cliente' }))).toBe(false)
    expect(isActiveLead(makeLead({ stato: 'Non qualificato' }))).toBe(false)
    expect(isActiveLead(makeLead({ stato: 'Studente' }))).toBe(false)
  })
})

describe('advancedStages', () => {
  it('returns the last third of the pipeline stages', () => {
    const stages = ['Lead In', 'Discovery', 'Proposal Sent', 'Proposal Signed']
    expect(advancedStages(stages)).toEqual(['Proposal Sent', 'Proposal Signed'])
  })

  it('scales with a longer pipeline', () => {
    const stages = ['A', 'B', 'C', 'D', 'E', 'F']
    expect(advancedStages(stages)).toEqual(['E', 'F'])
  })

  it('returns at least one stage', () => {
    expect(advancedStages(['Solo'])).toEqual(['Solo'])
  })

  it('returns empty for an empty pipeline', () => {
    expect(advancedStages([])).toEqual([])
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
    const leads = [makeLead({ id: 'l-1', stato: 'Cliente', ricontattare: '2026-07-20' })]
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

const STAGES = ['Lead In', 'Discovery', 'Proposal Sent']

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
    const leads = [makeLead({ id: 'l-1', stato: 'Vinto', data_chiusura_prevista: '2026-08-01' })]
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

  it('includes never-contacted leads, counting from data_apertura', () => {
    const leads = [makeLead({ id: 'l-1', data_ultimo_contatto: null, data_apertura: '2026-05-16' })] // 72 giorni
    const items = buildDormienti(leads, [], REF, 21, new Set(), new Set())
    expect(items.map(i => i.leadId)).toEqual(['l-1'])
    expect(items[0].giorniSilenzio).toBe(72)
    expect(items[0].maiContattato).toBe(true)
  })

  it('falls back to created_at when a never-contacted lead has no data_apertura', () => {
    const leads = [makeLead({ id: 'l-1', data_ultimo_contatto: null, data_apertura: null, created_at: '2026-06-27T09:00:00Z' })]
    const items = buildDormienti(leads, [], REF, 21, new Set(), new Set())
    expect(items[0].giorniSilenzio).toBe(30)
  })

  it('excludes a never-contacted lead that is still recent', () => {
    const leads = [makeLead({ id: 'l-1', data_ultimo_contatto: null, data_apertura: '2026-07-25' })] // 2 giorni
    expect(buildDormienti(leads, [], REF, 21, new Set(), new Set())).toEqual([])
  })

  it('marks contacted dormant leads as not maiContattato', () => {
    const leads = [makeLead({ id: 'l-1', data_ultimo_contatto: '2026-06-01' })]
    const items = buildDormienti(leads, [], REF, 21, new Set(), new Set())
    expect(items[0].maiContattato).toBe(false)
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
    const leads = [makeLead({ id: 'l-1', stato: 'Cliente', data_ultimo_contatto: '2026-01-01' })]
    expect(buildDormienti(leads, [], REF, 21, new Set(), new Set())).toEqual([])
  })
})

describe('leadARischio', () => {
  it('includes an active lead stalled past the threshold', () => {
    const leads = [makeLead({ id: 'l-1', data_ultimo_contatto: '2026-07-01' })] // 26 giorni da REF
    const result = leadARischio(leads, REF, 21)
    expect(result).toHaveLength(1)
    expect(result[0].lead.id).toBe('l-1')
    expect(result[0].giorni).toBe(26)
    expect(result[0].maiContattato).toBe(false)
  })

  it('includes a never-contacted lead stalled since data_apertura', () => {
    const leads = [makeLead({ id: 'l-1', data_ultimo_contatto: null, data_apertura: '2026-06-27' })] // 30 giorni
    const result = leadARischio(leads, REF, 21)
    expect(result).toEqual([{ lead: leads[0], giorni: 30, maiContattato: true }])
  })

  it('excludes a lead below the threshold', () => {
    const leads = [makeLead({ id: 'l-1', data_ultimo_contatto: '2026-07-20' })] // 7 giorni
    expect(leadARischio(leads, REF, 21)).toEqual([])
  })

  it('excludes a closed lead regardless of how stale', () => {
    const leads = [makeLead({ id: 'l-1', stato: 'Perso', data_ultimo_contatto: '2026-01-01' })]
    expect(leadARischio(leads, REF, 21)).toEqual([])
  })

  it('sorts by giorni descending', () => {
    const leads = [
      makeLead({ id: 'meno-fermo', data_ultimo_contatto: '2026-07-01' }), // 26
      makeLead({ id: 'piu-fermo', data_ultimo_contatto: '2026-06-01' }),  // 56
    ]
    const result = leadARischio(leads, REF, 21)
    expect(result.map(r => r.lead.id)).toEqual(['piu-fermo', 'meno-fermo'])
  })
})

const SETTINGS: Settings = { followup_threshold_days: 7, pipeline_stages: STAGES, pipeline_stage_probabilities: {} }
const FILTERS = { upcomingDays: 7, closingDays: 30, dormantDays: 21, owner: null }

describe('buildTaskFeed', () => {
  it('returns the four sections', () => {
    const feed = buildTaskFeed([], [], SETTINGS, FILTERS, REF)
    expect(feed).toEqual({ daFareOra: [], inArrivo: [], prossimiChiusura: [], dormienti: [] })
  })

  it('never repeats a lead across sections — earliest section wins', () => {
    const lead = makeLead({
      id: 'l-1',
      stadio_pipeline: 'Proposal Sent',
      ricontattare: '2026-07-27',
      data_ultimo_contatto: '2026-05-01',
      data_chiusura_prevista: '2026-08-05',
    })
    const feed = buildTaskFeed([lead], [], SETTINGS, FILTERS, REF)
    expect(feed.daFareOra.map(i => i.leadId)).toEqual(['l-1'])
    expect(feed.inArrivo).toEqual([])
    expect(feed.prossimiChiusura).toEqual([])
    expect(feed.dormienti).toEqual([])
  })

  it('keeps the closing badge on the surviving row', () => {
    const lead = makeLead({ id: 'l-1', ricontattare: '2026-07-27', data_chiusura_prevista: '2026-08-05', valore: 12000 })
    const feed = buildTaskFeed([lead], [], SETTINGS, FILTERS, REF)
    expect(feed.daFareOra[0].closingSoon).toBe(true)
  })

  it('keeps multiple manual tasks on the same lead as distinct rows', () => {
    const lead = makeLead({ id: 'l-1' })
    const tasks = [
      makeTask({ id: 't-1', lead_id: 'l-1', due_date: '2026-07-27', titolo: 'Chiamare' }),
      makeTask({ id: 't-2', lead_id: 'l-1', due_date: '2026-07-27', titolo: 'Mandare proposta' }),
    ]
    const feed = buildTaskFeed([lead], tasks, SETTINGS, FILTERS, REF)
    expect(feed.daFareOra).toHaveLength(2)
  })

  it('drops done tasks', () => {
    const tasks = [makeTask({ id: 't-1', due_date: '2026-07-27', done: true })]
    expect(buildTaskFeed([], tasks, SETTINGS, FILTERS, REF).daFareOra).toEqual([])
  })

  it('filters leads and tasks by owner', () => {
    const leads = [
      makeLead({ id: 'l-mine', owner: 'Pietro', ricontattare: '2026-07-27' }),
      makeLead({ id: 'l-other', owner: 'Anna', ricontattare: '2026-07-27' }),
    ]
    const tasks = [
      makeTask({ id: 't-mine', owner: 'Pietro', due_date: '2026-07-27' }),
      makeTask({ id: 't-other', owner: 'Anna', due_date: '2026-07-27' }),
    ]
    const feed = buildTaskFeed(leads, tasks, SETTINGS, { ...FILTERS, owner: 'Pietro' }, REF)
    expect(feed.daFareOra.map(i => i.key).sort()).toEqual(['ricontatto:l-mine', 'task:t-mine'])
  })

  it('defaults dormantDays to the follow-up threshold when not provided', () => {
    const lead = makeLead({ id: 'l-1', data_ultimo_contatto: '2026-07-10' }) // 17 giorni
    const feed = buildTaskFeed([lead], [], SETTINGS, { ...FILTERS, dormantDays: SETTINGS.followup_threshold_days }, REF)
    expect(feed.dormienti.map(i => i.leadId)).toEqual(['l-1'])
  })
})
