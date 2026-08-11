import { describe, it, expect } from 'vitest'
import {
  percent, winRateVintoPerso, weightedForecast, performanceByKey,
  distribuzioneEsiti, schedulingToCloseRate,
} from './dashboard-metrics'
import { makeLead } from './test-fixtures'

describe('percent', () => {
  it('rounds the ratio as a percentage', () => {
    expect(percent(1, 3)).toBe(33)
  })

  it('returns 0 when denominator is 0', () => {
    expect(percent(5, 0)).toBe(0)
  })
})

describe('winRateVintoPerso', () => {
  it('counts vinti and persi, rate over their sum', () => {
    const leads = [
      makeLead({ id: '1', stato: 'Vinto' }),
      makeLead({ id: '2', stato: 'Vinto' }),
      makeLead({ id: '3', stato: 'Perso' }),
    ]
    expect(winRateVintoPerso(leads)).toEqual({ vinti: 2, persi: 1, rate: 67 })
  })

  it('ignores non-decisive stato values', () => {
    const leads = [
      makeLead({ id: '1', stato: 'Vinto' }),
      makeLead({ id: '2', stato: 'Cliente' }),
      makeLead({ id: '3', stato: 'Non qualificato' }),
    ]
    expect(winRateVintoPerso(leads)).toEqual({ vinti: 1, persi: 0, rate: 100 })
  })

  it('returns rate 0 when there are no decisive leads', () => {
    expect(winRateVintoPerso([])).toEqual({ vinti: 0, persi: 0, rate: 0 })
  })
})

describe('weightedForecast', () => {
  it('sums valore weighted by stage probability', () => {
    const leads = [
      makeLead({ id: '1', stadio_pipeline: 'Discovery', valore: 1000 }),
      makeLead({ id: '2', stadio_pipeline: 'Proposal Sent', valore: 2000 }),
    ]
    const probs = { 'Discovery': 30, 'Proposal Sent': 60 }
    expect(weightedForecast(leads, probs)).toBe(1500) // 300 + 1200
  })

  it('treats a stage missing from probabilities as 0%', () => {
    const leads = [makeLead({ id: '1', stadio_pipeline: 'Lead In', valore: 1000 })]
    expect(weightedForecast(leads, {})).toBe(0)
  })

  it('treats null valore as 0', () => {
    const leads = [makeLead({ id: '1', stadio_pipeline: 'Discovery', valore: null })]
    expect(weightedForecast(leads, { 'Discovery': 50 })).toBe(0)
  })
})

describe('performanceByKey', () => {
  it('groups by key and computes win rate per group', () => {
    const leads = [
      makeLead({ id: '1', origine: 'Info', stato: 'Vinto' }),
      makeLead({ id: '2', origine: 'Info', stato: 'Perso' }),
      makeLead({ id: '3', origine: 'Eventi', stato: 'Vinto' }),
    ]
    const rows = performanceByKey(leads, l => l.origine).sort((a, b) => a.key.localeCompare(b.key))
    expect(rows).toEqual([
      { key: 'Eventi', totale: 1, vinti: 1, tasso: 100 },
      { key: 'Info', totale: 2, vinti: 1, tasso: 50 },
    ])
  })

  it('buckets a null key under N/D', () => {
    const leads = [makeLead({ id: '1', origine: null, stato: 'Vinto' })]
    expect(performanceByKey(leads, l => l.origine)).toEqual([
      { key: 'N/D', totale: 1, vinti: 1, tasso: 100 },
    ])
  })
})

describe('distribuzioneEsiti', () => {
  it('counts leads per terminal stato, in the given order', () => {
    const leads = [
      makeLead({ id: '1', stato: 'Vinto' }),
      makeLead({ id: '2', stato: 'Perso' }),
      makeLead({ id: '3', stato: 'Perso' }),
    ]
    expect(distribuzioneEsiti(leads, ['Vinto', 'Perso', 'Cliente'])).toEqual([
      { stato: 'Vinto', count: 1 },
      { stato: 'Perso', count: 2 },
      { stato: 'Cliente', count: 0 },
    ])
  })
})

describe('schedulingToCloseRate', () => {
  it('rate is vinti over Effettuato leads only', () => {
    const leads = [
      makeLead({ id: '1', stato_appuntamento: 'Effettuato', stato: 'Vinto' }),
      makeLead({ id: '2', stato_appuntamento: 'Effettuato', stato: 'Perso' }),
      makeLead({ id: '3', stato_appuntamento: 'Non presentato', stato: 'Perso' }),
    ]
    expect(schedulingToCloseRate(leads)).toEqual({ vinti: 1, totale: 2, rate: 50 })
  })

  it('returns rate 0 when no lead has Effettuato', () => {
    const leads = [makeLead({ id: '1', stato_appuntamento: 'Schedulato', stato: 'Vinto' })]
    expect(schedulingToCloseRate(leads)).toEqual({ vinti: 0, totale: 0, rate: 0 })
  })
})
